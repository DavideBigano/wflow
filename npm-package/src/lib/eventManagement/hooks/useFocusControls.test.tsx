import { act } from 'react';
import { describe, expect, test } from 'vitest';
import { renderAndAct } from '../../../testUtils/inkRenderAndAct.js';
import { InputEventProvider } from '../components/InputEventProvider/InputEventProvider.js';
import { FocusHarness, type FocusSpies } from '../testUtils/FocusHarness.js';
import { Listener } from '../testUtils/Listener.js';
import type { FocusControls } from './useFocusControls.js';

describe('focusPrev', () => {
    test('moves focus back', async () => {
        const controls = {} as FocusControls;
        const spies = {} as FocusSpies;

        await renderAndAct(
            <InputEventProvider suppressTabNavigation>
                <Listener inputOptions={{ id: 'list1' }} />
                <Listener inputOptions={{ id: 'list2' }} autofocus />
                <FocusHarness focusHarnesses={controls} focusSpies={spies} />
            </InputEventProvider>,
        );

        await act(async () => controls.focusPrev());

        expect(spies.isFocused('list1')).toBe(true);
    });

    test('goes in the right direction', async () => {
        const controls = {} as FocusControls;
        const spies = {} as FocusSpies;

        await renderAndAct(
            <InputEventProvider suppressTabNavigation>
                <Listener inputOptions={{ id: 'list1' }} />
                <Listener inputOptions={{ id: 'list2' }} autofocus />
                <Listener inputOptions={{ id: 'list3' }} />
                <FocusHarness focusHarnesses={controls} focusSpies={spies} />
            </InputEventProvider>,
        );

        await act(async () => controls.focusPrev());

        expect(spies.isFocused('list1')).toBe(true);
    });

    test('moves focus back one step', async () => {
        const controls = {} as FocusControls;
        const spies = {} as FocusSpies;

        await renderAndAct(
            <InputEventProvider suppressTabNavigation>
                <Listener inputOptions={{ id: 'list1' }} />
                <Listener inputOptions={{ id: 'list2' }} autofocus />
                <FocusHarness focusHarnesses={controls} focusSpies={spies} />
            </InputEventProvider>,
        );

        await act(async () => controls.focusPrev({ steps: 1 }));

        expect(spies.isFocused('list1')).toBe(true);
    });

    test('moves focus back multiple steps', async () => {
        const controls = {} as FocusControls;
        const spies = {} as FocusSpies;

        await renderAndAct(
            <InputEventProvider suppressTabNavigation>
                <Listener inputOptions={{ id: 'list1' }} />
                <Listener inputOptions={{ id: 'list2' }} />
                <Listener inputOptions={{ id: 'list3' }} autofocus />
                <FocusHarness focusHarnesses={controls} focusSpies={spies} />
            </InputEventProvider>,
        );

        await act(async () => controls.focusPrev({ steps: 2 }));

        expect(spies.isFocused('list1')).toBe(true);
    });

    test('0 steps does nothing', async () => {
        const controls = {} as FocusControls;
        const spies = {} as FocusSpies;

        await renderAndAct(
            <InputEventProvider suppressTabNavigation>
                <Listener inputOptions={{ id: 'list1' }} />
                <Listener inputOptions={{ id: 'list2' }} autofocus />
                <FocusHarness focusHarnesses={controls} focusSpies={spies} />
            </InputEventProvider>,
        );

        await act(async () => controls.focusPrev({ steps: 0 }));

        expect(spies.isFocused('list2')).toBe(true);
    });

    test('multiple calls stack', async () => {
        const controls = {} as FocusControls;
        const spies = {} as FocusSpies;

        await renderAndAct(
            <InputEventProvider suppressTabNavigation>
                <Listener inputOptions={{ id: 'list1' }} />
                <Listener inputOptions={{ id: 'list2' }} />
                <Listener inputOptions={{ id: 'list3' }} autofocus />
                <FocusHarness focusHarnesses={controls} focusSpies={spies} />
            </InputEventProvider>,
        );

        await act(async () => controls.focusPrev());
        await act(async () => controls.focusPrev());

        expect(spies.isFocused('list1')).toBe(true);
    });

    test('wraps from the first listener in DFS order back to the last one', async () => {
        const controls = {} as FocusControls;
        const spies = {} as FocusSpies;

        await renderAndAct(
            <InputEventProvider>
                <Listener inputOptions={{ id: 'list1' }} autofocus />
                <Listener inputOptions={{ id: 'list2' }} />
                <FocusHarness focusHarnesses={controls} focusSpies={spies} />
            </InputEventProvider>,
        );

        await act(async () => controls.focusPrev());

        expect(spies.isFocused('list2')).toBe(true);
    });

    test('goes in the right direction when wrapping', async () => {
        const controls = {} as FocusControls;
        const spies = {} as FocusSpies;

        await renderAndAct(
            <InputEventProvider>
                <Listener inputOptions={{ id: 'list1' }} autofocus />
                <Listener inputOptions={{ id: 'list2' }} />
                <Listener inputOptions={{ id: 'list3' }} />
                <FocusHarness focusHarnesses={controls} focusSpies={spies} />
            </InputEventProvider>,
        );

        await act(async () => controls.focusPrev());

        expect(spies.isFocused('list3')).toBe(true);
    });

    test('the old element loses focus', async () => {
        const controls = {} as FocusControls;
        const spies = {} as FocusSpies;

        await renderAndAct(
            <InputEventProvider suppressTabNavigation>
                <Listener inputOptions={{ id: 'list1' }} />
                <Listener inputOptions={{ id: 'list2' }} autofocus />
                <FocusHarness focusHarnesses={controls} focusSpies={spies} />
            </InputEventProvider>,
        );

        await act(async () => controls.focusPrev());

        expect(spies.isFocused('list2')).toBe(false);
    });

    test("elements on the way don't get focused", async () => {
        const controls = {} as FocusControls;
        const spies = {} as FocusSpies;

        await renderAndAct(
            <InputEventProvider suppressTabNavigation>
                <Listener inputOptions={{ id: 'list1' }} />
                <Listener inputOptions={{ id: 'list2' }} />
                <Listener inputOptions={{ id: 'list3' }} autofocus />
                <FocusHarness focusHarnesses={controls} focusSpies={spies} />
            </InputEventProvider>,
        );

        await act(async () => controls.focusPrev({ steps: 2 }));

        expect(spies.isFocused('list2')).toBe(false);
    });

    test("unrelated elements don't get focused", async () => {
        const controls = {} as FocusControls;
        const spies = {} as FocusSpies;

        await renderAndAct(
            <InputEventProvider suppressTabNavigation>
                <Listener inputOptions={{ id: 'list1' }} />
                <Listener inputOptions={{ id: 'list2' }} />
                <Listener inputOptions={{ id: 'list3' }} autofocus />
                <FocusHarness focusHarnesses={controls} focusSpies={spies} />
            </InputEventProvider>,
        );

        await act(async () => controls.focusPrev());

        expect(spies.isFocused('list1')).toBe(false);
    });

    test('throws for a negative steps value', async () => {
        const controls = {} as FocusControls;

        await renderAndAct(
            <InputEventProvider>
                <FocusHarness focusHarnesses={controls} />
            </InputEventProvider>,
        );

        expect(() => controls.focusPrev({ steps: -1 })).toThrow(
            'steps must be non-negative',
        );
    });

    test('does nothing if there are no focused listeners', async () => {
        const controls = {} as FocusControls;
        const spies = {} as FocusSpies;

        await renderAndAct(
            <InputEventProvider suppressTabNavigation>
                <Listener inputOptions={{ id: 'list1' }} />
                <FocusHarness focusHarnesses={controls} focusSpies={spies} />
            </InputEventProvider>,
        );

        await act(async () => controls.focusPrev());

        expect(spies.getFocused()).toBe(null);
    });

    test('does nothing if there are no listeners', async () => {
        const controls = {} as FocusControls;
        const spies = {} as FocusSpies;

        await renderAndAct(
            <InputEventProvider suppressTabNavigation>
                <FocusHarness focusHarnesses={controls} focusSpies={spies} />
            </InputEventProvider>,
        );

        await act(async () => controls.focusPrev());

        expect(spies.getFocused()).toBe(null);
    });
});

