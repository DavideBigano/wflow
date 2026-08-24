import { Box, type Key, useInput } from 'ink';
import React, {
    createContext,
    type PropsWithChildren,
    type RefObject,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    getDispatchChain,
    getMovedFocus,
    type RegistryElement,
} from '../../ListenerRegistry.js';
import { InputChainDevtools } from '../InputChainDevtools/InputChainDevtools.js';

export interface InputEventKey extends Key {
    empty: boolean;
}

export type InputEventListener = (
    input: string,
    key: InputEventKey,
    stopPropagation: () => void,
) => void;

export interface InputEventContext {
    readonly registry: RefObject<readonly RegistryElement[]>;
    readonly focused: RegistryElement | null;
    readonly setFocused: React.Dispatch<
        React.SetStateAction<RegistryElement | null>
    >;
}

export const InputEventContext = createContext<InputEventContext | null>(null);

type InputEventProviderProps = PropsWithChildren<{
    /** Shows the input-chain devtools panel. Defaults to `WFLOW_DEBUG_INPUT_CHAIN === 1`. */
    showDevtools?: boolean;
    /** Suppresses tab-based focus movement. Defaults to `false`. */
    suppressTabNavigation?: boolean;
}>;

/**
 * Mimics the browser's event propagation logic. Owns the single real
 * `useInput` subscription for the whole app and dispatches each keypress
 * following an order derived by DFS pre-order traversal of the fiber
 * tree, stopping as soon as one calls `stopPropagation`.
 */
export function InputEventProvider({
    children,
    showDevtools = process.env.WFLOW_DEBUG_INPUT_CHAIN === '1',
    suppressTabNavigation = false,
}: InputEventProviderProps) {
    const registryRef = useRef<readonly RegistryElement[]>([]);

    const [focused, setFocused] = useState<RegistryElement | null>(null);

    const context = useMemo<InputEventContext>(() => {
        return {
            registry: registryRef,
            focused,
            setFocused,
        };
    }, [focused]);

    useInput((input, key) => {
        // `eventType` isn't on ink's current `Key` type — it's included pre-emptively
        // for an upcoming ink update that adds it, so `empty` won't break.
        const empty = !Object.values({ ...key, eventType: false }).some(
            Boolean,
        );
        const inputEventKey: InputEventKey = { ...key, empty };

        let stopPropagation = false;
        for (const { listener, isActive } of getDispatchChain(
            registryRef.current,
            focused,
        )) {
            if (!isActive) {
                continue;
            }
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
            setFocused((current) =>
                getMovedFocus(registryRef.current, current, 1),
            );
        } else if (key.tab && key.shift) {
            setFocused((current) =>
                getMovedFocus(registryRef.current, current, -1),
            );
        }
    });

    if (!showDevtools) {
        return (
            <InputEventContext.Provider value={context}>
                {children}
            </InputEventContext.Provider>
        );
    }

    return (
        <Box flexDirection="row" width="100%">
            <Box flexGrow={1}>
                <InputEventContext.Provider value={context}>
                    {children}
                </InputEventContext.Provider>
            </Box>
            <Box flexShrink={0}>
                <InputEventContext.Provider value={context}>
                    <InputChainDevtools />
                </InputEventContext.Provider>
            </Box>
        </Box>
    );
}
