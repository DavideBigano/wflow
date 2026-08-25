import { describe, expect, test, vi } from 'vitest';
import { Keys, renderAndAct } from '../../../testUtils/inkRenderAndAct.js';

import {
    type InputEventListener,
    InputEventProvider,
} from '../components/InputEventProvider/InputEventProvider.js';
import { Listener } from '../testUtils/Listener.js';

describe('input and key values', () => {
    test('non special inputs provides the pressed key value in `input`', async () => {
        const onInput = vi.fn();
        const { press } = await renderAndAct(
            <InputEventProvider>
                <Listener onInput={onInput} autofocus />
            </InputEventProvider>,
        );

        await press('x');

        expect(onInput.mock.calls[0][0]).toBe('x');
    });

    test('special inputs provides the pressed key value in `key`', async () => {
        const onInput = vi.fn();
        const { press } = await renderAndAct(
            <InputEventProvider>
                <Listener onInput={onInput} autofocus />
            </InputEventProvider>,
        );

        await press(Keys.up);

        expect(onInput.mock.calls[0][1]).toMatchObject({ upArrow: true });
    });

    test('key.empty is true for an unmodified character key', async () => {
        const onInput = vi.fn();
        const { press } = await renderAndAct(
            <InputEventProvider>
                <Listener onInput={onInput} autofocus />
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
                <Listener onInput={onInput} autofocus />
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
                <Listener onInput={onInput} autofocus />
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

test('a more deeply nested listener is notified before its less-nested ancestors', async () => {
    const calls: string[] = [];
    const parent = vi.fn(() => calls.push('parent'));
    const child = vi.fn(() => calls.push('child'));

    const { press } = await renderAndAct(
        <InputEventProvider>
            <Listener onInput={parent}>
                <Listener onInput={child} autofocus />
            </Listener>
        </InputEventProvider>,
    );

    await press('x');

    expect(calls).toEqual(['child', 'parent']);
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
                <Listener onInput={() => calls.push('child')} autofocus />
            </Listener>
        </InputEventProvider>,
    );

    await press('x');

    expect(calls).toEqual(['child', 'parent']);
});

test('a previous sibling receives the event when the focused one does not stop it', async () => {
    const calls: string[] = [];
    const first = vi.fn(() => calls.push('first'));
    const second = vi.fn(() => calls.push('second'));

    const { press } = await renderAndAct(
        <InputEventProvider>
            <Listener onInput={first} />
            <Listener onInput={second} autofocus />
        </InputEventProvider>,
    );

    await press('x');

    expect(calls).toEqual(['second', 'first']);
});

test('stopPropagation prevents less-nested ancestors from being notified', async () => {
    const calls: string[] = [];
    const outer = () => calls.push('outer');
    const stopping: InputEventListener = (_input, _key, stopPropagation) => {
        calls.push('stopping');
        stopPropagation();
    };
    const innermost = () => calls.push('innermost');

    const { press } = await renderAndAct(
        <InputEventProvider>
            <Listener onInput={outer}>
                <Listener onInput={stopping}>
                    <Listener onInput={innermost} autofocus />
                </Listener>
            </Listener>
        </InputEventProvider>,
    );

    await press('x');

    expect(calls).toEqual(['innermost', 'stopping']);
});

test('unmounting a listener removes it from the registry', async () => {
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

test('a listener keeps its ancestry-based priority even after its own handler identity changes on rerender', async () => {
    const calls: string[] = [];

    const child = () => calls.push('child');

    const { rerender, press } = await renderAndAct(
        <InputEventProvider>
            <Listener onInput={() => calls.push('parent')}>
                <Listener onInput={child} autofocus />
            </Listener>
        </InputEventProvider>,
    );

    await rerender(
        <InputEventProvider>
            <Listener onInput={() => calls.push('newParent')}>
                <Listener onInput={child} />
            </Listener>
        </InputEventProvider>,
    );

    await press('x');

    expect(calls).toEqual(['child', 'newParent']);
});

test('a listener always calls its latest handler, even though it only registers once', async () => {
    const calls: string[] = [];

    const { rerender, press } = await renderAndAct(
        <InputEventProvider>
            <Listener onInput={() => calls.push('v1')} autofocus />
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

test('isActive: false skips a listener without removing its place in the ancestry chain', async () => {
    const calls: string[] = [];

    const toggleable = () => calls.push('toggleable');
    const child = () => calls.push('child');

    const { rerender, press } = await renderAndAct(
        <InputEventProvider>
            <Listener onInput={toggleable} inputOptions={{ isActive: true }}>
                <Listener onInput={child} autofocus />
            </Listener>
        </InputEventProvider>,
    );

    await press('x');

    await rerender(
        <InputEventProvider>
            <Listener onInput={toggleable} inputOptions={{ isActive: false }}>
                <Listener onInput={child} />
            </Listener>
        </InputEventProvider>,
    );

    await press('x');

    expect(calls).toEqual(['child', 'toggleable', 'child']);
});

/*
test('stopPropagation halts propagation', async () => {});

test('unmounting the focused listener falls back to the previous entry', async () => {}); */
