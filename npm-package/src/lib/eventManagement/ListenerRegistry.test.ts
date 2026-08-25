import { describe, expect, test, vi } from 'vitest';
import {
    type FiberNode,
    findRoot,
    getDispatchChain,
    getElement,
    getFirst,
    getLast,
    getMovedFocus,
    getNext,
    getOrderedFibers,
    getPrevious,
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
        isActive: true,
        focusable: true,
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
        const registry: readonly RegistryElement[] = [one];
        const two = createElement('two', createFiber());

        const result = register(registry, two);

        expect(result).toEqual([one, two]);
    });

    test('adds the new entry to an empty registry', () => {
        const registry: readonly RegistryElement[] = [];
        const element = createElement('one', createFiber());

        const result = register(registry, element);

        expect(result).toEqual([element]);
    });
});

describe('unregister', () => {
    test('removes the entry with the given id', () => {
        const one = createElement('one');
        const registry: readonly RegistryElement[] = [one];

        const [result] = unregister(registry, null, 'one');

        expect(result).toEqual([]);
    });

    test('throws when the id is not registered', () => {
        const notMissing = createElement('notMissing');
        const registry: readonly RegistryElement[] = [notMissing];

        expect(() => unregister(registry, null, 'missing')).toThrow(
            'No listener found with the provided ID: missing.',
        );
    });

    test('throws on an empty registry', () => {
        const registry: readonly RegistryElement[] = [];

        expect(() => unregister(registry, null, 'missing')).toThrow(
            'No listener found with the provided ID: missing.',
        );
    });

    test("leaves focus unchanged when the removed entry wasn't focused", () => {
        const { a, b } = createTree();
        const focused = createElement('focused', a);
        const other = createElement('unfocused', b);
        const registry: readonly RegistryElement[] = [focused, other];

        const [, resultFocused] = unregister(registry, focused, 'unfocused');

        expect(resultFocused).toBe(focused);
    });

    test('leaves focused unchanged if it was null', () => {
        const { a, b } = createTree();
        const one = createElement('one', a);
        const two = createElement('two', b);
        const registry: readonly RegistryElement[] = [one, two];

        const [, resultFocused] = unregister(registry, null, 'two');

        expect(resultFocused).toBeNull();
    });

    test('a detached removed fiber does not prevent fallbackElement from resolving', () => {
        // simulates React nulling the removed entry's own fiber links once
        // its unmount cleanup runs
        const { a } = createTree();
        const one = createElement('one', a);
        const two = createElement('two', createFiber(), one);
        const registry: readonly RegistryElement[] = [one, two];

        const [, resultFocused] = unregister(registry, two, 'two');

        expect(resultFocused).toBe(one);
    });

    describe('registered fallbackElement', () => {
        test('falls back to fallbackElement', () => {
            const { a, b } = createTree();
            const one = createElement('one', a);
            const two = createElement('two', b, one);
            const registry: readonly RegistryElement[] = [one, two];

            const [, resultFocused] = unregister(registry, two, 'two');

            expect(resultFocused).toBe(one);
        });
    });

    describe('null fallbackElement', () => {
        test('ignores null fallbackElements', () => {
            const { a, b } = createTree();
            const one = createElement('one', a);
            const two = createElement('two', b, null);
            const registry: readonly RegistryElement[] = [one, two];

            const [, resultFocused] = unregister(registry, one, 'two');

            expect(resultFocused).toBe(one);
        });

        test('falls back to the first entry if also getPrevious returns null', () => {
            const { a, a1 } = createTree();
            const unmountedFiber = createFiber();
            const one = createElement('one', a);
            const two = createElement('two', a1);
            const three = createElement('three', unmountedFiber, null);
            const registry: readonly RegistryElement[] = [one, two, three];

            const [, resultFocused] = unregister(registry, three, 'three');

            expect(resultFocused).toBe(one);
        });
    });

    describe('unregistered fallbackElement', () => {
        test('ignores unregistered fallbackElements', () => {
            const { a, b } = createTree();
            const unregistered = createElement('unregistered');
            const one = createElement('one', a);
            const two = createElement('two', b, unregistered);
            const registry: readonly RegistryElement[] = [one, two];

            const [, resultFocused] = unregister(registry, one, 'two');

            expect(resultFocused).toBe(one);
        });

        test('falls back to the first entry if also getPrevious returns null', () => {
            const { a, a1 } = createTree();
            const unmountedFiber = createFiber();
            const unregistered = createElement('unregistered');
            const one = createElement('one', a);
            const two = createElement('two', a1);
            const three = createElement('three', unmountedFiber, unregistered);
            const registry: readonly RegistryElement[] = [one, two, three];

            const [, resultFocused] = unregister(registry, three, 'three');

            expect(resultFocused).toBe(one);
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
            const registry: readonly RegistryElement[] = [zero, one, two];

            const [, resultFocused] = unregister(registry, two, 'two');

            expect(resultFocused).toBe(one);
        });
    });
});

