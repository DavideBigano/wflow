import { Text } from 'ink';
import {
    act,
    Component,
    type ReactNode,
    type RefObject,
    Suspense,
    use,
} from 'react';
import { describe, expect, test, vi } from 'vitest';
import { renderAndAct } from '../../testUtils/inkRenderAndAct.js';
import { renderHookAndAct } from '../../testUtils/reactRenderHookAndAct.js';
import { usePromise } from './usePromise.js';

/**
 * Catches a promise's rejection so it can be displayed instead of crashing the
 * tree — a class component because React has no hook-based equivalent for
 * catching render errors.
 */
class ErrorBoundary extends Component<
    { fallback: (error: Error) => ReactNode; children: ReactNode },
    { error: Error | null }
> {
    state: { error: Error | null } = { error: null };

    static getDerivedStateFromError(error: Error) {
        return { error };
    }

    render() {
        if (this.state.error) {
            return this.props.fallback(this.state.error);
        }
        return this.props.children;
    }
}

/** Reads a promise's data via `use()`, since `usePromise` no longer suspends on its own. */
function PromiseConsumer({ promise }: { promise: Promise<string> }) {
    const data = use(promise);
    return <Text>{data}</Text>;
}

interface PromiseOwnerProps {
    promise: Promise<string> | (() => Promise<string>);
    refreshRef?: RefObject<() => void>;
}

/**
 * Owns the stable promise `usePromise` caches, and renders it through a
 * Suspense/ErrorBoundary pair scoped to just {@link PromiseConsumer} below —
 * so this component (and therefore `usePromise`'s cache) never sits inside
 * the subtree React discards and remounts while recovering from a rejected
 * promise.
 */
function PromiseOwner({ promise, refreshRef }: PromiseOwnerProps) {
    const [stablePromise, refresh] = usePromise(promise);
    if (refreshRef) {
        refreshRef.current = refresh;
    }
    return (
        <ErrorBoundary
            fallback={(error) => <Text>error: {error.message}</Text>}
        >
            <Suspense fallback={<Text>loading</Text>}>
                <PromiseConsumer promise={stablePromise} />
            </Suspense>
        </ErrorBoundary>
    );
}

describe('usePromise(promise)', () => {
    test('returns the resolved value', async () => {
        const { result } = await renderHookAndAct(() =>
            usePromise(Promise.resolve('value')),
        );

        const [promise] = result.current;
        await expect(promise).resolves.toBe('value');
    });

    describe('changing deps', () => {
        test('does not switch to a different promise if deps remain unchanged', async () => {
            const promiseA = Promise.resolve('a');
            const promiseB = Promise.resolve('b');

            const { result, rerender } = await renderHookAndAct(
                ({
                    promise,
                    deps,
                }: {
                    promise: Promise<string>;
                    deps: string[];
                    // biome-ignore lint/correctness/useExhaustiveDependencies: this test asserts that the promise itself is not a trigger
                }) => usePromise(promise, deps),
                { initialProps: { promise: promiseA, deps: ['stable'] } },
            );

            await rerender({ promise: promiseB, deps: ['stable'] });

            const [promise] = result.current;
            expect(promise).toBe(promiseA);
        });

        test('switches to a different promise if deps change', async () => {
            const promiseA = Promise.resolve('a');
            const promiseB = Promise.resolve('b');

            const { result, rerender } = await renderHookAndAct(
                ({
                    promise,
                    deps,
                }: {
                    promise: Promise<string>;
                    deps: string[];
                    // biome-ignore lint/correctness/useExhaustiveDependencies: this test asserts that only deps changing trigger a switch
                }) => usePromise(promise, deps),
                { initialProps: { promise: promiseA, deps: ['a'] } },
            );

            await rerender({ promise: promiseB, deps: ['b'] });

            const [promise] = result.current;
            expect(promise).toBe(promiseB);
        });
    });

    describe('rendering states', () => {
        test('shows the resolved data once the promise settles', async () => {
            const promise = Promise.resolve('value');

            const { lastFrame } = await renderAndAct(
                <PromiseOwner promise={promise} />,
            );

            expect(lastFrame()).toEqual('value');
        });

        test('shows the Suspense fallback while the promise is pending', async () => {
            const promise = new Promise<string>(() => {});

            const { lastFrame } = await renderAndAct(
                <PromiseOwner promise={promise} />,
            );

            expect(lastFrame()).toEqual('loading');
        });

        test('shows an error message caught by the error boundary when the promise rejects', async () => {
            const promise = Promise.reject(new Error('boom'));

            const { lastFrame } = await renderAndAct(
                <PromiseOwner promise={promise} />,
            );

            expect(lastFrame()).toEqual('error: boom');
        });
    });
});

