import type { InputEventListener } from './components/InputEventProvider/InputEventProvider.js';

/**
 * Minimal shape of a React Fiber — only the fields this module reads.
 * Sourced from ink's React internal `getOwner()`
 * (`__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE.A.getOwner()`).
 * Confirmed this against react@19.2.8.
 */
export interface FiberNode {
    /** Parent fiber — walked to resolve dispatch ancestry and pre-order predecessors. */
    return: FiberNode | null;
    /** First child fiber — walked to resolve pre-order successors. */
    child: FiberNode | null;
    /** Next sibling fiber — walked to resolve pre-order successors. */
    sibling: FiberNode | null;
}

export interface RegistryElement {
    id: string;
    name: string | null;
    /** Refreshed every render via `getOwner()` — never cached across renders, since fibers double-buffer. Cleared to `null` in the owning hook's unmount effect. */
    fiber: FiberNode;
    listener: InputEventListener;
}

export interface ListenerRegistry {
    readonly listeners: ReadonlyArray<RegistryElement>;
    readonly focused: RegistryElement | null;
}

/**
 * Registers an entry.
 */
export function register(
    registry: ListenerRegistry,
    listener: RegistryElement,
): ListenerRegistry {
    return {
        listeners: [...registry.listeners, listener],
        focused: registry.focused,
    };
}

/**
 * Removes the entry matching the provided `listenerId`. If that was focused,
 * falls back to the previous entry, wrapping around.
 * @throws if `listenerId` isn't registered.
 */
export function unregister(
    registry: ListenerRegistry,
    listenerId: string,
): ListenerRegistry {
    const removed = registry.listeners.find((l) => l.id === listenerId);
    if (!removed) {
        throw new Error(
            `No listener found with the provided ID: ${listenerId}.`,
        );
    }

    const listeners = registry.listeners.filter((l) => l.id !== listenerId);

    if (registry.focused?.id !== listenerId) {
        return { listeners, focused: registry.focused };
    }

    const orderedFibers = getOrderedFibers(registry.focused.fiber);

    const focused =
        // using old registry as we need to find the removed listener's fiber to
        // get the previous one
        getPrevious(registry.listeners, orderedFibers, removed.fiber) ??
        getLast(listeners, orderedFibers);
    return { listeners, focused };
}

/**
 * Focuses the entry matching the provided `listenerId`.
 * @throws if `listenerId` isn't registered.
 */
export function focus(
    registry: ListenerRegistry,
    listenerId: string,
): ListenerRegistry {
    const target = registry.listeners.find((l) => l.id === listenerId);
    if (!target) {
        throw new Error(
            `No listener found with the provided ID: ${listenerId}.`,
        );
    }
    return { listeners: registry.listeners, focused: target };
}

/**
 * Returns the first listener encountered in a DFS fiber tree traversal.
 * Returns null if none is found.
 */
export function getFirst(
    listeners: ReadonlyArray<RegistryElement>,
    orderedFibers: FiberNode[],
): RegistryElement | null {
    for (const fiber of orderedFibers) {
        for (const listener of listeners) {
            if (Object.is(listener.fiber, fiber)) {
                return listener;
            }
        }
    }
    return null;
}

/**
 * Returns the last listener encountered in a DFS fiber tree traversal.
 * Returns null if none is found.
 */
export function getLast(
    listeners: ReadonlyArray<RegistryElement>,
    orderedFibers: FiberNode[],
): RegistryElement | null {
    for (let i = orderedFibers.length - 1; i >= 0; i--) {
        const fiber = orderedFibers[i];
        for (const listener of listeners) {
            if (Object.is(listener.fiber, fiber)) {
                return listener;
            }
        }
    }
    return null;
}

/**
 * Returns the first listener before `from` encountered in a DFS fiber tree traversal.
 * Returns null if none is found.
 */
export function getPrevious(
    listeners: ReadonlyArray<RegistryElement>,
    orderedFibers: FiberNode[],
    from: FiberNode,
): RegistryElement | null {
    const fromIndex = orderedFibers.indexOf(from);

    if (fromIndex === -1 || fromIndex === 0) {
        return null;
    }

    const searchArea: FiberNode[] = orderedFibers.slice(0, fromIndex);

    return getLast(listeners, searchArea);
}

/**
 * Returns the first listeners after `from` encountered in a DFS fiber tree traversal.
 * Returns null if none is found.
 */
export function getNext(
    listeners: ReadonlyArray<RegistryElement>,
    orderedFibers: FiberNode[],
    from: FiberNode,
): RegistryElement | null {
    const fromIndex = orderedFibers.indexOf(from);

    if (fromIndex === -1 || fromIndex === orderedFibers.length - 1) {
        return null;
    }

    const searchArea: FiberNode[] = orderedFibers.slice(fromIndex + 1);

    return getFirst(listeners, searchArea);
}

/**
 * Moves focus by `steps` provided. Positive `steps` move "next", negative ones
 * move "previous". Wraps around the listener tree. Does nothing if no listener
 * is focused.
 */
export function moveFocus(
    registry: ListenerRegistry,
    steps: number,
): ListenerRegistry {
    if (!registry.focused || steps === 0) {
        return registry;
    }

    const listeners = registry.listeners;
    if (listeners.length === 0) {
        return registry;
    }

    const orderedFibers = getOrderedFibers(listeners[0].fiber);

    const direction: 'prev' | 'next' = steps < 0 ? 'prev' : 'next';
    let focused: RegistryElement = registry.focused;
    for (let i = 0; i < Math.abs(steps); i++) {
        focused =
            direction === 'prev'
                ? // listeners is non-empty here, so these fallbacks never actually
                  // resolve to focused — they exist only to satisfy the nullable
                  // return type.
                  (getPrevious(listeners, orderedFibers, focused.fiber) ??
                  getLast(listeners, orderedFibers) ??
                  focused)
                : (getNext(listeners, orderedFibers, focused.fiber) ??
                  getFirst(listeners, orderedFibers) ??
                  focused);
    }
    return { listeners: registry.listeners, focused };
}

/** Walks up the fiber tree to the root via `.return`. */
export function findRoot(fiber: FiberNode): FiberNode {
    let current = fiber;
    while (current.return) {
        current = current.return;
    }
    return current;
}

/**
 * Starting from any fiber of a tree, returns a list of ordered fibers by a DFS traversal.
 */
export function getOrderedFibers(fiber: FiberNode): FiberNode[] {
    const rootFiber = findRoot(fiber);
    const ordered: FiberNode[] = _getOrderedFibers(rootFiber);

    return ordered;
}

/**
 * Recursive piece of {@link getOrderedFibers}.
 */
export function _getOrderedFibers(fiber: FiberNode): FiberNode[] {
    const ordered: FiberNode[] = [fiber];
    const nextNodes: FiberNode[] = [];

    if (fiber.child) {
        nextNodes.push(fiber.child);
    }
    if (fiber.sibling) {
        nextNodes.push(fiber.sibling);
    }

    for (const node of nextNodes) {
        ordered.push(..._getOrderedFibers(node));
    }

    return ordered;
}
