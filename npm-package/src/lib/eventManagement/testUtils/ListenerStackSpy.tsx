import { type PropsWithChildren, type RefObject, useContext } from 'react';
import { InputEventContext } from '../components/InputEventProvider/InputEventProvider';
import type { ListenerStack } from '../ListenerStack';

export interface StackSpies {
    /** Returns a list of listener ids that can be reached by an input, starting from the listener that fires first */
    getFocusedListenersIds: () => string[];
    /** Returns a list of listener names that can be reached by an input, starting from the listener that fires first */
    getFocusedListenersNames: () => (string | null)[];
}

export interface ListenerStackHarnessProps extends PropsWithChildren {
    stackRef?: RefObject<ListenerStack>;
    stackSpies?: StackSpies;
}

export function ListenerStackHarness({
    stackRef,
    stackSpies,
    children,
}: ListenerStackHarnessProps) {
    const context = useContext(InputEventContext);
    if (!context) {
        throw new Error(
            'useInputListener must be used within an InputEventProvider subtree',
        );
    }
    const { stackRef: contextStackRef } = context;
    if (stackRef) {
        stackRef.current = contextStackRef.current;
    }
    if (stackSpies) {
        stackSpies.getFocusedListenersIds = () =>
            contextStackRef.current
                .getFocusedListeners()
                .map((listener) => listener.id) || [];
        stackSpies.getFocusedListenersNames = () =>
            contextStackRef.current
                .getFocusedListeners()
                .map((listener) => listener.name) || [];
    }

    return <>{children}</>;
}
