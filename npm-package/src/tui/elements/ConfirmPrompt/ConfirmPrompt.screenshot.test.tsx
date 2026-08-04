import { Box } from 'ink';
import { render } from 'ink-testing-library';
import type { ReactNode } from 'react';
import { expect, test } from 'vitest';
import { InputEventProvider } from '../../../lib/inputEventProvider/index.js';
import { ConfirmPrompt } from './ConfirmPrompt.js';

const RIGHT = '[C';

function flush() {
    return new Promise((resolve) => setImmediate(resolve));
}

/** ConfirmPrompt positions itself absolutely, which requires a sized, relatively-positioned ancestor to center within — the role ArchiverTopic normally plays. */
function renderInSizedContainer(children: ReactNode) {
    return render(
        <InputEventProvider>
            <Box position="relative" height={10}>
                {children}
            </Box>
        </InputEventProvider>,
    );
}

test('ConfirmPrompt renders with Yes highlighted by default', () => {
    const { lastFrame } = renderInSizedContainer(
        <ConfirmPrompt
            prompt="Archive it?"
            onConfirm={() => {}}
            onCancel={() => {}}
        />,
    );

    expect(lastFrame()).toMatchSnapshot();
});

test('ConfirmPrompt wraps a prompt too wide for the terminal', () => {
    const longPrompt =
        'Archive currently running run "run-with-a-very-long-identifier-that-does-not-fit-on-one-line-of-a-standard-terminal-window"?';

    const { lastFrame } = renderInSizedContainer(
        <ConfirmPrompt
            prompt={longPrompt}
            onConfirm={() => {}}
            onCancel={() => {}}
        />,
    );

    expect(lastFrame()).toMatchSnapshot();
});

test('ConfirmPrompt switches to No highlighted on right arrow', async () => {
    const { lastFrame, stdin } = renderInSizedContainer(
        <ConfirmPrompt
            prompt="Archive it?"
            onConfirm={() => {}}
            onCancel={() => {}}
        />,
    );
    stdin.write(RIGHT);
    await flush();

    expect(lastFrame()).toMatchSnapshot();
});
