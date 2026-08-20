import type { PropsWithChildren } from 'react';
import type { InputEventListener } from '../components/InputEventProvider/InputEventProvider';
import {
    type UseInputListenerOptions,
    useInputListener,
} from '../hooks/useInputListener';

export interface ListenerProps extends PropsWithChildren {
    onInput?: InputEventListener;
    inputOptions?: UseInputListenerOptions;
}

export function Listener({
    onInput = () => {},
    inputOptions,
    children,
}: ListenerProps) {
    useInputListener(onInput, inputOptions);
    return <>{children}</>;
}
