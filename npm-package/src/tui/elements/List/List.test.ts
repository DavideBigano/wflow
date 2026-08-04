import { expect, test } from 'vitest';
import { computeScrollOffset } from './List.js';

test('computeScrollOffset returns 0 when everything fits in the viewport', () => {
    expect(computeScrollOffset(3, 5, 10)).toBe(0);
});

test('computeScrollOffset centers the viewport around the selected index', () => {
    expect(computeScrollOffset(10, 20, 4)).toBe(8);
});

test('computeScrollOffset clamps to 0 near the start', () => {
    expect(computeScrollOffset(0, 20, 4)).toBe(0);
});

test('computeScrollOffset clamps to the end near the last index', () => {
    expect(computeScrollOffset(19, 20, 4)).toBe(16);
});

test('computeScrollOffset moves by at most 1 as the selected index increases one step at a time', () => {
    const total = 20;
    const viewport = 4;
    let previousOffset = computeScrollOffset(0, total, viewport);

    for (let selectedIndex = 1; selectedIndex < total; selectedIndex++) {
        const offset = computeScrollOffset(selectedIndex, total, viewport);
        expect(Math.abs(offset - previousOffset)).toBeLessThanOrEqual(1);
        previousOffset = offset;
    }
});

test('computeScrollOffset moves by at most 1 as the selected index decreases one step at a time', () => {
    const total = 20;
    const viewport = 4;
    let previousOffset = computeScrollOffset(total - 1, total, viewport);

    for (let selectedIndex = total - 2; selectedIndex >= 0; selectedIndex--) {
        const offset = computeScrollOffset(selectedIndex, total, viewport);
        expect(Math.abs(offset - previousOffset)).toBeLessThanOrEqual(1);
        previousOffset = offset;
    }
});