describe('usePromise(factory)', () => {
    test('calls the factory and returns its resolved value', async () => {
        const { result } = await renderHookAndAct(() =>
            usePromise(() => Promise.resolve('from-factory')),
        );

        const [promise] = result.current;
        await expect(promise).resolves.toBe('from-factory');
    });

    describe('changing deps', () => {
        test('does not re-invoke the factory on re-render with unchanged deps', async () => {
            const factory = vi.fn(() => Promise.resolve('value'));
            const { rerender } = await renderHookAndAct(
                ({ deps }) => usePromise(factory, [...deps]),
                { initialProps: { deps: ['stable'] } },
            );
            const callsAfterMount = factory.mock.calls.length;

            await rerender({ deps: ['stable'] });

            // asserts the delta between calls because the Suspense may mount the
            // components more than once
            expect(factory).toHaveBeenCalledTimes(callsAfterMount);
        });

        test('re-invokes the factory when deps change', async () => {
            const factory = vi.fn(() => Promise.resolve('value'));
            const { rerender } = await renderHookAndAct(
                ({ deps }) => usePromise(factory, [...deps]),
                { initialProps: { deps: ['a'] } },
            );
            const callsAfterMount = factory.mock.calls.length;

            await rerender({ deps: ['b'] });

            expect(factory.mock.calls.length).toBeGreaterThan(callsAfterMount);
        });

        test('does not re-invoke a different factory if deps remain unchanged', async () => {
            const factoryA = vi.fn(() => Promise.resolve('a'));
            const factoryB = vi.fn(() => Promise.resolve('b'));

            const { rerender } = await renderHookAndAct(
                // biome-ignore lint/correctness/useExhaustiveDependencies: this test asserts that the factory itself is not a trigger
                ({ factory, deps }) => usePromise(factory, [...deps]),
                { initialProps: { factory: factoryA, deps: ['stable'] } },
            );

            await rerender({ factory: factoryB, deps: ['stable'] });

            expect(factoryB).not.toHaveBeenCalled();
        });

        test('re-invokes a different factory if deps change', async () => {
            const factoryA = vi.fn(() => Promise.resolve('a'));
            const factoryB = vi.fn(() => Promise.resolve('b'));

            const { rerender } = await renderHookAndAct(
                // biome-ignore lint/correctness/useExhaustiveDependencies: this test asserts that only deps changing trigger a re-invoke
                ({ factory, deps }) => usePromise(factory, [...deps]),
                { initialProps: { factory: factoryA, deps: ['a'] } },
            );

            await rerender({ factory: factoryB, deps: ['b'] });

            expect(factoryB).toHaveBeenCalled();
        });

        test('refresh() re-invokes the factory even with unchanged deps', async () => {
            const factory = vi.fn(() => Promise.resolve('value'));

            const { result } = await renderHookAndAct(() =>
                usePromise(factory),
            );
            const callsAfterMount = factory.mock.calls.length;

            const [, refresh] = result.current;

            await act(async () => refresh());

            expect(factory.mock.calls.length).toBeGreaterThan(callsAfterMount);
        });
    });

    describe('rendering states', () => {
        test('shows the resolved data once the promise settles', async () => {
            const factory = () => Promise.resolve('value');

            const { lastFrame } = await renderAndAct(
                <PromiseOwner promise={factory} />,
            );

            expect(lastFrame()).toEqual('value');
        });

        test('shows the Suspense fallback while the promise is pending', async () => {
            const factory = () => new Promise<string>(() => {});

            const { lastFrame } = await renderAndAct(
                <PromiseOwner promise={factory} />,
            );

            expect(lastFrame()).toEqual('loading');
        });

        test('shows an error message caught by the error boundary when the promise rejects', async () => {
            const factory = () => Promise.reject(new Error('boom'));

            const { lastFrame } = await renderAndAct(
                <PromiseOwner promise={factory} />,
            );

            expect(lastFrame()).toEqual('error: boom');
        });
    });

    describe('refresh() races', () => {
        function getDeferredPromise<T>(): [
            promise: Promise<T>,
            resolve: (value: T) => void,
        ] {
            let resolve: (value: T) => void = () => {};
            const promise = new Promise<T>((res) => {
                resolve = res;
            });
            return [promise, resolve];
        }

        test('refresh() keeps the previous value on screen while the new factory call is pending', async () => {
            const factory = vi.fn().mockReturnValue(Promise.resolve('first'));

            const refreshRef = { current: () => {} };

            const { lastFrame } = await renderAndAct(
                <PromiseOwner promise={factory} refreshRef={refreshRef} />,
            );

            // refreshing
            factory.mockReturnValue(new Promise(() => {}));
            await act(async () => refreshRef.current());

            expect(lastFrame()).toEqual('first');
        });

        test('refresh() eventually shows the new factory result once it settles', async () => {
            const factory = vi.fn().mockReturnValue(Promise.resolve('first'));

            const refreshRef = { current: () => {} };

            const { lastFrame } = await renderAndAct(
                <PromiseOwner promise={factory} refreshRef={refreshRef} />,
            );

            const [secondPromise, resolveSecond] = getDeferredPromise<string>();
            factory.mockReturnValue(secondPromise);

            // refreshing
            await act(async () => refreshRef.current());

            // resolving the second promise
            await act(async () => {
                resolveSecond('second');
            });

            expect(lastFrame()).toEqual('second');
        });

        test("a resolved refresh() doesn't get displayed if a second refresh() has been fired", async () => {
            const factory = vi.fn().mockReturnValue(Promise.resolve('first'));

            const refreshRef = { current: () => {} };

            const { lastFrame } = await renderAndAct(
                <PromiseOwner promise={factory} refreshRef={refreshRef} />,
            );

            const [secondPromise, resolveSecond] = getDeferredPromise<string>();
            factory.mockReturnValue(secondPromise);

            // first refresh
            await act(async () => refreshRef.current());

            factory.mockReturnValue(new Promise<string>(() => {})); // never meant to settle

            // second refresh, fired before the first one settles
            await act(async () => refreshRef.current());

            // resolving the first refresh
            await act(async () => resolveSecond('stale'));

            // the first refresh result is discarded
            expect(lastFrame()).toEqual('first');
        });

        test('with two pending refresh() the second one shows if resolved after the first', async () => {
            const factory = vi.fn().mockReturnValue(Promise.resolve('first'));

            const refreshRef = { current: () => {} };

            const { lastFrame } = await renderAndAct(
                <PromiseOwner promise={factory} refreshRef={refreshRef} />,
            );

            const [stalePromise, resolveStale] = getDeferredPromise<string>();
            factory.mockReturnValue(stalePromise);

            // first refresh, still pending
            await act(async () => refreshRef.current());

            const [freshPromise, resolveFresh] = getDeferredPromise<string>();
            factory.mockReturnValue(freshPromise);

            // second refresh, fired before the first one settled
            await act(async () => refreshRef.current());

            await act(async () => resolveStale('stale'));
            await act(async () => resolveFresh('fresh'));

            expect(lastFrame()).toEqual('fresh');
        });

        test('with two pending refresh() the second one shows if resolved before the first', async () => {
            const factory = vi.fn().mockReturnValue(Promise.resolve('first'));

            const refreshRef = { current: () => {} };

            const { lastFrame } = await renderAndAct(
                <PromiseOwner promise={factory} refreshRef={refreshRef} />,
            );

            const [stalePromise, resolveStale] = getDeferredPromise<string>();
            factory.mockReturnValue(stalePromise);

            // first refresh, still pending
            await act(async () => refreshRef.current());

            const [freshPromise, resolveFresh] = getDeferredPromise<string>();
            factory.mockReturnValue(freshPromise);

            // second refresh, fired before the first one settled
            await act(async () => refreshRef.current());

            // fresh resolves first, stale resolves after — resolution order shouldn't matter
            await act(async () => resolveFresh('fresh'));
            await act(async () => resolveStale('stale'));

            expect(lastFrame()).toEqual('fresh');
        });
    });
});
