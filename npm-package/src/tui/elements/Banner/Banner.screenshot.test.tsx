import { render } from 'ink-testing-library';
import { expect, test, vi } from 'vitest';
import { InputEventProvider } from '../../../lib/inputEventProvider/index.js';
import { Banner } from './Banner.js';

test('Banner renders an item, highlighted', () => {
    const { lastFrame } = render(
        <InputEventProvider>
            <Banner
                label="Running"
                item="run-42"
                highlighted={true}
                onActivate={vi.fn()}
            />
        </InputEventProvider>,
    );

    expect(lastFrame()).toMatchSnapshot();
});

test('Banner renders an item, not highlighted', () => {
    const { lastFrame } = render(
        <InputEventProvider>
            <Banner
                label="Running"
                item="run-42"
                highlighted={false}
                onActivate={vi.fn()}
            />
        </InputEventProvider>,
    );

    expect(lastFrame()).toMatchSnapshot();
});

test('Banner renders the placeholder when there is no item', () => {
    const { lastFrame } = render(
        <InputEventProvider>
            <Banner
                label="Running"
                item={null}
                highlighted={false}
                onActivate={vi.fn()}
            />
        </InputEventProvider>,
    );

    expect(lastFrame()).toMatchSnapshot();
});
