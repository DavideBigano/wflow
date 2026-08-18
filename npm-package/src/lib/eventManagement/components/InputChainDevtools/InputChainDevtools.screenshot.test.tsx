import { render } from 'ink-testing-library';
import { expect, test } from 'vitest';
import { InputChainDevtools } from './InputChainDevtools.js';

const archiverTopic = {
    id: '12345',
    name: 'ArchiverTopic',
    sequenceNumber: 2,
    listener: () => {},
};
const shell = {
    id: 'abcde',
    name: 'Shell',
    sequenceNumber: 0,
    listener: () => {},
};
const runDisplay = {
    id: '1a1a1',
    name: 'RunDisplay',
    sequenceNumber: 3,
    listener: () => {},
};

test('InputChainDevtools lists entries lowest-sequence (lowest priority) first', () => {
    const { lastFrame } = render(
        <InputChainDevtools
            stack={[archiverTopic, shell, runDisplay]}
            focused={null}
        />,
    );

    expect(lastFrame()).toMatchSnapshot();
});

test('InputChainDevtools highlights the focused entry', () => {
    const { lastFrame } = render(
        <InputChainDevtools
            stack={[archiverTopic, shell, runDisplay]}
            focused={runDisplay}
        />,
    );

    expect(lastFrame()).toMatchSnapshot();
});

test('InputChainDevtools renders an empty-state placeholder with no entries', () => {
    const { lastFrame } = render(
        <InputChainDevtools stack={[]} focused={null} />,
    );

    expect(lastFrame()).toMatchSnapshot();
});