describe('focusNext', () => {
    test('moves focus forward', async () => {
        const controls = {} as FocusControls;
        const spies = {} as FocusSpies;

        await renderAndAct(
            <InputEventProvider suppressTabNavigation>
                <Listener inputOptions={{ id: 'list1' }} autofocus />
                <Listener inputOptions={{ id: 'list2' }} />
                <FocusHarness focusHarnesses={controls} focusSpies={spies} />
            </InputEventProvider>,
        );

        await act(async () => controls.focusNext());

        expect(spies.isFocused('list2')).toBe(true);
    });

    test('goes in the right direction', async () => {
        const controls = {} as FocusControls;
        const spies = {} as FocusSpies;

        await renderAndAct(
            <InputEventProvider suppressTabNavigation>
                <Listener inputOptions={{ id: 'list1' }} autofocus />
                <Listener inputOptions={{ id: 'list2' }} />
                <Listener inputOptions={{ id: 'list3' }} />
                <FocusHarness focusHarnesses={controls} focusSpies={spies} />
            </InputEventProvider>,
        );

        await act(async () => controls.focusNext());

        expect(spies.isFocused('list2')).toBe(true);
    });

    test('moves focus forward one step', async () => {
        const controls = {} as FocusControls;
        const spies = {} as FocusSpies;

        await renderAndAct(
            <InputEventProvider suppressTabNavigation>
                <Listener inputOptions={{ id: 'list1' }} autofocus />
                <Listener inputOptions={{ id: 'list2' }} />
                <FocusHarness focusHarnesses={controls} focusSpies={spies} />
            </InputEventProvider>,
        );

        await act(async () => controls.focusNext({ steps: 1 }));

        expect(spies.isFocused('list2')).toBe(true);
    });

    test('moves focus forward multiple steps', async () => {
        const controls = {} as FocusControls;
        const spies = {} as FocusSpies;

        await renderAndAct(
            <InputEventProvider suppressTabNavigation>
                <Listener inputOptions={{ id: 'list1' }} autofocus />
                <Listener inputOptions={{ id: 'list2' }} />
                <Listener inputOptions={{ id: 'list3' }} />
                <FocusHarness focusHarnesses={controls} focusSpies={spies} />
            </InputEventProvider>,
        );

        await act(async () => controls.focusNext({ steps: 2 }));

        expect(spies.isFocused('list3')).toBe(true);
    });

    test('0 steps does nothing', async () => {
        const controls = {} as FocusControls;
        const spies = {} as FocusSpies;

        await renderAndAct(
            <InputEventProvider suppressTabNavigation>
                <Listener inputOptions={{ id: 'list1' }} />
                <Listener inputOptions={{ id: 'list2' }} autofocus />
                <FocusHarness focusHarnesses={controls} focusSpies={spies} />
            </InputEventProvider>,
        );

        await act(async () => controls.focusNext({ steps: 0 }));

        expect(spies.isFocused('list2')).toBe(true);
    });

    test('multiple calls stack', async () => {
        const controls = {} as FocusControls;
        const spies = {} as FocusSpies;

        await renderAndAct(
            <InputEventProvider suppressTabNavigation>
                <Listener inputOptions={{ id: 'list1' }} autofocus />
                <Listener inputOptions={{ id: 'list2' }} />
                <Listener inputOptions={{ id: 'list3' }} />
                <FocusHarness focusHarnesses={controls} focusSpies={spies} />
            </InputEventProvider>,
        );

        await act(async () => controls.focusNext());
        await act(async () => controls.focusNext());

        expect(spies.isFocused('list3')).toBe(true);
    });

    test('wraps from the last listener in DFS order back to the first one', async () => {
        const controls = {} as FocusControls;
        const spies = {} as FocusSpies;

        await renderAndAct(
            <InputEventProvider>
                <Listener inputOptions={{ id: 'list1' }} />
                <Listener inputOptions={{ id: 'list2' }} autofocus />
                <FocusHarness focusHarnesses={controls} focusSpies={spies} />
            </InputEventProvider>,
        );

        await act(async () => controls.focusNext());

        expect(spies.isFocused('list1')).toBe(true);
    });

    test('goes in the right direction when wrapping', async () => {
        const controls = {} as FocusControls;
        const spies = {} as FocusSpies;

        await renderAndAct(
            <InputEventProvider>
                <Listener inputOptions={{ id: 'list1' }} />
                <Listener inputOptions={{ id: 'list2' }} />
                <Listener inputOptions={{ id: 'list3' }} autofocus />
                <FocusHarness focusHarnesses={controls} focusSpies={spies} />
            </InputEventProvider>,
        );

        await act(async () => controls.focusNext());

        expect(spies.isFocused('list1')).toBe(true);
    });

    test('the old element loses focus', async () => {
        const controls = {} as FocusControls;
        const spies = {} as FocusSpies;

        await renderAndAct(
            <InputEventProvider suppressTabNavigation>
                <Listener inputOptions={{ id: 'list1' }} autofocus />
                <Listener inputOptions={{ id: 'list2' }} />
                <FocusHarness focusHarnesses={controls} focusSpies={spies} />
            </InputEventProvider>,
        );

        await act(async () => controls.focusNext());

        expect(spies.isFocused('list1')).toBe(false);
    });

    test("elements on the way don't get focused", async () => {
        const controls = {} as FocusControls;
        const spies = {} as FocusSpies;

        await renderAndAct(
            <InputEventProvider suppressTabNavigation>
                <Listener inputOptions={{ id: 'list1' }} autofocus />
                <Listener inputOptions={{ id: 'list2' }} />
                <Listener inputOptions={{ id: 'list3' }} />
                <FocusHarness focusHarnesses={controls} focusSpies={spies} />
            </InputEventProvider>,
        );

        await act(async () => controls.focusNext({ steps: 2 }));

        expect(spies.isFocused('list2')).toBe(false);
    });

    test("unrelated elements don't get focused", async () => {
        const controls = {} as FocusControls;
        const spies = {} as FocusSpies;

        await renderAndAct(
            <InputEventProvider suppressTabNavigation>
                <Listener inputOptions={{ id: 'list1' }} autofocus />
                <Listener inputOptions={{ id: 'list2' }} />
                <Listener inputOptions={{ id: 'list3' }} />
                <FocusHarness focusHarnesses={controls} focusSpies={spies} />
            </InputEventProvider>,
        );

        await act(async () => controls.focusNext());

        expect(spies.isFocused('list3')).toBe(false);
    });

    test('throws for a negative steps value', async () => {
        const controls = {} as FocusControls;

        await renderAndAct(
            <InputEventProvider>
                <FocusHarness focusHarnesses={controls} />
            </InputEventProvider>,
        );

        expect(() => controls.focusNext({ steps: -1 })).toThrow(
            'steps must be non-negative',
        );
    });

    test('does nothing if there are no focused listeners', async () => {
        const controls = {} as FocusControls;
        const spies = {} as FocusSpies;

        await renderAndAct(
            <InputEventProvider suppressTabNavigation>
                <Listener inputOptions={{ id: 'list1' }} />
                <FocusHarness focusHarnesses={controls} focusSpies={spies} />
            </InputEventProvider>,
        );

        await act(async () => controls.focusNext());

        expect(spies.getFocused()).toBe(null);
    });

    test('does nothing if there are no listeners', async () => {
        const controls = {} as FocusControls;
        const spies = {} as FocusSpies;

        await renderAndAct(
            <InputEventProvider suppressTabNavigation>
                <FocusHarness focusHarnesses={controls} focusSpies={spies} />
            </InputEventProvider>,
        );

        await act(async () => controls.focusNext());

        expect(spies.getFocused()).toBe(null);
    });
});

