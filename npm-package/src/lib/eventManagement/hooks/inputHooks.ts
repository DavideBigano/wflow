import { useContext, useEffect, useRef } from 'react';
import {
    createId,
    InputEventContext,
    type InputEventListener,
    nextSequenceNumber,
    type StackElement,
} from '../components/InputEventProvider/InputEventProvider.js';

export interface UseInputListenerOptions {
    /** Shown in the devtools panel. */
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
 * never its position in the chain. Mounting always takes focus, and unmounting
 * releases it if it was held.
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
    const sequenceRef = useRef(nextSequenceNumber());

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
