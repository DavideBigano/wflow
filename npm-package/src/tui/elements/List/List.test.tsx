import { describe, expect, test, vi } from 'vitest';
import {
    InputEventProvider,
    useInputListener,
} from '../../../lib/inputEventProvider/index.js';
import {
    Keys,
    press,
    renderAndSettle,
} from '../../../testUtils/inkTestHelpers.js';
import { computeScrollOffset, List } from './List.js';

/** Mounted before List (so it's less-nested) to observe whatever List doesn't stopPropagation on. */
function Sentinel({ onInput }: { onInput: () => void }) {
    useInputListener(onInput);
    return null;
}

describe('List behavior', () => {
    test('in-bounds down-arrow moves the selection and calls onActivate on Enter', async () => {
        const onActivate = vi.fn();
        const { stdin } = await renderAndSettle(
            <InputEventProvider>
                <List
                    items={['alpha', 'beta']}
                    initialSelectedIndex={0}
                    viewport={5}
                    onActivate={onActivate}
                />
            </InputEventProvider>,
        );

        await press(stdin, Keys.down);
        await press(stdin, Keys.return);

        expect(onActivate).toHaveBeenCalledWith('beta');
    });

    test('Enter on the initial item calls onActivate with it directly', async () => {
        const onActivate = vi.fn();
        const { stdin } = await renderAndSettle(
            <InputEventProvider>
                <List
                    items={['alpha', 'beta']}
                    initialSelectedIndex={0}
                    viewport={5}
                    onActivate={onActivate}
                />
            </InputEventProvider>,
        );

        await press(stdin, Keys.return);

        expect(onActivate).toHaveBeenCalledWith('alpha');
    });

    test('up-arrow at the first item is left for a less-nested listener to handle', async () => {
        const sentinel = vi.fn();

        const { stdin } = await renderAndSettle(
            <InputEventProvider>
                <Sentinel onInput={sentinel} />
                <List
                    items={['alpha']}
                    initialSelectedIndex={0}
                    viewport={5}
                    onActivate={vi.fn()}
                />
            </InputEventProvider>,
        );

        await press(stdin, Keys.up);

        expect(sentinel).toHaveBeenCalledOnce();
    });

    test('down-arrow at the last item is left for a less-nested listener to handle', async () => {
        const sentinel = vi.fn();

        const { stdin } = await renderAndSettle(
            <InputEventProvider>
                <Sentinel onInput={sentinel} />
                <List
                    items={['alpha']}
                    initialSelectedIndex={0}
                    viewport={5}
                    onActivate={vi.fn()}
                />
            </InputEventProvider>,
        );

        await press(stdin, Keys.down);

        expect(sentinel).toHaveBeenCalledOnce();
    });

    test('a list with no selection stays inert and leaves input for a less-nested listener', async () => {
        const sentinel = vi.fn();
        const onActivate = vi.fn();

        const { stdin } = await renderAndSettle(
            <InputEventProvider>
                <Sentinel onInput={sentinel} />
                <List
                    items={['alpha', 'beta']}
                    initialSelectedIndex={null}
                    viewport={5}
                    onActivate={onActivate}
                />
            </InputEventProvider>,
        );

        await press(stdin, Keys.down);
        await press(stdin, Keys.return);

        expect(onActivate).not.toHaveBeenCalled();
        expect(sentinel).toHaveBeenCalledTimes(2);
    });

    test('an empty list leaves up-arrow for a less-nested listener to handle', async () => {
        const sentinel = vi.fn();

        const { stdin } = await renderAndSettle(
            <InputEventProvider>
                <Sentinel onInput={sentinel} />
                <List items={[]} viewport={5} onActivate={vi.fn()} />
            </InputEventProvider>,
        );

        await press(stdin, Keys.up);

        expect(sentinel).toHaveBeenCalledOnce();
    });

    test('an empty list leaves down-arrow for a less-nested listener to handle', async () => {
        const sentinel = vi.fn();

        const { stdin } = await renderAndSettle(
            <InputEventProvider>
                <Sentinel onInput={sentinel} />
                <List items={[]} viewport={5} onActivate={vi.fn()} />
            </InputEventProvider>,
        );

        await press(stdin, Keys.down);

        expect(sentinel).toHaveBeenCalledOnce();
    });
});

describe('computeScrollOffset', () => {
    test('returns 0 when everything fits in the viewport', () => {
        expect(computeScrollOffset(3, 5, 10)).toBe(0);
    });

    test('centers the viewport around the selected index', () => {
        expect(computeScrollOffset(10, 20, 4)).toBe(8);
    });

    test('clamps to 0 near the start', () => {
        expect(computeScrollOffset(0, 20, 4)).toBe(0);
    });

    test('clamps to the end near the last index', () => {
        expect(computeScrollOffset(19, 20, 4)).toBe(16);
    });

    test('moves by at most 1 as the selected index increases one step at a time', () => {
        const total = 20;
        const viewport = 4;
        let previousOffset = computeScrollOffset(0, total, viewport);

        for (let selectedIndex = 1; selectedIndex < total; selectedIndex++) {
            const offset = computeScrollOffset(selectedIndex, total, viewport);
            expect(Math.abs(offset - previousOffset)).toBeLessThanOrEqual(1);
            previousOffset = offset;
        }
    });

    test('moves by at most 1 as the selected index decreases one step at a time', () => {
        const total = 20;
        const viewport = 4;
        let previousOffset = computeScrollOffset(total - 1, total, viewport);

        for (
            let selectedIndex = total - 2;
            selectedIndex >= 0;
            selectedIndex--
        ) {
            const offset = computeScrollOffset(selectedIndex, total, viewport);
            expect(Math.abs(offset - previousOffset)).toBeLessThanOrEqual(1);
            previousOffset = offset;
        }
    });
});
