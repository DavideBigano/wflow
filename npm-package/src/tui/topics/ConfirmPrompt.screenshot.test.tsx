import { render } from 'ink-testing-library';
import { expect, test } from 'vitest';
import { ConfirmPrompt } from './ConfirmPrompt.js';

test('ConfirmPrompt renders with Yes highlighted', () => {
    const { lastFrame } = render(
        <ConfirmPrompt prompt="Archive it?" isYesActive={true} />,
    );

    expect(lastFrame()).toMatchSnapshot();
});

test('ConfirmPrompt renders with No highlighted', () => {
    const { lastFrame } = render(
        <ConfirmPrompt prompt="Archive it?" isYesActive={false} />,
    );

    expect(lastFrame()).toMatchSnapshot();
});
