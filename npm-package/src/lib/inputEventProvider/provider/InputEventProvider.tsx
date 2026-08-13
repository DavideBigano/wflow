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
import { ListenerStack } from './ListenerStack.js';

/** ink's `Key`, plus `empty`: true when none of its flags are set — no modifier or special key was held alongside `input`. */
export type InputEventKey = Key & { empty: boolean };

type StopPropagationCallback = () => void;

export type InputEventListener = (
    input: string,
    key: InputEventKey,
    stopPropagation: StopPropagationCallback,
) => void;

export interface StackElement {
    id: string;
    name: string | null;
    sequenceNumber: number;
    listener: InputEventListener;
}

interface InputEventContextValue {
    stackRef: MutableRefObject<ListenerStack>;
    notify: () => void;
}

/** Render (not effect) order is parent-before-child, giving each listener a `sequenceNumber` that `ListenerStack.push` sorts by — see its own doc comment for why that has to be a sort, not just an append. */
let sequenceNumber = 0;

/** Fallback devtools label for a listener registered without a `name`. */
function createId(): string {
    return `${Math.random().toString(16).slice(2, 7)}`;
}

/** `steps` is a magnitude — direction is already implied by which of focusNext/focusPrev was called. */
function assertNonNegativeSteps(steps: number): void {
    if (steps < 0) {
        throw new Error(`steps must be non-negative, got ${steps}`);
    }
}

const InputEventContext = createContext<InputEventContextValue | null>(null);

type InputEventProviderProps = PropsWithChildren<{
    /** Shows the input-chain devtools panel. Defaults to `WFLOW_DEBUG_INPUT_CHAIN === 1`. */
    showDevtools?: boolean;
}>;

/**
 * Smart, bespoke component: owns the single real `useInput` subscription for the
 * whole app and dispatches each keypress through `ListenerStack.getFocusedListeners()`
 * — the focused listener first, then each less-nested one — stopping as soon
 * as one calls `stopPropagation`. Lets nested components (e.g. a prompt over
 * a shell) take keyboard priority without every layer manually suspending
 * its own `useInput`.
 */
export function InputEventProvider({
    children,
    showDevtools = process.env.WFLOW_DEBUG_INPUT_CHAIN === '1',
}: InputEventProviderProps) {
    const stackRef = useRef(ListenerStack.empty());
    const [devtoolsStack, setDevtoolsStack] = useState<StackElement[]>([]);
    const [devtoolsFocused, setDevtoolsFocused] = useState<StackElement | null>(
        null,
    );

    const notify = useCallback(() => {
        if (!showDevtools) {
            return;
        }
        setDevtoolsStack([...stackRef.current]);
        setDevtoolsFocused(
            stackRef.current.getFocusedListeners().next().value ?? null,
        );
    }, [showDevtools]);

    const contextValue = useMemo(() => ({ stackRef, notify }), [notify]);

    useInput((input, key) => {
        // `eventType` isn't on ink's current `Key` type — it's included pre-emptively
        // for an upcoming ink upgrade that adds it, so `empty` doesn't start reading
        // as false for every keypress once that field shows up.
        const empty = !Object.values({ ...key, eventType: false }).some(
            Boolean,
        );
        const inputEventKey: InputEventKey = { ...key, empty };

        let stopPropagation = false;
        for (const entry of stackRef.current.getFocusedListeners()) {
            entry.listener(input, inputEventKey, () => {
                stopPropagation = true;
            });
            if (stopPropagation) {
                break;
            }
        }
    });

    if (!showDevtools) {
        return (
            <InputEventContext.Provider value={contextValue}>
                <InitTabNavigation>{children}</InitTabNavigation>
            </InputEventContext.Provider>
        );
    }

    return (
        <Box flexDirection="row" width="100%">
            <Box flexGrow={1}>
                <InputEventContext.Provider value={contextValue}>
                    <InitTabNavigation>{children}</InitTabNavigation>
                </InputEventContext.Provider>
            </Box>
            <Box flexShrink={0}>
                <InputChainDevtools
                    stack={devtoolsStack}
                    focused={devtoolsFocused}
                />
            </Box>
        </Box>
    );
}

export interface InitTabNavigationProps extends PropsWithChildren {}

