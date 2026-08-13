import { render } from 'ink-testing-library';
import { expect, test, vi } from 'vitest';
import { InputEventProvider } from '../../../lib/inputEventProvider/index.js';
import { List } from './List.js';

const fittingItems = ['alpha', 'beta', 'gamma'];

test('List highlights the first item when focused, and all items fit the viewport', () => {
    const { lastFrame } = render(
        <InputEventProvider>
            <List
                items={fittingItems}
                initialSelectedIndex={0}
                viewport={5}
                onActivate={vi.fn()}
            />
        </InputEventProvider>,
    );

    expect(lastFrame()).toMatchSnapshot();
});

test('List highlights the second item when focused, and all items fit the viewport', () => {
    const { lastFrame } = render(
        <InputEventProvider>
            <List
                items={fittingItems}
                initialSelectedIndex={1}
                viewport={5}
                onActivate={vi.fn()}
            />
        </InputEventProvider>,
    );

    expect(lastFrame()).toMatchSnapshot();
});

test('List highlights no item when not focused', () => {
    const { lastFrame } = render(
        <InputEventProvider>
            <List
                items={fittingItems}
                initialSelectedIndex={null}
                viewport={5}
                onActivate={vi.fn()}
            />
        </InputEventProvider>,
    );

    expect(lastFrame()).toMatchSnapshot();
});

test('List renders scroll indicators when items overflow the viewport', () => {
    const items = Array.from({ length: 10 }, (_, i) => `item-${i}`);

    const { lastFrame } = render(
        <InputEventProvider>
            <List
                items={items}
                initialSelectedIndex={5}
                viewport={3}
                onActivate={vi.fn()}
            />
        </InputEventProvider>,
    );

    expect(lastFrame()).toMatchSnapshot();
});

test('List renders the provided fallback when there are no items', () => {
    const { lastFrame } = render(
        <InputEventProvider>
            <List
                items={[]}
                fallback="Custom fallback"
                viewport={3}
                onActivate={vi.fn()}
            />
        </InputEventProvider>,
    );

    expect(lastFrame()).toMatchSnapshot();
});

test('List renders the default fallback when none is provided and there are no items', () => {
    const { lastFrame } = render(
        <InputEventProvider>
            <List items={[]} viewport={3} onActivate={vi.fn()} />
        </InputEventProvider>,
    );

    expect(lastFrame()).toMatchSnapshot();
});
