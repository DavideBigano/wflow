import { render } from 'ink-testing-library';
import { expect, test } from 'vitest';
import { StatusMessage } from './StatusMessage.js';

function wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

test('StatusMessage renders nothing when message is empty', () => {
    const { lastFrame } = render(<StatusMessage message="" />);

    expect(lastFrame()).toBe('');
});

test('StatusMessage renders the given message', () => {
    const { lastFrame } = render(<StatusMessage message='archived "run-a"' />);

    expect(lastFrame()).toMatchSnapshot();
});

test('StatusMessage renders an error message in red', () => {
    const { lastFrame } = render(
        <StatusMessage message="disk on fire" color="error" />,
    );

    expect(lastFrame()).toMatchSnapshot();
});

test('StatusMessage clears itself after durationMs elapses', async () => {
    const { lastFrame } = render(
        <StatusMessage message="refreshed" durationMs={10} />,
    );

    await wait(30);

    expect(lastFrame()).toBe('');
});

test('StatusMessage restarts its timer when given a new message before clearing', async () => {
    const { lastFrame, rerender } = render(
        <StatusMessage message="first" durationMs={30} />,
    );
    await wait(15);
    rerender(<StatusMessage message="second" durationMs={30} />);
    await wait(15);

    expect(lastFrame()).toContain('second');
});
