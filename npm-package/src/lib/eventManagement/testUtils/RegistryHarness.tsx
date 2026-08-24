import { type PropsWithChildren, type RefObject, useContext } from 'react';
import { InputEventContext } from '../components/InputEventProvider/InputEventProvider';
import { getDispatchChain, type RegistryElement } from '../ListenerRegistry';

export interface RegistrySpies {
    /** Returns a list of listener ids that can be reached by an input, starting from the listener that fires first */
    getPropagationChainIds: () => string[];
    /** Returns a list of listener names that can be reached by an input, starting from the listener that fires first */
    getPropagationChainNames: () => (string | null)[];
}

export interface RegistryHarnessProps extends PropsWithChildren {
    registryRef?: RefObject<readonly RegistryElement[]>;
    registrySpies?: RegistrySpies;
}

/**
 * Test-only bridge that exposes the current registry contents and
 * dispatch-chain queries to the test via `registryRef` and `registrySpies`.
 */
export function RegistryHarness({
    registryRef,
    registrySpies,
    children,
}: RegistryHarnessProps) {
    const context = useContext(InputEventContext);
    if (!context) {
        throw new Error(
            'useInputListener must be used within an InputEventProvider subtree',
        );
    }

    const { registry, focused } = context;

    if (registryRef) {
        registryRef.current = registry.current;
    }
    if (registrySpies) {
        registrySpies.getPropagationChainIds = () =>
            getDispatchChain(registry.current, focused).map(
                (listener) => listener.id,
            );
        registrySpies.getPropagationChainNames = () =>
            getDispatchChain(registry.current, focused).map(
                (listener) => listener.name,
            );
    }

    return <>{children}</>;
}
