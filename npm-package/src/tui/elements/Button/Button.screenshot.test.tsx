import { render } from 'ink-testing-library';
import { expect, test, vi } from 'vitest';
import { InputEventProvider } from '../../../lib/inputEventProvider/index.js';
import { Button } from './Button.js';

test('Button renders not highlighted', () => {
    const { lastFrame } = render(
        <InputEventProvider>
            <Button text="refresh" highlighted={false} onSelection={vi.fn()} />
        </InputEventProvider>,
    );

    expect(lastFrame()).toMatchSnapshot();
});

test('Button renders highlighted', () => {
    const { lastFrame } = render(
        <InputEventProvider>
            <Button text="refresh" highlighted={true} onSelection={vi.fn()} />
        </InputEventProvider>,
    );

    expect(lastFrame()).toMatchSnapshot();
});