describe('focus', () => {
    test('focuses the provided element (with a focused element)', async () => {
        const controls = {} as FocusControls;
        const spies = {} as FocusSpies;

        await renderAndAct(
            <InputEventProvider suppressTabNavigation>
                <Listener inputOptions={{ id: 'list1' }} autofocus />
                <Listener inputOptions={{ id: 'list2' }} />
                <FocusHarness focusHarnesses={controls} focusSpies={spies} />
            </InputEventProvider>,
        );

        await act(async () => controls.focus('list2'));

        expect(spies.isFocused('list2')).toBe(true);
    });

    test('focused the provided element (with no focused element)', async () => {
        const controls = {} as FocusControls;
        const spies = {} as FocusSpies;

        await renderAndAct(
            <InputEventProvider suppressTabNavigation>
                <Listener inputOptions={{ id: 'list1' }} />
                <Listener inputOptions={{ id: 'list2' }} />
                <FocusHarness focusHarnesses={controls} focusSpies={spies} />
            </InputEventProvider>,
        );

        await act(async () => controls.focus('list1'));

        expect(spies.isFocused('list1')).toBe(true);
    });

    test('is idempotent', async () => {
        const controls = {} as FocusControls;
        const spies = {} as FocusSpies;

        await renderAndAct(
            <InputEventProvider suppressTabNavigation>
                <Listener inputOptions={{ id: 'list1' }} autofocus />
                <FocusHarness focusHarnesses={controls} focusSpies={spies} />
            </InputEventProvider>,
        );

        await act(async () => controls.focus('list1'));
        await act(async () => controls.focus('list1'));

        expect(spies.isFocused('list1')).toBe(true);
    });

    test('the old element loses focus', async () => {
        const controls = {} as FocusControls;
        const spies = {} as FocusSpies;

        await renderAndAct(
            <InputEventProvider suppressTabNavigation>
                <Listener inputOptions={{ id: 'list1' }} autofocus />
                <Listener inputOptions={{ id: 'list2' }} />
                <FocusHarness focusHarnesses={controls} focusSpies={spies} />
            </InputEventProvider>,
        );

        await act(async () => controls.focus('list2'));

        expect(spies.isFocused('list1')).toBe(false);
    });

    test("elements on the way don't get focused", async () => {
        const controls = {} as FocusControls;
        const spies = {} as FocusSpies;

        await renderAndAct(
            <InputEventProvider suppressTabNavigation>
                <Listener inputOptions={{ id: 'list1' }} autofocus />
                <Listener inputOptions={{ id: 'list2' }} />
                <Listener inputOptions={{ id: 'list3' }} />
                <FocusHarness focusHarnesses={controls} focusSpies={spies} />
            </InputEventProvider>,
        );

        await act(async () => controls.focus('list3'));

        expect(spies.isFocused('list2')).toBe(false);
    });

    test("unrelated elements don't get focused", async () => {
        const controls = {} as FocusControls;
        const spies = {} as FocusSpies;

        await renderAndAct(
            <InputEventProvider suppressTabNavigation>
                <Listener inputOptions={{ id: 'list1' }} autofocus />
                <Listener inputOptions={{ id: 'list2' }} />
                <Listener inputOptions={{ id: 'list3' }} />
                <FocusHarness focusHarnesses={controls} focusSpies={spies} />
            </InputEventProvider>,
        );

        await act(async () => controls.focus('list2'));

        expect(spies.isFocused('list3')).toBe(false);
    });

    test('throws if the element is not found', async () => {
        const controls = {} as FocusControls;

        await renderAndAct(
            <InputEventProvider suppressTabNavigation>
                <Listener inputOptions={{ id: 'list1' }} />
                <FocusHarness focusHarnesses={controls} />
            </InputEventProvider>,
        );

        expect(() => controls.focus('missing')).toThrow(
            'No listener found with the provided ID: missing.',
        );
    });

    test('throws if there are no listeners', async () => {
        const controls = {} as FocusControls;

        await renderAndAct(
            <InputEventProvider suppressTabNavigation>
                <FocusHarness focusHarnesses={controls} />
            </InputEventProvider>,
        );

        expect(() => controls.focus('missing')).toThrow(
            'No listener found with the provided ID: missing.',
        );
    });
});
