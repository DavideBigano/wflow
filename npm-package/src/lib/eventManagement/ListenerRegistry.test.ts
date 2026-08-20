import { describe, expect, test, vi } from 'vitest';
import {
    type FiberNode,
    findRoot,
    focus,
    getDispatchChain,
    getFirst,
    getLast,
    getNext,
    getOrderedFibers,
    getPrevious,
    type ListenerRegistry,
    moveFocus,
    type RegistryElement,
    register,
    unregister,
} from './ListenerRegistry.js';

function createFiber(): FiberNode {
    return { return: null, child: null, sibling: null };
}

function attachChild(parent: FiberNode, child: FiberNode): void {
    parent.child = child;
    child.return = parent;
}

function attachSibling(fiber: FiberNode, sibling: FiberNode): void {
    fiber.sibling = sibling;
    sibling.return = fiber.return;
}

function createElement(
    id: string,
    fiber?: FiberNode,
    fallbackElement: RegistryElement | null = null,
): RegistryElement {
    return {
        id,
        name: null,
        fiber: fiber || createFiber(),
        fallbackElement,
        listener: vi.fn(),
    };
}

/**
 * Builds a fresh fiber tree for each test, shaped:
 * ```
 * root
 * ├─ a
 * │  ├─ a1
 * │  └─ a2
 * └─ b
 * ```
 * DFS order: root, a, a1, a2, b.
 */
function createTree() {
    const root = createFiber();
    const a = createFiber();
    const a1 = createFiber();
    const a2 = createFiber();
    const b = createFiber();

    attachChild(root, a);
    attachChild(a, a1);
    attachSibling(a1, a2);
    attachSibling(a, b);

    return { root, a, a1, a2, b };
}

/**
 * Builds a fresh fiber tree with unregistered ("gap") fibers surrounding
 * every listener — before the first, between the two, and after the last —
 * shaped:
 * ```
 * root (gap)
 * └─ gapBeforeA (gap)
 *    ├─ a
 *    └─ gapAfterA (gap)
 *       ├─ gapBeforeB (gap)
 *       │  ├─ b
 *       │  └─ gapAfterB (gap)
 * ```
 * DFS order: root, gapBeforeA, a, gapAfterA, gapBeforeB, b, gapAfterB.
 */
function createTreeWithGaps() {
    const root = createFiber();
    const gapBeforeA = createFiber();
    const a = createFiber();
    const gapAfterA = createFiber();
    const gapBeforeB = createFiber();
    const b = createFiber();
    const gapAfterB = createFiber();

    attachChild(root, gapBeforeA);
    attachChild(gapBeforeA, a);
    attachSibling(a, gapAfterA);
    attachChild(gapAfterA, gapBeforeB);
    attachChild(gapBeforeB, b);
    attachSibling(b, gapAfterB);

    return { root, gapBeforeA, a, gapAfterA, gapBeforeB, b, gapAfterB };
}

describe('register', () => {
    test('adds the new entry to listeners', () => {
        const one = createElement('one', createFiber());
        const registry: ListenerRegistry = { listeners: [one], focused: null };
        const two = createElement('two', createFiber());

        const result = register(registry, two);

        expect(result.listeners).toEqual([one, two]);
    });

    test('adds the new entry to an empty elements array', () => {
        const registry: ListenerRegistry = { listeners: [], focused: null };
        const element = createElement('one', createFiber());

        const result = register(registry, element);

        expect(result.listeners).toEqual([element]);
    });

    test('does not change focused', () => {
        const focused = createElement('focused', createFiber());
        const registry: ListenerRegistry = { listeners: [focused], focused };

        const result = register(registry, createElement('two', createFiber()));

        expect(result.focused).toBe(focused);
    });

    test('does not set focused', () => {
        const one = createElement('one', createFiber());
        const registry: ListenerRegistry = { listeners: [one], focused: null };

        const two = createElement('two', createFiber());

        const result = register(registry, two);

        expect(result.focused).toBeNull();
    });

    test('does not set focused on an empty elements array', () => {
        const element = createElement('focused', createFiber());
        const registry: ListenerRegistry = { listeners: [], focused: null };

        const result = register(registry, element);

        expect(result.focused).toBeNull();
    });
});

