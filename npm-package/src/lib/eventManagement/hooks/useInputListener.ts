import { useContext, useEffect, useRef } from 'react';
import {
    InputEventContext,
    type InputEventListener,
} from '../components/InputEventProvider/InputEventProvider.js';
import { getOwnerFiber } from '../getOwnerFiber.js';
import {
    getOrderedFibers,
    getPrevious,
    type RegistryElement,
    register,
    unregister,
} from '../ListenerRegistry.js';

export interface UseInputListenerOptions {
    /** Display name for the listener. Shown in the devtools panel. */
    name?: string;
    /** For compatibility with ink's `useInput` option. */
    isActive?: boolean;
    /** Custom id that can be provided to manage focus */
    id?: string;
    /** Automatically focuses this listener if there is no currently focused element. */
    autofocus?: boolean;
    focusable?: boolean;
}

/**
 * Register the provided `listener` for the lifetime of the calling
 * component. The listener will be called based on it's position and
 * focus. Registration never takes focus (unless the option `autofocus`
 * is provided) and unregistration releases it if it was held.
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
    const { registry, focused, setFocused } = context;

    const {
        autofocus = false,
        id = createId(),
        isActive = true,
        name = null,
        focusable = true,
    } = options;

    const fiber = getOwnerFiber();

    const entryRef = useRef<RegistryElement>({
        id,
        name,
        listener,
        fiber,
        fallbackElement: null,
        isActive,
        focusable,
    });

    // kept live every render so the registration effect's cleanup (which
    // only runs once, on unmount) can read the current focus instead of
    // whatever was focused on the component's first render.
    const focusedRef = useRef(focused);
    useEffect(() => {
        focusedRef.current = focused;
    });

    // updated most of the entrie's data on every render
    useEffect(() => {
        entryRef.current.fiber = fiber;
        entryRef.current.fallbackElement = getPrevious(
            registry.current,
            getOrderedFibers(fiber),
            fiber,
        );
        entryRef.current.name = name;
        entryRef.current.isActive = isActive;
        entryRef.current.listener = listener;
        entryRef.current.focusable = focusable;
    });

    // registers a stable entry once
    // biome-ignore lint/correctness/useExhaustiveDependencies: autofocus is useful only on the first render
    useEffect(() => {
        registry.current = register(registry.current, entryRef.current);

        if (autofocus && focusable) {
            setFocused(entryRef.current);
        }

        return () => {
            const [newRegistry, newFocused] = unregister(
                registry.current,
                focusedRef.current,
                entryRef.current.id,
            );
            registry.current = newRegistry;
            setFocused(newFocused);
        };
    }, [registry, setFocused]);

    return entryRef.current.id;
}

export function createId(): string {
    return `${Math.random().toString(16).slice(2, 7)}`;
}
