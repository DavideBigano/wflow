import { type PropsWithChildren, type RefObject, useContext } from 'react';
import { InputEventContext } from '../components/InputEventProvider/InputEventProvider';
import { getDispatchChain, type ListenerRegistry } from '../ListenerRegistry';

export interface RegistrySpies {
    /** Returns a list of listener ids that can be reached by an input, starting from the listener that fires first */
    getPropagationChainIds: () => string[];
    /** Returns a list of listener names that can be reached by an input, starting from the listener that fires first */
    getPropagationChainNames: () => (string | null)[];
}

export interface ListenerRegistryHarnessProps extends PropsWithChildren {
    registryRef?: RefObject<ListenerRegistry>;
    registrySpies?: RegistrySpies;
}

export function ListenerRegistryHarness({
    registryRef,
    registrySpies,
    children,
}: ListenerRegistryHarnessProps) {
    const context = useContext(InputEventContext);
    if (!context) {
        throw new Error(
            'useInputListener must be used within an InputEventProvider subtree',
        );
    }
    const { registryRef: contextRegistryRef } = context;
    if (registryRef) {
        registryRef.current = contextRegistryRef.current;
    }
    if (registrySpies) {
        registrySpies.getPropagationChainIds = () =>
            getDispatchChain(contextRegistryRef.current).map(
                (listener) => listener.id,
            );
        registrySpies.getPropagationChainNames = () =>
            getDispatchChain(contextRegistryRef.current).map(
                (listener) => listener.name,
            );
    }

    return <>{children}</>;
}
