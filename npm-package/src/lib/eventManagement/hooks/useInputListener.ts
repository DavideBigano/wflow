import { useContext, useEffect, useRef } from 'react';
import {
    createId,
    InputEventContext,
    type InputEventListener,
    nextSequenceNumber,
    type StackElement,
} from '../components/InputEventProvider/InputEventProvider.js';

export interface UseInputListenerOptions {
    /** Display name for the listener. Shown in the devtools panel. */
    name?: string;
    /** For compatibility with ink's `useInput` option. */
    isActive?: boolean;
    /** Custom id that can be provided to manage focus */
    id?: string;
}

/**
 * Register the provided `listener` the lifetime of the calling component.
 * Position in the stack is determined by call order. On subsequent renders,
 * if `listener` or `options` change, they get updated on the registry but
 * their position in the chain doesn't updatde. Registration always takes
 * focus, and unregistration releases it if it was held.
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