describe('unregister', () => {
    test('removes the entry with the given id', () => {
        const one = createElement('one');
        const registry: ListenerRegistry = { listeners: [one], focused: null };

        const result = unregister(registry, 'one');

        expect(result.listeners).toEqual([]);
    });

    test('throws when the id is not registered', () => {
        const notMissing = createElement('notMissing');
        const registry: ListenerRegistry = {
            listeners: [notMissing],
            focused: null,
        };

        expect(() => unregister(registry, 'missing')).toThrow(
            'No listener found with the provided ID: missing.',
        );
    });

    test('throws on an empty elements array', () => {
        const registry: ListenerRegistry = { listeners: [], focused: null };

        expect(() => unregister(registry, 'missing')).toThrow(
            'No listener found with the provided ID: missing.',
        );
    });

    test("leaves focus unchanged when the removed entry wasn't focused", () => {
        const { a, b } = createTree();
        const focused = createElement('focused', a);
        const other = createElement('unfocused', b);
        const registry: ListenerRegistry = {
            listeners: [focused, other],
            focused,
        };

        const result = unregister(registry, 'unfocused');

        expect(result.focused).toBe(focused);
    });

    test('leaves focused unchanged if it was null', () => {
        const { a, b } = createTree();
        const one = createElement('one', a);
        const two = createElement('two', b);
        const registry: ListenerRegistry = {
            listeners: [one, two],
            focused: null,
        };

        const result = unregister(registry, 'two');

        expect(result.focused).toBeNull();
    });

    test('a detached removed fiber does not prevent fallbackElement from resolving', () => {
        // simulates React nulling the removed entry's own fiber links once
        // its unmount cleanup runs
        const { a } = createTree();
        const one = createElement('one', a);
        const two = createElement('two', createFiber(), one);
        const registry: ListenerRegistry = {
            listeners: [one, two],
            focused: two,
        };

        const result = unregister(registry, 'two');

        expect(result.focused).toBe(one);
    });

    describe('registered fallbackElement', () => {
        test('falls back to fallbackElement', () => {
            const { a, b } = createTree();
            const one = createElement('one', a);
            const two = createElement('two', b, one);
            const registry: ListenerRegistry = {
                listeners: [one, two],
                focused: two,
            };

            const result = unregister(registry, 'two');

            expect(result.focused).toBe(one);
        });
    });

    describe('null fallbackElement', () => {
        test('ignores null fallbackElements', () => {
            const { a, b } = createTree();
            const one = createElement('one', a);
            const two = createElement('two', b, null);
            const registry: ListenerRegistry = {
                listeners: [one, two],
                focused: one,
            };

            const result = unregister(registry, 'two');

            expect(result.focused).toBe(one);
        });

        test('falls back to the first entry in tree order', () => {
            const { a, a1, b } = createTree();
            const one = createElement('one', a);
            const two = createElement('two', a1);
            const three = createElement('three', b, null);
            const registry: ListenerRegistry = {
                listeners: [one, two, three],
                focused: three,
            };

            const result = unregister(registry, 'three');

            expect(result.focused).toBe(one);
        });
    });

    describe('unregistered fallbackElement', () => {
        test('ignores unregistered fallbackElements', () => {
            const { a, b } = createTree();
            const unregistered = createElement('unregistered');
            const one = createElement('one', a);
            const two = createElement('two', b, unregistered);
            const registry: ListenerRegistry = {
                listeners: [one, two],
                focused: one,
            };

            const result = unregister(registry, 'two');

            expect(result.focused).toBe(one);
        });

        test('falls back to the first entry in tree order', () => {
            const { a, a1, b } = createTree();
            const unregistered = createElement('unregistered');
            const one = createElement('one', a);
            const two = createElement('two', a1);
            const three = createElement('three', b, unregistered);
            const registry: ListenerRegistry = {
                listeners: [one, two, three],
                focused: three,
            };

            const result = unregister(registry, 'three');

            expect(result.focused).toBe(one);
        });

        test("walks multiple unregistered nodes until it gets a valid one, even if it's not the first", () => {
            const { root, a, b } = createTree();
            const zero = createElement('root', root);
            const one = createElement('one', a);
            const unregistered1 = createElement(
                'unregistered1',
                createFiber(),
                one,
            );
            const unregistered2 = createElement(
                'unregistered2',
                createFiber(),
                unregistered1,
            );
            const two = createElement('two', b, unregistered2);
            const registry: ListenerRegistry = {
                listeners: [zero, one, two],
                focused: two,
            };

            const result = unregister(registry, 'two');

            expect(result.focused).toBe(one);
        });
    });
});

