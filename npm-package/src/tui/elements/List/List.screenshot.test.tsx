import { render } from 'ink-testing-library';
import { expect, test } from 'vitest';
import { List } from './List.js';

const fittingItems = ['alpha', 'beta', 'gamma'];

test('List highlights the first item when it is selected, and all items fit the viewport', () => {
    const { lastFrame } = render(
        <List items={fittingItems} selectedIndex={0} viewport={5} />,
    );

    expect(lastFrame()).toMatchSnapshot();
});

test('List highlights the second item when it is selected, and all items fit the viewport', () => {
    const { lastFrame } = render(
        <List items={fittingItems} selectedIndex={1} viewport={5} />,
    );

    expect(lastFrame()).toMatchSnapshot();
});

test('List highlights no item when selectedIndex is out of range, and all items fit the viewport', () => {
    const { lastFrame } = render(
        <List items={fittingItems} selectedIndex={-1} viewport={5} />,
    );

    expect(lastFrame()).toMatchSnapshot();
});

test('List renders scroll indicators when items overflow the viewport', () => {
    const items = Array.from({ length: 10 }, (_, i) => `item-${i}`);

    const { lastFrame } = render(
        <List items={items} selectedIndex={5} viewport={3} />,
    );

    expect(lastFrame()).toMatchSnapshot();
});
