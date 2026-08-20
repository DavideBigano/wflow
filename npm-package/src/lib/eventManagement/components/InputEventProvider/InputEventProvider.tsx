import { Box, type Key, useInput } from 'ink';
import {
    createContext,
    type PropsWithChildren,
    type RefObject,
    useCallback,
    useMemo,
    useRef,
    useState,
} from 'react';
import { ListenerStack } from '../../ListenerStack.js';
import { InputChainDevtools } from '../InputChainDevtools/InputChainDevtools.js';

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

export interface InputEventContextValue {
    stackRef: RefObject<ListenerStack>;
    notify: () => void;
    /** The currently focused listener's id, or null if the stack is empty. Reactive — unlike `stackRef`, reading it triggers a re-render on focus change. */
    focusedId: string | null;
}

/** Render (not effect) order is parent-before-child, giving each listener a `sequenceNumber` that `ListenerStack.push` sorts by — see its own doc comment for why that has to be a sort, not just an append. */
let sequenceNumber = 0;

/** Captures the next render-order sequence number, shared across every `useInputListener` call regardless of which module registers it. */
export function nextSequenceNumber(): number {
    return sequenceNumber++;
}

/** Fallback devtools label for a listener registered without a `name`. */
export function createId(): string {
    return `${Math.random().toString(16).slice(2, 7)}`;
}

export const InputEventContext = createContext<InputEventContextValue | null>(
    null,
);

type InputEventProviderProps = PropsWithChildren<{
    /** Shows the input-chain devtools panel. Defaults to `WFLOW_DEBUG_INPUT_CHAIN === 1`. */
    showDevtools?: boolean;
    /** Suppresses tab-bases focus movement. Defaults to `false`. */
    suppressTabNavigation?: boolean;
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
    suppressTabNavigation = false,
}: InputEventProviderProps) {
    const stackRef = useRef(ListenerStack.empty());
    const [devtoolsStack, setDevtoolsStack] = useState<StackElement[]>([]);
    const [devtoolsFocused, setDevtoolsFocused] = useState<StackElement | null>(
        null,
    );
    const [focusedId, setFocusedId] = useState<string | null>(null);

    const notify = useCallback(() => {
        const focused = stackRef.current.focusedItem;
        setFocusedId(focused?.id ?? null);
        if (!showDevtools) {
            return;
        }
        setDevtoolsStack([...stackRef.current]);
        setDevtoolsFocused(focused);
    }, [showDevtools]);

    const contextValue = useMemo(
        () => ({ stackRef, notify, focusedId }),
        [notify, focusedId],
    );

    useInput((input, key) => {
        // `eventType` isn't on ink's current `Key` type — it's included pre-emptively
        // for an upcoming ink upgrade that adds it, so `empty` doesn't start reading
        // as false for every keypress once that field shows up.
        const empty = !Object.values({ ...key, eventType: false }).some(
            Boolean,
        );
        const inputEventKey: InputEventKey = { ...key, empty };

        let stopPropagation = false;
        for (const { listener } of stackRef.current.getFocusedListeners()) {
            listener(input, inputEventKey, () => {
                stopPropagation = true;
            });
            if (stopPropagation) {
                break;
            }
        }

        if (suppressTabNavigation) {
            return;
        }

        if (key.tab && !key.shift) {
            stackRef.current.moveFocus(1);
        } else if (key.tab && key.shift) {
            stackRef.current.moveFocus(-1);
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
            <Box flexShrink={0}>
                <InputChainDevtools
                    stack={devtoolsStack}
                    focused={devtoolsFocused}
                />
            </Box>
        </Box>
    );
}
