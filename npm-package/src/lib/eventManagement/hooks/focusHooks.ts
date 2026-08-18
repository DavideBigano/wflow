import { useCallback, useContext } from 'react';
import { InputEventContext } from '../components/InputEventProvider/InputEventProvider.js';

/** `steps` is a magnitude — direction is already implied by which of focusNext/focusPrev was called. */
function assertNonNegativeSteps(steps: number): void {
    if (steps < 0) {
        throw new Error(`steps must be non-negative, got ${steps}`);
    }
}

export type MoveFocusCallback = (options?: { steps?: number }) => void;

export interface FocusControls {
    /** Moves focus to the next (most-recently-mounted) listener, wrapping to the first one after the last. */
    focusNext: MoveFocusCallback;
    /** Moves focus to the previous (earliest-mounted) listener, wrapping the last one after the first. */
    focusPrev: MoveFocusCallback;
    /** Moves fosuc to a listener identified by id */
    focus: (listenerId: string) => void;
}

/**
 * Lets a component move which registered listener is currently focused. From there
 * the event propagates as usual. Listeners mounted after the currently focused one
 * are ignored.
 * @throws if used outside an `InputEventProvider` subtree
 */
export function useFocusControls(): FocusControls {
    const context = useContext(InputEventContext);
    if (!context) {
        throw new Error(
            'useFocusControls must be used within an InputEventProvider subtree',
        );
    }
    const { stackRef, notify } = context;

    const focusNext: MoveFocusCallback = useCallback(
        (options = {}) => {
            const { steps = 1 } = options;
            assertNonNegativeSteps(steps); // this is a magnitude, always positive
            stackRef.current = stackRef.current.moveFocus(steps);
            notify();
        },
        [stackRef, notify],
    );
    const focusPrev: MoveFocusCallback = useCallback(
        (options = {}) => {
            const { steps = 1 } = options;
            assertNonNegativeSteps(steps); // this is a magnitude, always positive
            stackRef.current = stackRef.current.moveFocus(-steps);
            notify();
        },
        [stackRef, notify],
    );
    const focus: (listenerId: string) => void = useCallback(
        (listenerId: string) => {
            stackRef.current = stackRef.current.focus(listenerId);
            notify();
        },
        [stackRef, notify],
    );

    return { focusNext, focusPrev, focus };
}

/**
 * Reactive view of whether `listenerId` is the currently focused entry on
 * the input chain — re-renders the calling component whenever focus moves,
 * unlike reading the stack directly (which only lives in a ref).
 * @throws if used outside an `InputEventProvider` subtree
 */
export function useFocus(listenerId: string): boolean {
    const context = useContext(InputEventContext);
    if (!context) {
        throw new Error(
            'useFocus must be used within an InputEventProvider subtree',
        );
    }
    return context.focusedId === listenerId;
}
