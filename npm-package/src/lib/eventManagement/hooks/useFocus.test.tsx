import { act } from 'react';
import { expect, test } from 'vitest';
import { renderAndAct } from '../../../testUtils/inkRenderAndAct.js';
import { InputEventProvider } from '../components/InputEventProvider/InputEventProvider.js';
import { FocusHarness } from '../testUtils/FocusHarness.js';
import { Listener } from '../testUtils/Listener.js';
import { useFocus } from './useFocus.js';
import type { FocusControls } from './useFocusControls.js';

interface FocusSpyProps {
    listenerId: string;
    focusSpy: { value: boolean };
}

function FocusSpy({ listenerId, focusSpy }: FocusSpyProps) {
    focusSpy.value = useFocus(listenerId);
    return null;
}

test('returns true for the currently focused listener', async () => {
    const result = { value: false };

    await renderAndAct(
        <InputEventProvider>
            <Listener inputOptions={{ id: 'list1' }} autofocus />
            <FocusSpy listenerId="list1" focusSpy={result} />
        </InputEventProvider>,
    );

    expect(result.value).toBe(true);
});

test('returns false for a listener that is not focused', async () => {
    const result = { value: true };

    await renderAndAct(
        <InputEventProvider>
            <Listener inputOptions={{ id: 'list1' }} />
            <Listener inputOptions={{ id: 'list2' }} autofocus />
            <FocusSpy listenerId="list1" focusSpy={result} />
        </InputEventProvider>,
    );

    expect(result.value).toBe(false);
});

test('updates after focus moves to the queried listener', async () => {
    const controls = {} as FocusControls;
    const result = { value: false };

    await renderAndAct(
        <InputEventProvider>
            <Listener inputOptions={{ id: 'list1' }} />
            <Listener inputOptions={{ id: 'list2' }} autofocus />
            <FocusSpy listenerId="list1" focusSpy={result} />
            <FocusHarness focusHarnesses={controls} />
        </InputEventProvider>,
    );

    await act(async () => controls.focusPrev()); // list2 -> list1

    expect(result.value).toBe(true);
});

test('useFocus throws when used outside an InputEventProvider', async () => {
    const result = { value: false };

    // ink catches render errors in its own error boundary
    const { lastFrame } = await renderAndAct(
        <FocusSpy listenerId="list1" focusSpy={result} />,
    );

    expect(lastFrame()).toContain(
        'useFocus must be used within an InputEventProvider',
    );
});
