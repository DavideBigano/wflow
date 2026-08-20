import { act } from 'react';
import { expect, test } from 'vitest';
import { renderAndAct } from '../../../testUtils/inkRenderAndAct.js';
import { InputEventProvider } from '../components/InputEventProvider/InputEventProvider.js';
import { Listener } from '../testUtils/Listener.js';
import { useFocus } from './useFocus.js';
import { type FocusControls, useFocusControls } from './useFocusControls.js';

interface FocusHarnessProps {
    listenerId: string;
    resultRef: { current: boolean };
}

function FocusHarness({ listenerId, resultRef }: FocusHarnessProps) {
    resultRef.current = useFocus(listenerId);
    return null;
}

interface FocusControlsHarnessProps {
    controlsRef: FocusControls;
}

function FocusControlsHarness({ controlsRef }: FocusControlsHarnessProps) {
    const controls = useFocusControls();
    controlsRef.focus = controls.focus;
    controlsRef.focusNext = controls.focusNext;
    controlsRef.focusPrev = controls.focusPrev;
    return null;
}

test('returns true for the currently focused listener', async () => {
    const result = { current: false };

    await renderAndAct(
        <InputEventProvider>
            <Listener inputOptions={{ id: 'list1' }} />
            <FocusHarness listenerId="list1" resultRef={result} />
        </InputEventProvider>,
    );

    expect(result.current).toBe(true);
});

test('returns false for a listener that is not focused', async () => {
    const result = { current: true };

    await renderAndAct(
        <InputEventProvider>
            <Listener inputOptions={{ id: 'list1' }} />
            <Listener inputOptions={{ id: 'list2' }} />
            <FocusHarness listenerId="list1" resultRef={result} />
        </InputEventProvider>,
    );

    expect(result.current).toBe(false);
});

test('updates after focus moves to the queried listener', async () => {
    const controls = {} as FocusControls;
    const result = { current: false };

    await renderAndAct(
        <InputEventProvider>
            <Listener inputOptions={{ id: 'list1' }} />
            <Listener inputOptions={{ id: 'list2' }} />
            <FocusHarness listenerId="list1" resultRef={result} />
            <FocusControlsHarness controlsRef={controls} />
        </InputEventProvider>,
    );

    await act(async () => controls.focusPrev()); // list2 -> list1

    expect(result.current).toBe(true);
});

test('useFocus throws when used outside an InputEventProvider', async () => {
    const result = { current: false };

    // ink catches render errors in its own error boundary
    const { lastFrame } = await renderAndAct(
        <FocusHarness listenerId="list1" resultRef={result} />,
    );

    expect(lastFrame()).toContain(
        'useFocus must be used within an InputEventProvider',
    );
});
