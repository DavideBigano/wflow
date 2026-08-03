import { render } from 'ink-testing-library';
import { expect, test } from 'vitest';
import { ConfirmPrompt } from './ConfirmPrompt.js';

test('ConfirmPrompt renders the given prompt text', () => {
    const { lastFrame } = render(
        <ConfirmPrompt prompt="Archive it?" isYesActive={true} />,
    );

    expect(lastFrame()).toContain('Archive it?');
});

test('ConfirmPrompt brackets [Yes] when isYesActive is true', () => {
    const { lastFrame } = render(
        <ConfirmPrompt prompt="Archive it?" isYesActive={true} />,
    );

    expect(lastFrame()).toContain('[Yes]');
});

test('ConfirmPrompt brackets [No] when isYesActive is false', () => {
    const { lastFrame } = render(
        <ConfirmPrompt prompt="Archive it?" isYesActive={false} />,
    );

    expect(lastFrame()).toContain('[No]');
});
