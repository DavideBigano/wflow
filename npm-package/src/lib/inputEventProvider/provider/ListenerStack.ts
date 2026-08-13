import type { StackElement } from './InputEventProvider.js';

/**
 * Immutable stack of registered input listeners, kept sorted by
 * `sequenceNumber` (ascending — `stack[n].sequenceNumber <
 * stack[n+1].sequenceNumber`) and tracking its own "focused" entry. Every
 * mutator (`push`, `remove`, `moveFocus`) returns a new instance and never
 * touches the one it was called on.
 *
 * Focus auto-updates on structural changes so it never points at something
 * stale:
 * - `push` focuses whichever entry is on top after the re-sort — usually the
 *   newly-pushed listener, but not always: `sequenceNumber` is what decides
 *   genuine nesting depth, so a listener pushed later doesn't steal focus
 *   from one that already outranks it (this matters because child effects
 *   fire before parent effects even though the parent's `sequenceNumber` is
 *   captured first, at render time).
 * - `remove` only touches focus if the removed listener *was* focused, in
 *   which case it falls back to whatever is now the top.
 * - Focus is `null` only when the stack is empty.
 */
export class ListenerStack implements Iterable<StackElement> {
    private readonly items: readonly StackElement[];
    private readonly focusedItem: StackElement | null;

    private constructor(
        items: readonly StackElement[],
        focusedItem: StackElement | null,
    ) {
        this.items = items;
        this.focusedItem = focusedItem;
    }

    /** Creates an empty stack. */
    static empty(): ListenerStack {
        return new ListenerStack([], null);
    }

    /** Adds `listener`, re-sorted by `sequenceNumber`, and focuses whichever entry ends up on top — not necessarily `listener` itself, if something already in the stack outranks it. */
    push(listener: StackElement): ListenerStack {
        const items = [...this.items, listener].sort(
            (a, b) => a.sequenceNumber - b.sequenceNumber,
        );
        return new ListenerStack(items, items[items.length - 1]);
    }

    /** Removes `listener` (by reference). If it was focused, focus falls back to whatever is now the top. */
    remove(listener: StackElement): ListenerStack {
        const items = this.items.filter((existing) => existing !== listener);
        if (this.focusedItem === listener) {
            const focusedIndex = this.items.indexOf(this.focusedItem);
            if (focusedIndex === -1) {
                throw new Error(
                    'Expected to find focusedItem inside the stack entries. Possible mishandling of the stack updates',
                );
            }
            const newIndex = (focusedIndex - 1 + items.length) % items.length;
            return new ListenerStack(items, items[newIndex]);
        }
        return new ListenerStack(items, this.focusedItem);
    }

    /** Moves focus `steps` positions toward the top (positive) or the bottom (negative), wrapping around. A no-op on an empty stack. */
    moveFocus(steps: number): ListenerStack {
        const stackLength = this.items.length;

        if (stackLength === 0) {
            return this;
        }

        const currentIndex = this.focusedItem
            ? Math.max(this.items.indexOf(this.focusedItem))
            : stackLength - 1;

        if (currentIndex === -1) {
            throw new Error(
                'Expected to find focusedItem inside the stack entries. Possible mishandling of the stack updates',
            );
        }

        const nextIndex = (currentIndex + steps + stackLength) % stackLength;
        return new ListenerStack(this.items, this.items[nextIndex]);
    }

    /**
     * Moves focus to the listerner with the provided ID. A no-op on an empty stack.
     * @throws if `listenerId` is not found in the stack.
     */
    focus(listenerId: string): ListenerStack {
        if (this.items.length === 0) {
            return this;
        }

        const newFocusedItem = this.items.find(
            (element) => element.id === listenerId,
        );
        if (!newFocusedItem) {
            throw new Error(
                `No listener found with the provided ID: ${listenerId}.`,
            );
        }
        return new ListenerStack([...this.items], newFocusedItem);
    }

    /**
     * The focused listener, then each less-nested one down to the bottom of
     * the stack — the dispatch order for a single keypress. Empty if the
     * stack itself is empty.
     */
    *getFocusedListeners(): IterableIterator<StackElement> {
        if (!this.focusedItem) {
            return;
        }
        const startIndex = Math.max(this.items.indexOf(this.focusedItem), 0);
        for (let i = startIndex; i >= 0; i--) {
            yield this.items[i];
        }
    }

    /** Bottom to top — the same order the stack is stored in. */
    [Symbol.iterator](): Iterator<StackElement> {
        return this.items[Symbol.iterator]();
    }
}
