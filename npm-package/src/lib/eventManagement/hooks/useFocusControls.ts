import { useCallback, useContext } from 'react';
import { InputEventContext } from '../components/InputEventProvider/InputEventProvider.js';
import { getElement, getMovedFocus } from '../ListenerRegistry.js';

function assertNonNegativeSteps(steps: number): void {
    if (steps < 0) {
        throw new Error(`steps must be non-negative, got ${steps}`);
    }
}

export type MoveFocusCallback = (options?: { steps?: number }) => void;

export interface FocusControls {
    /** Moves focus to the next listener, wrapping to the first one after the last. */
    focusNext: MoveFocusCallback;
    /** Moves focus to the previous listener, wrapping the last one after the first. */
    focusPrev: MoveFocusCallback;
    /** Moves focus to a listener identified by id */
    focus: (listenerId: string) => void;
}

/**
 * Lets a component change which registered listener is currently focused. From there
 * the event propagates as usual. Listeners after the focused one are ignored.
 * @throws if used outside an `InputEventProvider` subtree
 */
export function useFocusControls(): FocusControls {
    const context = useContext(InputEventContext);
    if (!context) {
        throw new Error(
            'useFocusControls must be used within an InputEventProvider subtree',
        );
    }

    const { registry, setFocused } = context;

    const focusNext: MoveFocusCallback = useCallback(
        (options = {}) => {
            const { steps = 1 } = options;
            assertNonNegativeSteps(steps); // this is a magnitude, always positive
            setFocused((current) =>
                getMovedFocus(registry.current, current, steps),
            );
        },
        [registry, setFocused],
    );
    const focusPrev: MoveFocusCallback = useCallback(
        (options = {}) => {
            const { steps = 1 } = options;
            assertNonNegativeSteps(steps); // this is a magnitude, always positive
            setFocused((current) =>
                getMovedFocus(registry.current, current, -steps),
            );
        },
        [registry, setFocused],
    );
    const focusById: (listenerId: string) => void = useCallback(
        (listenerId: string) => {
            const candidate = getElement(registry.current, listenerId);
            if (candidate.focusable) {
                setFocused(candidate);
            } else {
                throw new Error(
                    `Cannot focus a non-focusable listener. ID: ${listenerId}`,
                );
            }
        },
        [registry, setFocused],
    );

    return { focusNext, focusPrev, focus: focusById };
}
