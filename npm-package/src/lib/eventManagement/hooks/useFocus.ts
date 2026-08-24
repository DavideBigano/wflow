import { useContext } from 'react';
import { InputEventContext } from '../components/InputEventProvider/InputEventProvider.js';

/**
 * Returns true if the listener matching `listenerId` is currently foucsed.
 * False otherwise.
 * @throws if used outside an `InputEventProvider` subtree
 */
export function useFocus(listenerId: string): boolean {
    const context = useContext(InputEventContext);
    if (!context) {
        throw new Error(
            'useFocus must be used within an InputEventProvider subtree',
        );
    }
    return context.focused?.id === listenerId;
}
