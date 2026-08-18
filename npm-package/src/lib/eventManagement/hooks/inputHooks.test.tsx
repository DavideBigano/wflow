import type { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vitest';
import {
    Keys,
    press,
    renderAndSettle,
    rerenderAndSettle,
} from '../../../testUtils/inkTestHelpers.js';
import { InputEventProvider } from '../components/InputEventProvider/InputEventProvider.js';
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

describe('useInputListener', () => {
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
