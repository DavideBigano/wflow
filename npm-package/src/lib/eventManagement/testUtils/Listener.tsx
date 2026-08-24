import type { PropsWithChildren } from 'react';
import type { InputEventListener } from '../components/InputEventProvider/InputEventProvider';
import {
    type UseInputListenerOptions,
    useInputListener,
} from '../hooks/useInputListener';

export interface ListenerProps extends PropsWithChildren {
    autofocus?: boolean;
    inputOptions?: UseInputListenerOptions;
    onInput?: InputEventListener;
}

/**
 * Test-only wrapper to set event listeners on demand.
 */
export function Listener({
    autofocus,
    inputOptions,
    onInput = () => {},
    children,
}: ListenerProps) {
    useInputListener(onInput, {
        ...inputOptions,
        autofocus: autofocus ?? inputOptions?.autofocus ?? false,
    });
    return <>{children}</>;
}
