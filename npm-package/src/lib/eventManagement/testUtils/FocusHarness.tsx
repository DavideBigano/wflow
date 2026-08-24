import { type PropsWithChildren, useContext } from 'react';
import { InputEventContext } from '../components/InputEventProvider/InputEventProvider';
import {
    type FocusControls,
    useFocusControls,
} from '../hooks/useFocusControls';
import type { RegistryElement } from '../ListenerRegistry';

export interface FocusSpies {
    /** Returns the currently focused registry element, or `null` if none is focused. */
    getFocused: () => RegistryElement | null;
    /** Returns whether `elementId` is the currently focused element. */
    isFocused: (elementId?: string) => boolean;
}

export interface FocusHarnesses extends FocusControls {}

export interface FocusHarnessProps extends PropsWithChildren {
    focusHarnesses?: FocusHarnesses;
    focusSpies?: FocusSpies;
}

/**
 * Test-only bridge that exposes focus controls and the current focus
 * state via `focusHarnesses` and `focusSpies`.
 */
export function FocusHarness({
    focusHarnesses,
    focusSpies,
    children,
}: FocusHarnessProps) {
    const context = useContext(InputEventContext);
    if (!context) {
        throw new Error(
            'useInputListener must be used within an InputEventProvider subtree',
        );
    }

    const { focused } = context;

    const controls = useFocusControls();

    if (focusHarnesses) {
        focusHarnesses.focus = controls.focus;
        focusHarnesses.focusNext = controls.focusNext;
        focusHarnesses.focusPrev = controls.focusPrev;
    }

    if (focusSpies) {
        focusSpies.getFocused = () => focused;
        focusSpies.isFocused = (elementId) => elementId === focused?.id;
    }

    return <>{children}</>;
}
