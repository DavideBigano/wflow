import type { PropsWithChildren } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { Keys, renderAndAct } from '../../../testUtils/inkRenderAndAct.js';

import {
    type InputEventListener,
    InputEventProvider,
} from '../components/InputEventProvider/InputEventProvider.js';
import { useInputListener } from './useInputListener.js';

interface ListenerProps extends PropsWithChildren {
    onInput?: InputEventListener;
}

function Listener({ onInput = () => {}, children }: ListenerProps) {
    useInputListener(onInput);
    return <>{children}</>;
}

describe('input and key values', () => {
    test('non special inputs provides the pressed key value in `input`', async () => {
        const onInput = vi.fn();
        const { press } = await renderAndAct(
            <InputEventProvider>
                <Listener onInput={onInput} />
            </InputEventProvider>,
        );

        await press('x');

        expect(onInput.mock.calls[0][0]).toBe('x');
    });

    test('special inputs provides the pressed key value in `key`', async () => {
        const onInput = vi.fn();
        const { press } = await renderAndAct(
            <InputEventProvider>
                <Listener onInput={onInput} />
            </InputEventProvider>,
        );

        await press(Keys.up);

        expect(onInput.mock.calls[0][1]).toMatchObject({ upArrow: true });
    });

    test('key.empty is true for an unmodified character key', async () => {
        const onInput = vi.fn();
        const { press } = await renderAndAct(
            <InputEventProvider>
                <Listener onInput={onInput} />
            </InputEventProvider>,
        );

        await press('x');

        expect(onInput).toHaveBeenCalledTimes(1);
        expect(onInput.mock.calls[0][1]).toMatchObject({ empty: true });
    });

    test('key.empty is false for a special key with no text', async () => {
        const onInput = vi.fn();
        const { press } = await renderAndAct(
            <InputEventProvider>
                <Listener onInput={onInput} />
            </InputEventProvider>,
        );

        await press(Keys.up);

        expect(onInput).toHaveBeenCalledTimes(1);
        expect(onInput.mock.calls[0][0]).toBe('');
        expect(onInput.mock.calls[0][1]).toMatchObject({
            upArrow: true,
            empty: false,
        });
    });

    test('key.empty is false when a modifier is held alongside a character', async () => {
        const onInput = vi.fn();
        const { press } = await renderAndAct(
            <InputEventProvider>
                <Listener onInput={onInput} />
            </InputEventProvider>,
        );

        // an uppercase letter carries text and sets key.shift — the ambiguous case
        // (`input === 'y'` alone) `empty` exists to make un-ignorable.
        await press('Y');

        expect(onInput).toHaveBeenCalledTimes(1);
        expect(onInput.mock.calls[0][0]).toBe('Y');
        expect(onInput.mock.calls[0][1]).toMatchObject({
            shift: true,
            empty: false,
        });
    });
});

test('later-mounted listeners are notified before earlier-mounted ones', async () => {
    const calls: string[] = [];
    const first = vi.fn(() => calls.push('first'));
    const second = vi.fn(() => calls.push('second'));

    const { press } = await renderAndAct(
        <InputEventProvider>
            <Listener onInput={first} />
            <Listener onInput={second} />
        </InputEventProvider>,
    );

    await press('x');

    expect(calls).toEqual(['second', 'first']);
});

test('a child listener outranks its parent even when both mount in the same commit', async () => {
    const calls: string[] = [];

    // ink registers a raw-mode input listener in an effect after mount, and
    // React runs a child's effects before its parent's — so Parent and Child
    // register in the same commit here, with Child's registration effect
    // running first. Priority must still reflect nesting (child outranks
    // parent), not raw registration order.
    const { press } = await renderAndAct(
        <InputEventProvider>
            <Listener onInput={() => calls.push('parent')}>
                <Listener onInput={() => calls.push('child')} />
            </Listener>
        </InputEventProvider>,
    );

    await press('x');

    expect(calls).toEqual(['child', 'parent']);
});

test('stopPropagation prevents earlier-mounted listeners from being notified', async () => {
    const calls: string[] = [];
    const first = () => calls.push('first');
    const second: InputEventListener = (_input, _key, stop) => {
        calls.push('second');
        stop();
    };

    const { press } = await renderAndAct(
        <InputEventProvider>
            <Listener onInput={first} />
            <Listener onInput={second} />
        </InputEventProvider>,
    );

    await press('x');

    expect(calls).toEqual(['second']);
});

test('unmounting a listener removes it from the stack', async () => {
    const onInput = vi.fn(() => {});
    const { press, rerender } = await renderAndAct(
        <InputEventProvider>
            <Listener onInput={onInput} />
        </InputEventProvider>,
    );

    await rerender(<InputEventProvider>{null}</InputEventProvider>);

    await press('x');

    expect(onInput).not.toHaveBeenCalled();
});

test('useInputListener throws when used outside an InputEventProvider', async () => {
    // ink catches render errors in its own error boundary
    const { lastFrame } = await renderAndAct(<Listener />);

    expect(lastFrame()).toContain(
        'useInputListener must be used within an InputEventProvider',
    );
});

test('a listener keeps its mount-order priority even after its own handler identity changes on rerender', async () => {
    const calls: string[] = [];

    const second = () => calls.push('second');

    const { rerender, press } = await renderAndAct(
        <InputEventProvider>
            <Listener onInput={() => calls.push('first')} />
            <Listener onInput={second} />
        </InputEventProvider>,
    );

    await rerender(
        <InputEventProvider>
            <Listener onInput={() => calls.push('newFirst')} />
            <Listener onInput={second} />
        </InputEventProvider>,
    );

    await press('x');

    expect(calls).toEqual(['second', 'newFirst']);
});

test('a listener always calls its latest handler, even though it only registers once', async () => {
    const calls: string[] = [];

    const { rerender, press } = await renderAndAct(
        <InputEventProvider>
            <Listener onInput={() => calls.push('v1')} />
        </InputEventProvider>,
    );

    await rerender(
        <InputEventProvider>
            <Listener onInput={() => calls.push('v2')} />
        </InputEventProvider>,
    );

    await press('x');

    expect(calls).toEqual(['v2']);
});

test('isActive: false skips a listener without removing its place in the chain', async () => {
    const calls: string[] = [];

    function ToggleableListener({ isActive }: { isActive: boolean }) {
        useInputListener(() => calls.push('toggleable'), { isActive });
        return null;
    }

    const later = () => calls.push('later');

    const { rerender, press } = await renderAndAct(
        <InputEventProvider>
            <ToggleableListener isActive={true} />
            <Listener onInput={later} />
        </InputEventProvider>,
    );

    await press('x');

    await rerender(
        <InputEventProvider>
            <ToggleableListener isActive={false} />
            <Listener onInput={later} />
        </InputEventProvider>,
    );

    await press('x');

    expect(calls).toEqual(['later', 'toggleable', 'later']);
});
