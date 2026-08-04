import { render } from 'ink-testing-library';
import { expect, test } from 'vitest';
import { Banner } from './Banner.js';

test('Banner renders an item, highlighted', () => {
    const { lastFrame } = render(
        <Banner label="Running" item={'run-42'} highlighted />,
    );

    expect(lastFrame()).toMatchSnapshot();
});

test('Banner renders an item, not highlighted', () => {
    const { lastFrame } = render(
        <Banner label="Running" item={'run-42'} highlighted={false} />,
    );

    expect(lastFrame()).toMatchSnapshot();
});

test('Banner renders the placeholder when there is no item', () => {
    const { lastFrame } = render(
        <Banner label="Running" item={null} highlighted={false} />,
    );

    expect(lastFrame()).toMatchSnapshot();
});
