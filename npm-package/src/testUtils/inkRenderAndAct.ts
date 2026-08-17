import { render } from 'ink-testing-library';
import { act } from 'react';

// React's `act` refuses to flush anything unless the environment opts in —
// vitest's node environment doesn't set this itself the way
// `@testing-library/react`'s setup does.
(
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Customized render function that uses ink's own `render` then calls
 * the React's `act` api to flush the pending commits and microtasks.
 * Returns a `rerender` function pre-wrapped in another `act` call.
 */
export async function renderAndAct(
    ...args: Parameters<typeof render>
): Promise<ReturnType<typeof render>> {
    let rendered!: ReturnType<typeof render>;
    await act(async () => {
        rendered = render(...args);
    });
    return {
        ...rendered,
        rerender: (props) => act(async () => rendered.rerender(props)),
    };
}
