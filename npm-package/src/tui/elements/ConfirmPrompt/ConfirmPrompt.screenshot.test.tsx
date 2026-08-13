import { Box } from 'ink';
import type { ReactNode } from 'react';
import { expect, test } from 'vitest';
import { InputEventProvider } from '../../../lib/inputEventProvider/index.js';
import {
    Keys,
    press,
    renderAndSettle,
} from '../../../testUtils/inkTestHelpers.js';
import { ConfirmPrompt } from './ConfirmPrompt.js';

/** ConfirmPrompt positions itself absolutely, which requires a sized, relatively-positioned ancestor to center within — the role ArchiverTopic normally plays. */
function renderInSizedContainer(children: ReactNode) {
    return renderAndSettle(
        <InputEventProvider>
            <Box position="relative" height={10}>
                {children}
            </Box>
        </InputEventProvider>,
    );
}

test('ConfirmPrompt renders with Yes highlighted by default', async () => {
    const { lastFrame } = await renderInSizedContainer(
        <ConfirmPrompt
            prompt="Archive it?"
            onConfirm={() => {}}
            onCancel={() => {}}
        />,
    );

    expect(lastFrame()).toMatchSnapshot();
});

test('ConfirmPrompt wraps a prompt too wide for the terminal', async () => {
    const longPrompt =
        'Archive currently running run "run-with-a-very-long-identifier-that-does-not-fit-on-one-line-of-a-standard-terminal-window"?';

    const { lastFrame } = await renderInSizedContainer(
        <ConfirmPrompt
            prompt={longPrompt}
            onConfirm={() => {}}
            onCancel={() => {}}
        />,
    );

    expect(lastFrame()).toMatchSnapshot();
});

test('ConfirmPrompt switches to No highlighted on right arrow', async () => {
    const { lastFrame, stdin } = await renderInSizedContainer(
        <ConfirmPrompt
            prompt="Archive it?"
            onConfirm={() => {}}
            onCancel={() => {}}
        />,
    );
    await press(stdin, Keys.right);

    expect(lastFrame()).toMatchSnapshot();
});
