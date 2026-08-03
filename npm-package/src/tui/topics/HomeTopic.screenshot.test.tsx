import { render } from 'ink-testing-library';
import { expect, test } from 'vitest';
import { HomeTopic } from './HomeTopic.js';

test('HomeTopic renders the placeholder text', () => {
    const { lastFrame } = render(<HomeTopic />);

    expect(lastFrame()).toMatchSnapshot();
});