describe('focus', () => {
    test('focuses the entry with the given id', () => {
        const one = createElement('one', createFiber());
        const registry: ListenerRegistry = { listeners: [one], focused: null };

        const result = focus(registry, 'one');

        expect(result.focused).toBe(one);
    });

    test('is idempotent', () => {
        const one = createElement('one', createFiber());
        const registry: ListenerRegistry = { listeners: [one], focused: null };

        const firstResult = focus(registry, 'one');
        expect(firstResult.focused).toBe(one);

        const secondResult = focus(registry, 'one');
        expect(secondResult.focused).toBe(one);
    });

    test('throws when id is not registered', () => {
        const element = createElement('notMissing', createFiber());
        const registry: ListenerRegistry = {
            listeners: [element],
            focused: null,
        };

        expect(() => focus(registry, 'missing')).toThrow(
            'No listener found with the provided ID: missing.',
        );
    });

    test('throws when there are no listeners', () => {
        const registry: ListenerRegistry = { listeners: [], focused: null };

        expect(() => focus(registry, 'missing')).toThrow(
            'No listener found with the provided ID: missing.',
        );
    });
});

describe('getFirst', () => {
    test('returns the first registered listener in render order', () => {
        const { a, a2, b } = createTree();
        const listeners = [createElement('b', b), createElement('a2', a2)];
        const orderedFibers = getOrderedFibers(a);

        expect(getFirst(listeners, orderedFibers)?.id).toBe('a2');
    });

    test('returns null when none of the ordered fibers match a listener', () => {
        const { a } = createTree();
        const unrelated = createElement('unrelated', createFiber());

        expect(getFirst([unrelated], getOrderedFibers(a))).toBeNull();
    });

    test('skips over gap fibers before, between, and after the registered listeners', () => {
        const { root, a, b } = createTreeWithGaps();
        const listeners = [createElement('a', a), createElement('b', b)];

        expect(getFirst(listeners, getOrderedFibers(root))?.id).toBe('a');
    });
});

describe('getLast', () => {
    test('returns the last registered listener in render order', () => {
        const { a, a2, b } = createTree();
        const listeners = [createElement('b', b), createElement('a2', a2)];
        const orderedFibers = getOrderedFibers(a);

        expect(getLast(listeners, orderedFibers)?.id).toBe('b');
    });

    test('returns null when none of the ordered fibers match a listener', () => {
        const { a } = createTree();
        const unrelated = createElement('unrelated', createFiber());

        expect(getLast([unrelated], getOrderedFibers(a))).toBeNull();
    });

    test('skips over gap fibers before, between, and after the registered listeners', () => {
        const { root, a, b } = createTreeWithGaps();
        const listeners = [createElement('a', a), createElement('b', b)];

        expect(getLast(listeners, getOrderedFibers(root))?.id).toBe('b');
    });
});

