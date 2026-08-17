import { render } from '@testing-library/react';
import { act } from 'react';

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

render;
