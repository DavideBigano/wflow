import { describe, expect, test, vi } from 'vitest';
import { Keys, renderAndAct } from '../../../../testUtils/inkRenderAndAct.js';
import { FocusHarness, type FocusSpies } from '../../testUtils/FocusHarness.js';
import { Listener } from '../../testUtils/Listener.js';
import { InputEventProvider } from './InputEventProvider.js';

describe('dispatch', () => {
    test('calls the focused listener on a keypress', async () => {
        const onInput = vi.fn();

        const { press } = await renderAndAct(
            <InputEventProvider>
                <Listener autofocus onInput={onInput} />
            </InputEventProvider>,
        );

        await press('a');

        expect(onInput).toHaveBeenCalledWith(
            'a',
            expect.anything(),
            expect.anything(),
        );
    });

    test('propagates the event', async () => {
        const order: string[] = [];

        const { press } = await renderAndAct(
            <InputEventProvider>
                <Listener onInput={() => order.push('parent')}>
                    <Listener autofocus onInput={() => order.push('child')} />
                </Listener>
            </InputEventProvider>,
        );

        await press('a');

        expect(order).toEqual(['child', 'parent']);
    });

    test('stopPropagation halts dispatch to the rest of the chain', async () => {
        const onParentInput = vi.fn();

        const { press } = await renderAndAct(
            <InputEventProvider>
                <Listener onInput={onParentInput}>
                    <Listener
                        autofocus
                        onInput={(_input, _key, stopPropagation) =>
                            stopPropagation()
                        }
                    />
                </Listener>
            </InputEventProvider>,
        );

        await press('a');

        expect(onParentInput).not.toHaveBeenCalled();
    });

    test("doesn't call a listener with isActive: false", async () => {
        const onInput = vi.fn();

        const { press } = await renderAndAct(
            <InputEventProvider>
                <Listener
                    inputOptions={{ isActive: false }}
                    autofocus
                    onInput={onInput}
                />
            </InputEventProvider>,
        );

        await press('a');

        expect(onInput).not.toHaveBeenCalled();
    });

    test("doesn't call an inactive listener (first on the chain) and propagates the event", async () => {
        const onInput = vi.fn();
        const onParentInput = vi.fn();

        const { press } = await renderAndAct(
            <InputEventProvider>
                <Listener onInput={onParentInput}>
                    <Listener
                        inputOptions={{ isActive: false }}
                        autofocus
                        onInput={onInput}
                    />
                </Listener>
            </InputEventProvider>,
        );

        await press('a');

        expect(onInput).not.toHaveBeenCalled();
        expect(onParentInput).toHaveBeenCalled();
    });

    test('skips an inactive listener on an event chain', async () => {
        const order: string[] = [];

        const { press } = await renderAndAct(
            <InputEventProvider>
                <Listener onInput={() => order.push('grandparent')}>
                    <Listener
                        inputOptions={{ isActive: false }}
                        onInput={() => order.push('parent')}
                    >
                        <Listener
                            autofocus
                            onInput={() => order.push('child')}
                        />
                    </Listener>
                </Listener>
            </InputEventProvider>,
        );

        await press('a');

        expect(order).toEqual(['child', 'grandparent']);
    });
});

describe('empty', () => {
    test('is true for a plain character, which sets no key flag', async () => {
        const onInput = vi.fn();

        const { press } = await renderAndAct(
            <InputEventProvider>
                <Listener autofocus onInput={onInput} />
            </InputEventProvider>,
        );

        await press('a');

        expect(onInput).toHaveBeenCalledWith(
            'a',
            expect.objectContaining({ empty: true }),
            expect.anything(),
        );
    });

    test('is false when a special key sets a key flag', async () => {
        const onInput = vi.fn();

        const { press } = await renderAndAct(
            <InputEventProvider>
                <Listener autofocus onInput={onInput} />
            </InputEventProvider>,
        );

        await press(Keys.up);

        expect(onInput).toHaveBeenCalledWith(
            '',
            expect.objectContaining({ empty: false }),
            expect.anything(),
        );
    });
});

describe('tab navigation', () => {
    test('tab moves focus to the next listener', async () => {
        const spies = {} as FocusSpies;

        const { press } = await renderAndAct(
            <InputEventProvider>
                <Listener inputOptions={{ id: 'list1' }} autofocus />
                <Listener inputOptions={{ id: 'list2' }} />
                <FocusHarness focusSpies={spies} />
            </InputEventProvider>,
        );

        await press('\t');

        expect(spies.isFocused('list2')).toBe(true);
    });

    test('shift+tab moves focus to the previous listener', async () => {
        const spies = {} as FocusSpies;

        const { press } = await renderAndAct(
            <InputEventProvider>
                <Listener inputOptions={{ id: 'list1' }} />
                <Listener inputOptions={{ id: 'list2' }} autofocus />
                <FocusHarness focusSpies={spies} />
            </InputEventProvider>,
        );

        await press(`${Keys.escape}[Z`);

        expect(spies.isFocused('list1')).toBe(true);
    });

    test('suppressTabNavigation disables tab-driven focus movement', async () => {
        const spies = {} as FocusSpies;

        const { press } = await renderAndAct(
            <InputEventProvider suppressTabNavigation>
                <Listener inputOptions={{ id: 'list1' }} autofocus />
                <Listener inputOptions={{ id: 'list2' }} />
                <FocusHarness focusSpies={spies} />
            </InputEventProvider>,
        );

        await press('\t');

        expect(spies.isFocused('list1')).toBe(true);
    });
});
