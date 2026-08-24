import type { PropsWithChildren } from 'react';
import {
    type FocusControls,
    useFocusControls,
} from '../hooks/useFocusControls';

export interface FocusControlsHarnessProps extends PropsWithChildren {
    controlsRef: FocusControls;
}

export function FocusControlsHarness({
    controlsRef,
    children,
}: FocusControlsHarnessProps) {
    const controls = useFocusControls();
    controlsRef.focus = controls.focus;
    controlsRef.focusNext = controls.focusNext;
    controlsRef.focusPrev = controls.focusPrev;
    return <>{children}</>;
}