describe('getElement', () => {
    test('returns the entry with the given id', () => {
        const one = createElement('one', createFiber());
        const registry: readonly RegistryElement[] = [one];

        expect(getElement(registry, 'one')).toBe(one);
    });

    test('throws when id is not registered', () => {
        const element = createElement('notMissing', createFiber());
        const registry: readonly RegistryElement[] = [element];

        expect(() => getElement(registry, 'missing')).toThrow(
            'No listener found with the provided ID: missing.',
        );
    });

    test('throws when there are no listeners', () => {
        const registry: readonly RegistryElement[] = [];

        expect(() => getElement(registry, 'missing')).toThrow(
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

    test('returns the left sibling', () => {
        const { a1, a2, b } = createTree();
        const listeners = [createElement('a1', a1)];
        const orderedFibers = getOrderedFibers(b);

        expect(getPrevious(listeners, orderedFibers, a2)?.id).toBe('a1');
    });

    test('returns the parent', () => {
        const { a, a2, b } = createTree();
        const listeners = [createElement('a', a)];
        const orderedFibers = getOrderedFibers(b);

        expect(getPrevious(listeners, orderedFibers, a2)?.id).toBe('a');
    });

    test('returns the closest left sibling, even with a gap', () => {
        const { a1, a2 } = createTree();
        const gap = createFiber();
        attachSibling(a1, gap);
        attachSibling(gap, a2);
        const listeners = [createElement('a1', a1)];
        const orderedFibers = getOrderedFibers(a2);

        expect(getPrevious(listeners, orderedFibers, a2)?.id).toBe('a1');
    });

    test('returns the closest ancestor, even with a gap', () => {
        const { a, b } = createTreeWithGaps();
        const listeners = [createElement('a', a)];
        const orderedFibers = getOrderedFibers(b);

        expect(getPrevious(listeners, orderedFibers, b)?.id).toBe('a');
    });

    test('a left sibling beats a parent or ancestor', () => {
        const { a, a1, a2 } = createTree();
        const listeners = [createElement('a', a), createElement('a1', a1)];
        const orderedFibers = getOrderedFibers(a2);

        expect(getPrevious(listeners, orderedFibers, a2)?.id).toBe('a1');
    });

    test("a left sibling's child beats the left sibling", () => {
        const { a1, a2 } = createTree();
        const a11 = createFiber();
        attachChild(a1, a11);
        const listeners = [createElement('a1', a1), createElement('a11', a11)];
        const orderedFibers = getOrderedFibers(a2);

        expect(getPrevious(listeners, orderedFibers, a2)?.id).toBe('a11');
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

describe('getMovedFocus', () => {
    test('steps focus forward by one', () => {
        const { a2, b } = createTree();
        const first = createElement('a2', a2);
        const second = createElement('b', b);
        const registry: readonly RegistryElement[] = [first, second];

        const result = getMovedFocus(registry, first, 1);

        expect(result).toBe(second);
    });

    test('steps focus forward by two', () => {
        const { a1, a2, b } = createTree();
        const first = createElement('a1', a1);
        const second = createElement('a2', a2);
        const third = createElement('b', b);
        const registry: readonly RegistryElement[] = [first, second, third];

        const result = getMovedFocus(registry, first, 2);

        expect(result).toBe(third);
    });

    test('wraps focus to the first entry when stepping forward past the last', () => {
        const { a2, b } = createTree();
        const first = createElement('a2', a2);
        const last = createElement('b', b);
        const registry: readonly RegistryElement[] = [first, last];

        const result = getMovedFocus(registry, last, 1);

        expect(result).toBe(first);
    });

    test('steps focus backward', () => {
        const { a2, b } = createTree();
        const first = createElement('a2', a2);
        const second = createElement('b', b);
        const registry: readonly RegistryElement[] = [first, second];

        const result = getMovedFocus(registry, second, -1);

        expect(result).toBe(first);
    });

    test('wraps focus to the last entry when stepping backward past the first', () => {
        const { a2, b } = createTree();
        const first = createElement('a2', a2);
        const last = createElement('b', b);
        const registry: readonly RegistryElement[] = [first, last];

        const result = getMovedFocus(registry, first, -1);

        expect(result).toBe(last);
    });

    test('is a no-op when steps is 0', () => {
        const { a2, b } = createTree();
        const first = createElement('a2', a2);
        const second = createElement('b', b);
        const registry: readonly RegistryElement[] = [first, second];

        const result = getMovedFocus(registry, first, 0);

        expect(result).toBe(first);
    });

    test('is a no-op when nothing is focused', () => {
        const registry: readonly RegistryElement[] = [
            createElement('a', createFiber()),
        ];

        const result = getMovedFocus(registry, null, 1);

        expect(result).toBeNull();
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
        const registry: readonly RegistryElement[] = [];

        expect(getDispatchChain(registry, null)).toEqual([]);
    });

    test('returns just the focused entry when nothing precedes it in DFS order', () => {
        const { root } = createTree();
        const focused = createElement('root', root);
        const registry: readonly RegistryElement[] = [focused];

        expect(getDispatchChain(registry, focused)).toEqual([focused]);
    });

    test('includes a left sibling', () => {
        const { a1, a2 } = createTree();
        const sibling = createElement('a1', a1);
        const focused = createElement('a2', a2);
        const registry: readonly RegistryElement[] = [sibling, focused];

        expect(getDispatchChain(registry, focused)).toEqual([focused, sibling]);
    });

    test('includes a parent', () => {
        const { a, a2 } = createTree();
        const ancestor = createElement('a', a);
        const focused = createElement('a2', a2);
        const registry: readonly RegistryElement[] = [ancestor, focused];

        expect(getDispatchChain(registry, focused)).toEqual([
            focused,
            ancestor,
        ]);
    });

    test('includes a left sibling then a parent', () => {
        const { a, a1, a2 } = createTree();
        const parent = createElement('a', a);
        const sibling = createElement('a1', a1);
        const focused = createElement('a2', a2);
        const registry: readonly RegistryElement[] = [parent, sibling, focused];

        expect(getDispatchChain(registry, focused)).toEqual([
            focused,
            sibling,
            parent,
        ]);
    });

    test('no wrap', () => {
        const { a1, b } = createTree();
        const focused = createElement('a1', a1);
        const after = createElement('b', b);
        const registry: readonly RegistryElement[] = [focused, after];

        expect(getDispatchChain(registry, focused)).toEqual([focused]);
    });

    test('walks past unregistered fibers to reach a more distant previous entry', () => {
        const { a, b } = createTreeWithGaps();
        const distant = createElement('a', a);
        const focused = createElement('b', b);
        const registry: readonly RegistryElement[] = [distant, focused];

        expect(getDispatchChain(registry, focused)).toEqual([focused, distant]);
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
