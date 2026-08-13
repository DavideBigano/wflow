import { type ReactNode, useEffect } from 'react';
import { describe, expect, test, vi } from 'vitest';
import {
    Keys,
    press,
    renderAndSettle,
    rerenderAndSettle,
} from '../../../testUtils/inkTestHelpers.js';
import {
    type FocusControls,
    InputEventProvider,
    useFocusControls,
    useInputListener,
} from './InputEventProvider.js';

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
describe('InputEventProvider', () => {
    test('key.empty is true for an unmodified character key', async () => {
        const onInput = vi.fn();
        const { stdin } = await renderAndSettle(
            <InputEventProvider>
                <Listener onInput={onInput} />
            </InputEventProvider>,
        );

        await press(stdin, KEY_X);

        expect(onInput).toHaveBeenCalledTimes(1);
        expect(onInput.mock.calls[0][0]).toBe(KEY_X);
        expect(onInput.mock.calls[0][1]).toMatchObject({ empty: true });
    });

    test('key.empty is false for a special key with no text', async () => {
        const onInput = vi.fn();
        const { stdin } = await renderAndSettle(
            <InputEventProvider>
                <Listener onInput={onInput} />
            </InputEventProvider>,
        );

        await press(stdin, Keys.up);

        expect(onInput).toHaveBeenCalledTimes(1);
        expect(onInput.mock.calls[0][0]).toBe('');
        expect(onInput.mock.calls[0][1]).toMatchObject({
            upArrow: true,
            empty: false,
        });
    });

    test('key.empty is false when a modifier is held alongside a character', async () => {
        const onInput = vi.fn();
        const { stdin } = await renderAndSettle(
            <InputEventProvider>
                <Listener onInput={onInput} />
            </InputEventProvider>,
        );

        // an uppercase letter carries text and sets key.shift — the ambiguous case
        // (`input === 'y'` alone) `empty` exists to make un-ignorable.
        await press(stdin, 'Y');

        expect(onInput).toHaveBeenCalledTimes(1);
        expect(onInput.mock.calls[0][0]).toBe('Y');
        expect(onInput.mock.calls[0][1]).toMatchObject({
            shift: true,
            empty: false,
        });
    });

    test('later-mounted listeners are notified before earlier-mounted ones', async () => {
        const calls: string[] = [];
        const first = vi.fn(() => calls.push('first'));
        const second = vi.fn(() => calls.push('second'));

        const { stdin } = await renderAndSettle(
            <InputEventProvider>
                <Listener onInput={first} />
                <Listener onInput={second} />
            </InputEventProvider>,
        );

        await press(stdin, KEY_X);

        expect(calls).toEqual(['second', 'first']);
    });

    test('a child listener outranks its parent even when both mount in the same commit', async () => {
        const calls: string[] = [];

        function Parent({ children }: { children: ReactNode }) {
            useInputListener(() => {
                calls.push('parent');
            });
            return <>{children}</>;
        }

        function Child() {
            useInputListener(() => {
                calls.push('child');
            });
            return null;
        }

        // ink registers a raw-mode input listener in an effect after mount, and
        // React runs a child's effects before its parent's — so Parent and Child
        // register in the same commit here, with Child's registration effect
        // running first. Priority must still reflect nesting (child outranks
        // parent), not raw registration order.
        const { stdin } = await renderAndSettle(
            <InputEventProvider>
                <Parent>
                    <Child />
                </Parent>
            </InputEventProvider>,
        );

        await press(stdin, KEY_X);

        expect(calls).toEqual(['child', 'parent']);
    });

    test('stopPropagation prevents earlier-mounted listeners from being notified', async () => {
        const calls: string[] = [];
        const first = vi.fn(() => calls.push('first'));
        const second = vi.fn((_input, _key, stop) => {
            calls.push('second');
            stop();
        });

        const { stdin } = await renderAndSettle(
            <InputEventProvider>
                <Listener onInput={first} />
                <Listener onInput={second} />
            </InputEventProvider>,
        );

        await press(stdin, KEY_X);

        expect(calls).toEqual(['second']);
    });

    test('unmounting a listener removes it from the stack', async () => {
        const onInput = vi.fn();
        const { stdin, rerender } = await renderAndSettle(
            <InputEventProvider>
                <Listener onInput={onInput} />
            </InputEventProvider>,
        );

        await rerenderAndSettle(
            rerender,
            <InputEventProvider>{null}</InputEventProvider>,
        );

        await press(stdin, KEY_X);

        expect(onInput).not.toHaveBeenCalled();
    });

    test('useInputListener throws when used outside an InputEventProvider', async () => {
        function Bad() {
            useInputListener(() => {});
            return null;
        }

        // ink catches render errors in its own error boundary (renders them via
        // ErrorOverview) instead of letting them propagate out of render() —
        // assert on the rendered message rather than a thrown exception.
        const { lastFrame } = await renderAndSettle(<Bad />);

        expect(lastFrame()).toContain(
            'useInputListener must be used within an InputEventProvider',
        );
    });

    test('a listener keeps its mount-order priority even after its own handler identity changes on rerender', async () => {
        const calls: string[] = [];

        function DynamicListener() {
            // a fresh closure every render — priority must not move because of this
            useInputListener(() => calls.push('dynamic'));
            return null;
        }

        const laterMounted = vi.fn(() => calls.push('later'));

        const { stdin, rerender } = await renderAndSettle(
            <InputEventProvider>
                <DynamicListener />
                <Listener onInput={laterMounted} />
            </InputEventProvider>,
        );

        await rerenderAndSettle(
            rerender,
            <InputEventProvider>
                <DynamicListener />
                <Listener onInput={laterMounted} />
            </InputEventProvider>,
        );

        await press(stdin, KEY_X);

        expect(calls).toEqual(['later', 'dynamic']);
    });

    test('a listener always calls its latest handler, even though it only registers once', async () => {
        const seen: string[] = [];

        function VersionedListener({ label }: { label: string }) {
            useInputListener(() => seen.push(label));
            return null;
        }

        const { stdin, rerender } = await renderAndSettle(
            <InputEventProvider>
                <VersionedListener label="v1" />
            </InputEventProvider>,
        );

        await rerenderAndSettle(
            rerender,
            <InputEventProvider>
                <VersionedListener label="v2" />
            </InputEventProvider>,
        );

        await press(stdin, KEY_X);

        expect(seen).toEqual(['v2']);
    });

    test('isActive: false skips a listener without removing its place in the chain', async () => {
        const calls: string[] = [];

        function ToggleableListener({ isActive }: { isActive: boolean }) {
            useInputListener(() => calls.push('toggleable'), { isActive });
            return null;
        }

        const laterMounted = vi.fn(() => calls.push('later'));

        const { stdin } = await renderAndSettle(
            <InputEventProvider>
                <ToggleableListener isActive={false} />
                <Listener onInput={laterMounted} />
            </InputEventProvider>,
        );

        await press(stdin, KEY_X);

        expect(calls).toEqual(['later']);
    });
});

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

        controls.focusPrev();
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

        controls.focusPrev({ steps: 2 }); // list4 -> list2
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

        controls.focusPrev(); // list4 -> list3
        controls.focusNext(); // list3 -> list4
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

        controls.focusNext(); // list2 (default) -> wraps to InitTabNavigation's own listener (least-nested of all)
        controls.focusNext(); // -> list1
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

        controls.focusPrev(); // list2 (default) -> list1
        controls.focusPrev(); // list1 -> InitTabNavigation's own listener (least-nested of all)
        controls.focusPrev(); // -> wraps to list2 (default)
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

        controls.focusPrev(); // list4 -> list3
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

        controls.focusPrev(); // list4 -> list3

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
