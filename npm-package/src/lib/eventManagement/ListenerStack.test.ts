import { expect, test } from 'vitest';
import type { StackElement } from './components/InputEventProvider/InputEventProvider.js';
import { ListenerStack } from './ListenerStack.js';

/** Sequence number is all these tests care about — name/listener are irrelevant filler. */
function entry(sequenceNumber: number): StackElement {
    return {
        id: '12345',
        name: `entry-${sequenceNumber}`,
        sequenceNumber,
        listener: () => {},
    };
}

/** Convenience: the focused-down-to-bottom order as a plain array. */
function focusedOrder(stack: ListenerStack): StackElement[] {
    return [...stack.getFocusedListeners()];
}

test('an empty stack has no focused listeners', () => {
    const stack = ListenerStack.empty();
    expect(focusedOrder(stack)).toEqual([]);
});

test('push focuses the newly-pushed listener', () => {
    const a = entry(1);
    const b = entry(2);
    const stack = ListenerStack.empty().push(a).push(b);
    expect(focusedOrder(stack)[0]).toBe(b);
});

test('push sorts by sequenceNumber regardless of push order', () => {
    const a = entry(1);
    const b = entry(2);
    const c = entry(3);
    const stack = ListenerStack.empty().push(c).push(a).push(b);
    expect([...stack]).toEqual([a, b, c]);
});

test('push re-sorts focus onto the highest sequenceNumber, even if it was pushed earlier', () => {
    const a = entry(1);
    const b = entry(2);
    // b has the higher sequenceNumber but is pushed first — mirrors a
    // parent/child pair whose effects commit out of render order.
    const stack = ListenerStack.empty().push(b).push(a);
    expect(focusedOrder(stack)[0]).toBe(b);
});

test('removing a non-focused listener leaves focus untouched', () => {
    const a = entry(1);
    const b = entry(2);
    const stack = ListenerStack.empty().push(a).push(b).remove(a);
    expect(focusedOrder(stack)[0]).toBe(b);
});

test('removing the focused listener falls back to whatever is now on top', () => {
    const a = entry(1);
    const b = entry(2);
    const stack = ListenerStack.empty().push(a).push(b).remove(b);
    expect(focusedOrder(stack)[0]).toBe(a);
});

test('removing the last remaining listener leaves nothing focused', () => {
    const a = entry(1);
    const stack = ListenerStack.empty().push(a).remove(a);
    expect(focusedOrder(stack)).toEqual([]);
});

test('moveFocus(1) steps toward the top', () => {
    const a = entry(1);
    const b = entry(2);
    const c = entry(3);
    const stack = ListenerStack.empty()
        .push(a)
        .push(b)
        .push(c)
        .moveFocus(-1) // c (top) -> b
        .moveFocus(1); // b -> c
    expect(focusedOrder(stack)[0]).toBe(c);
});

test('moveFocus(-1) steps toward the bottom', () => {
    const a = entry(1);
    const b = entry(2);
    const c = entry(3);
    const stack = ListenerStack.empty().push(a).push(b).push(c).moveFocus(-1);
    expect(focusedOrder(stack)[0]).toBe(b);
});

test('moveFocus wraps past the bottom', () => {
    const a = entry(1);
    const b = entry(2);
    const c = entry(3);
    const stack = ListenerStack.empty().push(a).push(b).push(c).moveFocus(-2);
    expect(focusedOrder(stack)[0]).toBe(a);
});

test('moveFocus wraps past the top', () => {
    const a = entry(1);
    const b = entry(2);
    const c = entry(3);
    const stack = ListenerStack.empty().push(a).push(b).push(c).moveFocus(1);
    expect(focusedOrder(stack)[0]).toBe(a);
});

test('moveFocus on an empty stack is a no-op', () => {
    const stack = ListenerStack.empty().moveFocus(1);
    expect(focusedOrder(stack)).toEqual([]);
});

test('push never mutates the instance it was called on', () => {
    const a = entry(1);
    const b = entry(2);
    const original = ListenerStack.empty().push(a);
    original.push(b);
    expect([...original]).toEqual([a]);
});

test('remove never mutates the instance it was called on', () => {
    const a = entry(1);
    const b = entry(2);
    const original = ListenerStack.empty().push(a).push(b);
    original.remove(a);
    expect([...original]).toEqual([a, b]);
});

test('moveFocus never mutates the instance it was called on', () => {
    const a = entry(1);
    const b = entry(2);
    const original = ListenerStack.empty().push(a).push(b);
    original.moveFocus(-1);
    expect(focusedOrder(original)[0]).toBe(b);
});

test('is iterable bottom to top', () => {
    const a = entry(1);
    const b = entry(2);
    const c = entry(3);
    const stack = ListenerStack.empty().push(b).push(a).push(c);
    expect([...stack]).toEqual([a, b, c]);
});

test('getFocusedListeners walks from the focused entry down to the bottom', () => {
    const a = entry(1);
    const b = entry(2);
    const c = entry(3);
    const stack = ListenerStack.empty().push(a).push(b).push(c).moveFocus(-1); // focus b
    expect(focusedOrder(stack)).toEqual([b, a]);
});
