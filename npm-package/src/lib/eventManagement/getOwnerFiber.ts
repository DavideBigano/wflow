import * as React from 'react';
import type { FiberNode } from './ListenerRegistry.js';

interface ReactSharedInternals {
    A: { getOwner: () => FiberNode | null } | null;
}

interface InternalsProperty {
    __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: ReactSharedInternals;
}

// React's public type declarations don't export this internal.
const internals = (React as unknown as InternalsProperty)
    .__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

/**
 * Returns the fiber currently rendering. `A` is only populated during
 * rendering. It is not populated at `useEffect` execution. Reads an
 * unversioned React internal (see `FiberNode`'s doc comment). Confirmed
 * against react@19.2.8.
 * @throws if called outside of render
 */
export function getOwnerFiber(): FiberNode {
    const owner = internals.A?.getOwner();
    if (!owner) {
        throw new Error(
            'getOwnerFiber must be called synchronously during render.',
        );
    }
    return owner;
}
