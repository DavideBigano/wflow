import { render } from 'ink-testing-library';
import { expect, test, vi } from 'vitest';
import { InputEventProvider } from '../../../lib/inputEventProvider/index.js';
import { RunDisplay } from './RunDisplay.js';

test('RunDisplay renders the active run and stashed runs', () => {
    const { lastFrame } = render(
        <InputEventProvider>
            <RunDisplay
                activeRunId="run-active"
                stashedRunIds={['run-a', 'run-b']}
                viewport={5}
                onActivate={vi.fn()}
                onRefresh={vi.fn()}
            />
        </InputEventProvider>,
    );

    expect(lastFrame()).toMatchSnapshot();
});

test('RunDisplay renders no active run and no stashed runs correctly', () => {
    const { lastFrame } = render(
        <InputEventProvider>
            <RunDisplay
                activeRunId={null}
                stashedRunIds={[]}
                viewport={5}
                onActivate={vi.fn()}
                onRefresh={vi.fn()}
            />
        </InputEventProvider>,
    );

    expect(lastFrame()).toMatchSnapshot();
});

test('RunDisplay renders no active run and stashed runs correctly', () => {
    const { lastFrame } = render(
        <InputEventProvider>
            <RunDisplay
                activeRunId={null}
                stashedRunIds={['run-a', 'run-b']}
                viewport={5}
                onActivate={vi.fn()}
                onRefresh={vi.fn()}
            />
        </InputEventProvider>,
    );

    expect(lastFrame()).toMatchSnapshot();
});

test('RunDisplay renders active run and no stashed runs correctly', () => {
    const { lastFrame } = render(
        <InputEventProvider>
            <RunDisplay
                activeRunId="run-active"
                stashedRunIds={[]}
                viewport={5}
                onActivate={vi.fn()}
                onRefresh={vi.fn()}
            />
        </InputEventProvider>,
    );

    expect(lastFrame()).toMatchSnapshot();
});
