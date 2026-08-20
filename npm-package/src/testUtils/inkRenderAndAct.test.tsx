import { type Key, useInput } from 'ink';
import type { PropsWithChildren } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { Keys, renderAndAct } from './inkRenderAndAct';

interface ListenerProps extends PropsWithChildren {
    onInput?: Parameters<typeof useInput>[0];
    options?: Parameters<typeof useInput>[1];
}

function Listener({ onInput = () => {}, children }: ListenerProps) {
    useInput(onInput);
    return <>{children}</>;
}

describe('press', () => {
    test('non special inputs provides the pressed key value in `input`', async () => {
        const onInput = vi.fn();
        const { press } = await renderAndAct(<Listener onInput={onInput} />);

        press('a');

        expect(onInput.mock.calls[0][0]).toBe('a');
    });

    test('special inputs provides the pressed key value in `key`', async () => {
        const onInput = vi.fn();
        const { press } = await renderAndAct(<Listener onInput={onInput} />);

        await press(Keys.up);

        expect(onInput.mock.calls[0][1]).toMatchObject({ upArrow: true });
    });

    test('special inputs provides an empty string in `input`', async () => {
        const onInput = vi.fn();
        const { press } = await renderAndAct(<Listener onInput={onInput} />);

        await press(Keys.up);

        expect(onInput).toHaveBeenCalledTimes(1);
        expect(onInput.mock.calls[0][0]).toBe('');
    });

    test('capitalized letters are parsed as `shift`+`letter input`', async () => {
        const onInput = vi.fn();
        const { press } = await renderAndAct(<Listener onInput={onInput} />);

        await press('Y');

        expect(onInput.mock.calls[0][0]).toBe('Y');
        expect(onInput.mock.calls[0][1]).toMatchObject({ shift: true });
    });

    describe('simultaneous keystrokes can be provided with a single `press` call', () => {
        test('multiple plain characters produce one call with all', async () => {
            const onInput = vi.fn();
            const { press } = await renderAndAct(
                <Listener onInput={onInput} />,
            );

            await press('ab');

            expect(onInput).toHaveBeenCalledTimes(1);
            expect(onInput.mock.calls[0][0]).toBe('ab');
        });

        test('a modifier and a char are parsed correctly', async () => {
            const onInput = vi.fn();
            const { press } = await renderAndAct(
                <Listener onInput={onInput} />,
            );

            await press('\x01');

            expect(onInput).toHaveBeenCalledTimes(1);
            expect(onInput.mock.calls[0][0]).toBe('a');
            expect(onInput.mock.calls[0][1]).toMatchObject({ ctrl: true });
        });

        test('two modifiers and a char are parsed correctly', async () => {
            const onInput = vi.fn();
            const { press } = await renderAndAct(
                <Listener onInput={onInput} />,
            );

            // CSI-u form: ESC [ 97 ; 6 u — 97 is 'a', the "6" modifier is shift(1)+ctrl(4)+1
            await press('\x1b[97;6u');

            expect(onInput).toHaveBeenCalledTimes(1);
            expect(onInput.mock.calls[0][0]).toBe('a');
            expect(onInput.mock.calls[0][1]).toMatchObject({
                ctrl: true,
                shift: true,
            });
        });
    });
});

describe('Keys', () => {
    test.each([
        { name: 'up', input: '', flags: { upArrow: true } },
        { name: 'down', input: '', flags: { downArrow: true } },
        { name: 'left', input: '', flags: { leftArrow: true } },
        { name: 'right', input: '', flags: { rightArrow: true } },
        { name: 'return', input: '\r', flags: { return: true } },
        { name: 'escape', input: '', flags: { escape: true, meta: true } },
    ] satisfies {
        name: keyof typeof Keys;
        input: string;
        flags: Partial<Key>;
    }[])(
        'Keys.$name provides the expected input and flags',
        async ({ name, input, flags }) => {
            const onInput = vi.fn();
            const { press } = await renderAndAct(
                <Listener onInput={onInput} />,
            );

            await press(Keys[name]);

            expect(onInput.mock.calls[0][0]).toBe(input);
            expect(onInput.mock.calls[0][1]).toMatchObject(flags);
        },
    );
});
