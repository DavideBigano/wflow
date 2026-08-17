import {
    act,
    type RenderHookOptions,
    type RenderHookResult,
    renderHook,
} from '@testing-library/react';

export interface RenderHookAndActResult<Result, Props> {
    result: RenderHookResult<Result, Props>['result'];
    rerender: (props: Props) => Promise<void>;
    unmount: RenderHookResult<Result, Props>['unmount'];
}

/**
 * Renders a hook using react's own testing api `renderHook` then calls
 * the `act` api to flush the pending commits and microtasks. Returns
 * a `rerender` function pre-wrapped in another `act` call.
 */
export async function renderHookAndAct<Result, Props>(
    callback: (props: Props) => Result,
    options?: RenderHookOptions<Props>,
): Promise<RenderHookAndActResult<Result, Props>> {
    let rendered!: RenderHookResult<Result, Props>;
    await act(async () => {
        rendered = renderHook(callback, {
            ...options,
        });
    });
    return {
        result: rendered.result,
        rerender: (props) => act(async () => rendered.rerender(props)),
        unmount: rendered.unmount,
    };
}