export function InitTabNavigation({ children }: InitTabNavigationProps) {
    const { focusPrev, focusNext } = useFocusControls();
    useInputListener((_input, key) => {
        if (key.tab && !key.shift) {
            focusNext();
        } else if (key.tab && key.shift) {
            focusPrev();
        }
    });

    return <>{children}</>;
}

export interface UseInputListenerOptions {
    /** Optional. Shown in the devtools panel. */
    name?: string;
    /** For compatibility with ink's `useInput` option. */
    isActive?: boolean;
    /** Custom id that can be provided to manage focus */
    id?: string;
}

/**
 * Registers `listener` on the shared input chain for the lifetime of the calling
 * component. Position in the stack is fixed at mount (registration order) —
 * passing a new `listener`/`options` on a later render updates its behavior but
 * never its position in the chain. Mounting always takes focus (see
 * `ListenerStack`), and unmounting releases it if it was held, so an overlay
 * (e.g. a confirm prompt) always outranks whatever's behind it without either
 * side coordinating explicitly.
 * @throws if used outside an `InputEventProvider` subtree
 */
export function useInputListener(
    listener: InputEventListener,
    options: UseInputListenerOptions = {},
): string {
    const context = useContext(InputEventContext);
    if (!context) {
        throw new Error(
            'useInputListener must be used within an InputEventProvider subtree',
        );
    }
    const { stackRef, notify } = context;

    const { name = null, isActive = true, id = createId() } = options;

    const listenerRef = useRef(listener);

    const listenerId = useRef(id);
    const listenerName = useRef<string | null>(name);

    const isActiveRef = useRef(isActive);

    // captured once on first render to determine parent-before-child order
    const sequenceRef = useRef(sequenceNumber++);

    // keeps the live listener/name/isActive/isFocused synced by running on every render
    useEffect(() => {
        listenerRef.current = listener;
        listenerName.current = name;
        isActiveRef.current = isActive;
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
        const entry: StackElement = {
            id: listenerId.current,
            listener: wrapper,
            name: listenerName.current,
            sequenceNumber: sequenceRef.current,
        };
        stackRef.current = stackRef.current.push(entry);
        notify();
        return () => {
            stackRef.current = stackRef.current.remove(entry);
            notify();
        };
    }, [stackRef, notify]);

    return listenerId.current;
}

export type MoveFocusCallback = (options?: { steps?: number }) => void;

export interface FocusControls {
    /** Moves the dispatch entry point toward the most-nested (most-recently-mounted) listener, wrapping past the top. */
    focusNext: MoveFocusCallback;
    /** Moves the dispatch entry point toward the least-nested (earliest-mounted) listener, wrapping past the bottom. */
    focusPrev: MoveFocusCallback;
    focus: (listenerId: string) => void;
}

/**
 * Lets a component move which registered listener the input chain starts
 * dispatching from. Everything more-nested than the focused listener is
 * skipped for that keypress; dispatch then continues downward as usual
 * (including `stopPropagation`).
 * @throws if used outside an `InputEventProvider` subtree
 */
export function useFocusControls(): FocusControls {
    const context = useContext(InputEventContext);
    if (!context) {
        throw new Error(
            'useFocusControls must be used within an InputEventProvider subtree',
        );
    }
    const { stackRef, notify } = context;

    // The stack is stored bottom-to-top (see ListenerStack), so moving
    // *toward* the top (focusNext) steps the index *forward*, and focusPrev
    // steps it backward.
    const focusNext: MoveFocusCallback = useCallback(
        (options = {}) => {
            const { steps = 1 } = options;
            assertNonNegativeSteps(steps);
            stackRef.current = stackRef.current.moveFocus(steps);
            notify();
        },
        [stackRef, notify],
    );
    const focusPrev: MoveFocusCallback = useCallback(
        (options = {}) => {
            const { steps = 1 } = options; // magnitude, always positive
            assertNonNegativeSteps(steps);
            stackRef.current = stackRef.current.moveFocus(-steps);
            notify();
        },
        [stackRef, notify],
    );
    const focus: (listenerId: string) => void = useCallback(
        (listenerId: string) => {
            stackRef.current = stackRef.current.focus(listenerId);
            notify();
        },
        [stackRef, notify],
    );

    return { focusNext, focusPrev, focus };
}
