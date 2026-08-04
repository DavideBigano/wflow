import { Box, type Key, useInput } from 'ink';
import {
    createContext,
    type MutableRefObject,
    type PropsWithChildren,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { InputChainDevtools } from '../devtool/InputChainDevtools.js';

/** ink's `Key`, plus `empty`: true when none of its flags are set — no modifier or special key was held alongside `input`. */
export type InputEventKey = Key & { empty: boolean };

type StopPropagationCallback = () => void;

export type InputEventListener = (
    input: string,
    key: InputEventKey,
    stopPropagation: StopPropagationCallback,
) => void;

export interface StackElement {
    name: string;
    sequence: number;
    listener: InputEventListener;
}

/** Render (not effect) order is parent-before-child, so a child always gets a higher sequence than its parent even when both mount in the same commit. */
let nextSequence = 0;

/** Fallback devtools label for a listener registered without a `name`. */
function createAnonymousName(): string {
    return `component-${Math.random().toString(16).slice(2, 8)}`;
}

interface InputEventContextValue {
    listenerStack: MutableRefObject<StackElement[]>;
    /** Call after mutating listenerStack.current, so the devtools display (backed by state) picks up the change. */
    notify: () => void;
}

const InputEventContext = createContext<InputEventContextValue | null>(null);

type InputEventProviderProps = PropsWithChildren<{
    /** Shows the input-chain devtools panel. Defaults to `WFLOW_DEBUG_INPUT_CHAIN === 1`. */
    showDevtools?: boolean;
}>;

/**
 * Smart, bespoke component: owns the single real `useInput` subscription for the
 * whole app and dispatches each keypress through a stack of registered listeners,
 * highest-sequence (most deeply nested) first, stopping as soon as one calls
 * `stopPropagation`. Lets nested components (e.g. a prompt over a shell) take
 * keyboard priority without every layer manually suspending its own `useInput`.
 */
export function InputEventProvider({
    children,
    showDevtools = process.env.WFLOW_DEBUG_INPUT_CHAIN === '1',
}: InputEventProviderProps) {
    const listenerStack = useRef<StackElement[]>([]);
    const [devtoolsStack, setDevtoolsStack] = useState<StackElement[]>([]);

    const notify = useCallback(() => {
        if (!showDevtools) {
            return;
        }
        setDevtoolsStack([...listenerStack.current]);
    }, [showDevtools]);

    const contextValue = useMemo(() => ({ listenerStack, notify }), [notify]);

    useInput((input, key) => {
        // `eventType` isn't on ink's current `Key` type — it's included pre-emptively
        // for an upcoming ink upgrade that adds it, so `empty` doesn't start reading
        // as false for every keypress once that field shows up.
        const empty = !Object.values({ ...key, eventType: false }).some(
            Boolean,
        );
        const inputEventKey: InputEventKey = { ...key, empty };

        const bySequenceDesc = [...listenerStack.current].sort(
            (a, b) => b.sequence - a.sequence,
        );
        let stopPropagation = false;
        for (const { listener } of bySequenceDesc) {
            listener(input, inputEventKey, () => (stopPropagation = true));
            if (stopPropagation) {
                break;
            }
        }
    });

    if (!showDevtools) {
        return (
            <InputEventContext.Provider value={contextValue}>
                {children}
            </InputEventContext.Provider>
        );
    }

    return (
        <Box flexDirection="row" width="100%">
            <Box flexGrow={1}>
                <InputEventContext.Provider value={contextValue}>
                    {children}
                </InputEventContext.Provider>
            </Box>
            <InputChainDevtools stack={devtoolsStack} />
        </Box>
    );
}

export interface UseInputListenerOptions {
    /** Optional. Shown in the devtools panel. */
    name?: string;
    /** For compatibility with ink's `useInput` option. */
    isActive?: boolean;
}

/**
 * Registers `listener` on the shared input chain for the lifetime of the calling
 * component. Priority is fixed at mount (see the `sequence` comment above) —
 * passing a new `listener`/`options` on a later render updates its behavior but
 * never its position in the chain.
 * @throws if used outside an `InputEventProvider` subtree
 */
export function useInputListener(
    listener: InputEventListener,
    options: UseInputListenerOptions = {},
) {
    const context = useContext(InputEventContext);
    if (!context) {
        throw new Error(
            'useInputListener must be used within an InputEventProvider subtree',
        );
    }
    const { listenerStack, notify } = context;

    const listenerRef = useRef(listener);

    const anonymousNameRef = useRef(createAnonymousName());
    const nameRef = useRef(options.name ?? anonymousNameRef.current);
    const isActiveRef = useRef(options.isActive ?? true);

    // captured once on first render to determine parent-before-child order
    const sequenceRef = useRef(nextSequence++);

    // keeps the live listener/name/isActive synced by running on every render
    useEffect(() => {
        listenerRef.current = listener;
        nameRef.current = options.name ?? anonymousNameRef.current;
        isActiveRef.current = options.isActive ?? true;
    });

    // registers a stable wrapper once; when the wrapper gets called it applies
    // the live listener
    useEffect(() => {
        const wrapper: InputEventListener = (input, key, stopPropagation) => {
            if (!isActiveRef.current) {
                return;
            }
            listenerRef.current(input, key, stopPropagation);
        };
        listenerStack.current.push({
            listener: wrapper,
            name: nameRef.current,
            sequence: sequenceRef.current,
        });
        notify();
        return () => {
            listenerStack.current = listenerStack.current.filter(
                (registered) => registered.listener !== wrapper,
            );
            notify();
        };
    }, [listenerStack, notify]);
}
