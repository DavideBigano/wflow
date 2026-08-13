import { render } from 'ink-testing-library';
import { act } from 'react';

// React's `act` refuses to flush anything unless the environment opts in —
// vitest's node environment doesn't set this itself the way
// `@testing-library/react`'s setup does.
(
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const ESC = '';

/**
 * Raw stdin bytes for the keys these components actually listen for.
 * Centralized because ink reports arrow/control keys as ANSI escape
 * sequences (`ESC [ <letter>`), not as printable characters — spelling one
 * out by hand at each call site is easy to get subtly wrong (dropping the
 * `ESC` prefix silently turns an arrow key into a plain `[`/letter) and
 * gives no hint what key it represents.
 */
export const Keys = {
    up: `${ESC}[A`,
    down: `${ESC}[B`,
    left: `${ESC}[D`,
    right: `${ESC}[C`,
    return: '\r',
    escape: ESC,
} as const;

/**
 * Waits out one macrotask turn — long enough for an already-settled promise
 * chain (e.g. a mocked async load) to run its `.then`s — then lets React
 * flush whatever effects that produced. For state changes driven purely by
 * React itself (a keypress, a prop change), prefer {@link press} or
 * {@link renderAndSettle}, which wrap the triggering call in `act` directly;
 * reach for `flush` when waiting on work `act` can't see because it didn't
 * happen inside its callback (e.g. a mocked fetch resolving on its own).
 */
export async function flush(): Promise<void> {
    await act(async () => {
        await new Promise((resolve) => setImmediate(resolve));
    });
}

/**
 * Renders `children` via ink-testing-library and lets every effect the
 * mount triggers (including `useInputListener`'s raw-mode registration)
 * settle before returning.
 */
export async function renderAndSettle(
    ...args: Parameters<typeof render>
): Promise<ReturnType<typeof render>> {
    let result!: ReturnType<typeof render>;
    await act(async () => {
        result = render(...args);
    });
    return result;
}

/**
 * Writes `key` to `stdin` and lets every effect the resulting update
 * triggers settle before returning — including the input chain's own
 * listener-ref sync, so the *next* `press` (or assertion) never observes a
 * stale closure. Accepts a raw string or one of {@link Keys}.
 */
export async function press(
    stdin: ReturnType<typeof render>['stdin'],
    key: string,
): Promise<void> {
    await act(async () => {
        stdin.write(key);
    });
}

/** Calls `rerender` (from a `renderAndSettle` result) with a new tree and lets the resulting effects settle before returning. */
export async function rerenderAndSettle(
    rerender: ReturnType<typeof render>['rerender'],
    tree: Parameters<ReturnType<typeof render>['rerender']>[0],
): Promise<void> {
    await act(async () => {
        rerender(tree);
    });
}