describe('getPrevious', () => {
    test('returns the nearest registered listener before `from`', () => {
        const { a, a2, b } = createTree();
        const listeners = [createElement('a2', a2), createElement('b', b)];
        const orderedFibers = getOrderedFibers(a);

        expect(getPrevious(listeners, orderedFibers, b)?.id).toBe('a2');
    });

    test('returns null when `from` is first in render order', () => {
        const { a, a2, b } = createTree();
        const listeners = [createElement('a2', a2), createElement('b', b)];
        const orderedFibers = getOrderedFibers(a);

        expect(getPrevious(listeners, orderedFibers, a2)).toBeNull();
    });

    test('skips over gap fibers between `from` and the nearest registered listener', () => {
        const { root, a, b } = createTreeWithGaps();
        const listeners = [createElement('a', a), createElement('b', b)];

        expect(getPrevious(listeners, getOrderedFibers(root), b)?.id).toBe('a');
    });

    test('returns null when only gap fibers precede `from`, with no registered listener among them', () => {
        const { root, a } = createTreeWithGaps();
        const listeners = [createElement('a', a)];

        expect(getPrevious(listeners, getOrderedFibers(root), a)).toBeNull();
    });
});

describe('getNext', () => {
    test('returns the nearest registered listener after `from`', () => {
        const { a, a2, b } = createTree();
        const listeners = [createElement('a2', a2), createElement('b', b)];
        const orderedFibers = getOrderedFibers(a);

        expect(getNext(listeners, orderedFibers, a2)?.id).toBe('b');
    });

    test('returns null when `from` is last in render order', () => {
        const { a, a2, b } = createTree();
        const listeners = [createElement('a2', a2), createElement('b', b)];
        const orderedFibers = getOrderedFibers(a);

        expect(getNext(listeners, orderedFibers, b)).toBeNull();
    });

    test('skips over gap fibers between `from` and the nearest registered listener', () => {
        const { root, a, b } = createTreeWithGaps();
        const listeners = [createElement('a', a), createElement('b', b)];

        expect(getNext(listeners, getOrderedFibers(root), a)?.id).toBe('b');
    });

    test('returns null when only gap fibers follow `from`, with no registered listener among them', () => {
        const { root, b } = createTreeWithGaps();
        const listeners = [createElement('b', b)];

        expect(getNext(listeners, getOrderedFibers(root), b)).toBeNull();
    });
});

describe('moveFocus', () => {
    test('steps focus forward by one', () => {
        const { a2, b } = createTree();
        const first = createElement('a2', a2);
        const second = createElement('b', b);
        const registry: ListenerRegistry = {
            listeners: [first, second],
            focused: first,
        };

        const result = moveFocus(registry, 1);

        expect(result.focused).toBe(second);
    });

    test('steps focus forward by two, actually advancing twice', () => {
        const { a1, a2, b } = createTree();
        const first = createElement('a1', a1);
        const second = createElement('a2', a2);
        const third = createElement('b', b);
        const registry: ListenerRegistry = {
            listeners: [first, second, third],
            focused: first,
        };

        const result = moveFocus(registry, 2);

        expect(result.focused).toBe(third);
    });

    test('wraps focus to the first entry when stepping forward past the last', () => {
        const { a2, b } = createTree();
        const first = createElement('a2', a2);
        const last = createElement('b', b);
        const registry: ListenerRegistry = {
            listeners: [first, last],
            focused: last,
        };

        const result = moveFocus(registry, 1);

        expect(result.focused).toBe(first);
    });

    test('steps focus backward', () => {
        const { a2, b } = createTree();
        const first = createElement('a2', a2);
        const second = createElement('b', b);
        const registry: ListenerRegistry = {
            listeners: [first, second],
            focused: second,
        };

        const result = moveFocus(registry, -1);

        expect(result.focused).toBe(first);
    });

    test('wraps focus to the last entry when stepping backward past the first', () => {
        const { a2, b } = createTree();
        const first = createElement('a2', a2);
        const last = createElement('b', b);
        const registry: ListenerRegistry = {
            listeners: [first, last],
            focused: first,
        };

        const result = moveFocus(registry, -1);

        expect(result.focused).toBe(last);
    });

    test('is a no-op when steps is 0', () => {
        const { a2, b } = createTree();
        const first = createElement('a2', a2);
        const second = createElement('b', b);
        const registry: ListenerRegistry = {
            listeners: [first, second],
            focused: first,
        };

        const result = moveFocus(registry, 0);

        expect(result.focused).toBe(first);
    });

    test('is a no-op when nothing is focused', () => {
        const registry: ListenerRegistry = {
            listeners: [createElement('a', createFiber())],
            focused: null,
        };

        const result = moveFocus(registry, 1);

        expect(result.focused).toBeNull();
    });
});

