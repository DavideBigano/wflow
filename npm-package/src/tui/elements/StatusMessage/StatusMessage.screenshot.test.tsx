import { expect, test } from 'vitest';
import {
    rerenderAndSettle,
    renderAndSettle,
} from '../../../testUtils/inkTestHelpers.js';
import { StatusMessage } from './StatusMessage.js';

function wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

test('StatusMessage renders nothing when message is empty', async () => {
    const { lastFrame } = await renderAndSettle(<StatusMessage message="" />);

    expect(lastFrame()).toBe('');
});

test('StatusMessage renders the given message', async () => {
    const { lastFrame } = await renderAndSettle(
        <StatusMessage message='archived "run-a"' />,
    );

    expect(lastFrame()).toMatchSnapshot();
});

test('StatusMessage renders an error message in red', async () => {
    const { lastFrame } = await renderAndSettle(
        <StatusMessage message="disk on fire" color="error" />,
    );

    expect(lastFrame()).toMatchSnapshot();
});

test('StatusMessage clears itself after durationMs elapses', async () => {
    const { lastFrame } = await renderAndSettle(
        <StatusMessage message="refreshed" durationMs={10} />,
    );

    await wait(30);

    expect(lastFrame()).toBe('');
});

test('StatusMessage restarts its timer when given a new message before clearing', async () => {
    const { lastFrame, rerender } = await renderAndSettle(
        <StatusMessage message="first" durationMs={30} />,
    );
    await wait(15);
    await rerenderAndSettle(
        rerender,
        <StatusMessage message="second" durationMs={30} />,
    );
    await wait(15);

    expect(lastFrame()).toContain('second');
});
