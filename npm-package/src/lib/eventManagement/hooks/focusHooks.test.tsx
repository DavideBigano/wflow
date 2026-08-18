import { act, useEffect } from 'react';
import { describe, expect, test, vi } from 'vitest';
import {
    press,
    renderAndSettle,
    rerenderAndSettle,
} from '../../../testUtils/inkTestHelpers.js';
import { InputEventProvider } from '../components/InputEventProvider/InputEventProvider.js';
import { type FocusControls, useFocusControls } from './focusHooks.js';
import { useInputListener } from './inputHooks.js';

const KEY_X = 'x';

function Listener({
    onInput,
}: {
    onInput: Parameters<typeof useInputListener>[0];
}) {
    useInputListener(onInput);
    return null;
}

/** Hands its `useFocusControls()` result out to the test via `onReady`, once mounted. */
function FocusController({
    onReady,
}: {
    onReady: (controls: FocusControls) => void;
}) {
    const controls = useFocusControls();
    useEffect(() => {
        onReady(controls);
    });
    return null;
}

describe('useFocusControls', () => {
    function createCallTracker(calls: string[], name: string) {
        return vi.fn(() => calls.push(name));
    }

    test('focusPrev moves the dispatch entry point down the chain, skipping more-nested listeners', async () => {
        const calls: string[] = [];
        let controls!: FocusControls;

        const { stdin } = await renderAndSettle(
            <InputEventProvider>
                <Listener onInput={createCallTracker(calls, 'list1')} />
                <Listener onInput={createCallTracker(calls, 'list2')} />
                <Listener onInput={createCallTracker(calls, 'list3')} />
                <Listener onInput={createCallTracker(calls, 'list4')} />
                <FocusController
                    onReady={(readyControls) => {
                        controls = readyControls;
                    }}
                />
            </InputEventProvider>,
        );

        act(() => controls.focusPrev());
        await press(stdin, KEY_X);

        expect(calls).toEqual(['list3', 'list2', 'list1']);
    });

    test('focusPrev({ steps: 2 }) moves back two positions, not forward', async () => {
        const calls: string[] = [];
        let controls!: FocusControls;

        const { stdin } = await renderAndSettle(
            <InputEventProvider>
                <Listener onInput={createCallTracker(calls, 'list1')} />
                <Listener onInput={createCallTracker(calls, 'list2')} />
                <Listener onInput={createCallTracker(calls, 'list3')} />
                <Listener onInput={createCallTracker(calls, 'list4')} />
                <FocusController
                    onReady={(readyControls) => {
                        controls = readyControls;
                    }}
                />
            </InputEventProvider>,
        );

        act(() => controls.focusPrev({ steps: 2 })); // list4 -> list2
        await press(stdin, KEY_X);

        expect(calls).toEqual(['list2', 'list1']);
    });

    test('focusNext moves the dispatch entry point back up the chain', async () => {
        const calls: string[] = [];
        let controls!: FocusControls;

        const { stdin } = await renderAndSettle(
            <InputEventProvider>
                <Listener onInput={createCallTracker(calls, 'list1')} />
                <Listener onInput={createCallTracker(calls, 'list2')} />
                <Listener onInput={createCallTracker(calls, 'list3')} />
                <Listener onInput={createCallTracker(calls, 'list4')} />
                <FocusController
                    onReady={(readyControls) => {
                        controls = readyControls;
                    }}
                />
            </InputEventProvider>,
        );

        act(() => controls.focusPrev()); // list4 -> list3
        act(() => controls.focusNext()); // list3 -> list4
        await press(stdin, KEY_X);

        expect(calls).toEqual(['list4', 'list3', 'list2', 'list1']);
    });

    test('focusNext wraps from the most-nested listener back to the least-nested one', async () => {
        const calls: string[] = [];
        let controls!: FocusControls;

        const { stdin } = await renderAndSettle(
            <InputEventProvider>
                <Listener onInput={createCallTracker(calls, 'list1')} />
                <Listener onInput={createCallTracker(calls, 'list2')} />
                <FocusController
                    onReady={(readyControls) => {
                        controls = readyControls;
                    }}
                />
            </InputEventProvider>,
        );

        act(() => controls.focusNext()); // list2 (default) -> wraps to InitTabNavigation's own listener (least-nested of all)
        act(() => controls.focusNext()); // -> list1
        await press(stdin, KEY_X);

        expect(calls).toEqual(['list1']);
    });

    test('focusPrev wraps from the least-nested listener back to the most-nested one', async () => {
        const calls: string[] = [];
        let controls!: FocusControls;

        const { stdin } = await renderAndSettle(
            <InputEventProvider>
                <Listener onInput={createCallTracker(calls, 'list1')} />
                <Listener onInput={createCallTracker(calls, 'list2')} />
                <FocusController
                    onReady={(readyControls) => {
                        controls = readyControls;
                    }}
                />
            </InputEventProvider>,
        );

        act(() => controls.focusPrev()); // list2 (default) -> list1
        act(() => controls.focusPrev()); // list1 -> InitTabNavigation's own listener (least-nested of all)
        act(() => controls.focusPrev()); // -> wraps to list2 (default)
        await press(stdin, KEY_X);

        expect(calls).toEqual(['list2', 'list1']);
    });

    test('stopPropagation still halts propagation from within a focused chain', async () => {
        const calls: string[] = [];
        let controls!: FocusControls;

        const stoppingList2 = vi.fn((_input, _key, stop) => {
            calls.push('list2');
            stop();
        });

        const { stdin } = await renderAndSettle(
            <InputEventProvider>
                <Listener onInput={createCallTracker(calls, 'list1')} />
                <Listener onInput={stoppingList2} />
                <Listener onInput={createCallTracker(calls, 'list3')} />
                <Listener onInput={createCallTracker(calls, 'list4')} />
                <FocusController
                    onReady={(readyControls) => {
                        controls = readyControls;
                    }}
                />
            </InputEventProvider>,
        );

        act(() => controls.focusPrev()); // list4 -> list3
        await press(stdin, KEY_X);

        expect(calls).toEqual(['list3', 'list2']);
    });

    test('unmounting the focused listener falls back to full-chain dispatch', async () => {
        const calls: string[] = [];
        let controls!: FocusControls;

        const { stdin, rerender } = await renderAndSettle(
            <InputEventProvider>
                <Listener onInput={createCallTracker(calls, 'list1')} />
                <Listener onInput={createCallTracker(calls, 'list2')} />
                <Listener onInput={createCallTracker(calls, 'list3')} />
                <Listener onInput={createCallTracker(calls, 'list4')} />
                <FocusController
                    onReady={(readyControls) => {
                        controls = readyControls;
                    }}
                />
            </InputEventProvider>,
        );

        act(() => controls.focusPrev()); // list4 -> list3

        await rerenderAndSettle(
            rerender,
            <InputEventProvider>
                <Listener onInput={createCallTracker(calls, 'list1')} />
                <Listener onInput={createCallTracker(calls, 'list2')} />
                <Listener onInput={createCallTracker(calls, 'list4')} />
                <FocusController
                    onReady={(readyControls) => {
                        controls = readyControls;
                    }}
                />
            </InputEventProvider>,
        );

        await press(stdin, KEY_X);

        expect(calls).toEqual(['list4', 'list2', 'list1']);
    });

    test('focusNext throws for a negative steps value', async () => {
        let controls!: FocusControls;

        await renderAndSettle(
            <InputEventProvider>
                <Listener onInput={vi.fn()} />
                <FocusController
                    onReady={(readyControls) => {
                        controls = readyControls;
                    }}
                />
            </InputEventProvider>,
        );

        expect(() => controls.focusNext({ steps: -1 })).toThrow(
            'steps must be non-negative',
        );
    });

    test('focusPrev throws for a negative steps value', async () => {
        let controls!: FocusControls;

        await renderAndSettle(
            <InputEventProvider>
                <Listener onInput={vi.fn()} />
                <FocusController
                    onReady={(readyControls) => {
                        controls = readyControls;
                    }}
                />
            </InputEventProvider>,
        );

        expect(() => controls.focusPrev({ steps: -1 })).toThrow(
            'steps must be non-negative',
        );
    });
});
