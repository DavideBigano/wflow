import { render } from 'ink-testing-library';
import { expect, test } from 'vitest';
import { InputChainDevtools } from './InputChainDevtools.js';

test('InputChainDevtools lists entries lowest-sequence (lowest priority) first', () => {
    const { lastFrame } = render(
        <InputChainDevtools
            stack={[
                { name: 'ArchiverTopic', sequence: 2 },
                { name: 'Shell', sequence: 0 },
                { name: 'RunDisplay', sequence: 3 },
            ]}
        />,
    );

    expect(lastFrame()).toMatchSnapshot();
});

test('InputChainDevtools renders an empty-state placeholder with no entries', () => {
    const { lastFrame } = render(<InputChainDevtools stack={[]} />);

    expect(lastFrame()).toMatchSnapshot();
});
