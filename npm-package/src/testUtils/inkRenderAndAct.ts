import { render } from 'ink-testing-library';
import { act } from 'react';

// React's `act` refuses to flush anything unless the environment opts in —
// vitest's node environment doesn't set this itself the way
// `@testing-library/react`'s setup does.
(
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

export type Simplify<T> = { [K in keyof T]: T[K] } & {};

type InkTestInstance = ReturnType<typeof render>;

type InkRerender = InkTestInstance['rerender'];

interface NewInstance extends InkTestInstance {
    rerender: (...args: Parameters<InkRerender>) => Promise<void>;
    press: (keypress: Keys | string) => Promise<void>;
}

type Instance = Simplify<NewInstance>;

const ESC = '';

/**
 * Raw ANSI escape sequences for keys used in the app.
 */
export const Keys = {
    up: `${ESC}[A`,
    down: `${ESC}[B`,
    left: `${ESC}[D`,
    right: `${ESC}[C`,
    return: '\r',
    escape: ESC,
    shift: `${ESC}[Z`,
} as const;

type Keys = (typeof Keys)[keyof typeof Keys];

/**
 * Customized render function that uses ink's own `render` then calls
 * the React's `act` api to flush the pending commits and microtasks.
 * Returns a `rerender` function pre-wrapped in another `act` call.
 * It also returns a `press` function that wraps `stdin.write` in
 * another `act` call.
 */
export async function renderAndAct(
    ...args: Parameters<typeof render>
): Promise<Instance> {
    let rendered!: InkTestInstance;
    await act(async () => {
        rendered = render(...args);
    });
    return {
        ...rendered,
        rerender: async (tree) =>
            await act(async () => rendered.rerender(tree)),
        press: async (keypress) =>
            await act(async () => rendered.stdin.write(keypress)),
    };
}