describe('findRoot', () => {
    test('walks up to the tree root from any fiber', () => {
        const { root, a2 } = createTree();

        expect(findRoot(a2)).toBe(root);
    });

    test('returns the same node if it is the root', () => {
        const { root } = createTree();

        expect(findRoot(root)).toBe(root);
    });
});

describe('getDispatchChain', () => {
    test('returns an empty array when nothing is focused', () => {
        const registry: ListenerRegistry = { listeners: [], focused: null };

        expect(getDispatchChain(registry)).toEqual([]);
    });

    test('returns just the focused entry when nothing precedes it in DFS order', () => {
        const { root } = createTree();
        const focused = createElement('root', root);
        const registry: ListenerRegistry = {
            listeners: [focused],
            focused,
        };

        expect(getDispatchChain(registry)).toEqual([focused]);
    });

    test('includes a left sibling', () => {
        const { a1, a2 } = createTree();
        const sibling = createElement('a1', a1);
        const focused = createElement('a2', a2);
        const registry: ListenerRegistry = {
            listeners: [sibling, focused],
            focused,
        };

        expect(getDispatchChain(registry)).toEqual([focused, sibling]);
    });

    test('includes a parent', () => {
        const { a, a2 } = createTree();
        const ancestor = createElement('a', a);
        const focused = createElement('a2', a2);
        const registry: ListenerRegistry = {
            listeners: [ancestor, focused],
            focused,
        };

        expect(getDispatchChain(registry)).toEqual([focused, ancestor]);
    });

    test('includes a left sibling then a parent', () => {
        const { a, a1, a2 } = createTree();
        const parent = createElement('a', a);
        const sibling = createElement('a1', a1);
        const focused = createElement('a2', a2);
        const registry: ListenerRegistry = {
            listeners: [parent, sibling, focused],
            focused,
        };

        expect(getDispatchChain(registry)).toEqual([focused, sibling, parent]);
    });

    test('no wrap', () => {
        const { a1, b } = createTree();
        const focused = createElement('a1', a1);
        const after = createElement('b', b);
        const registry: ListenerRegistry = {
            listeners: [focused, after],
            focused,
        };

        expect(getDispatchChain(registry)).toEqual([focused]);
    });

    test('walks past unregistered fibers to reach a more distant previous entry', () => {
        const { a, b } = createTreeWithGaps();
        const distant = createElement('a', a);
        const focused = createElement('b', b);
        const registry: ListenerRegistry = {
            listeners: [distant, focused],
            focused,
        };

        expect(getDispatchChain(registry)).toEqual([focused, distant]);
    });
});

describe('getOrderedFibers', () => {
    describe('returns every fiber in pre-order, starting from any fiber in the tree', () => {
        const { root, a, a1, a2, b } = createTree();
        test.each([
            { node: root, name: 'root' },
            { node: a, name: 'a' },
            { node: a1, name: 'a1' },
            { node: a2, name: 'a2' },
            { node: b, name: 'b' },
        ])('from node $name', ({ node }) => {
            expect(getOrderedFibers(node)).toEqual([root, a, a1, a2, b]);
        });
    });

    test('for a one-fiber tree, returns just that one', () => {
        const tree = createFiber();

        expect(getOrderedFibers(tree)).toEqual([tree]);
    });
});
