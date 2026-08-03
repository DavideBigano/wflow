import { render } from 'ink-testing-library';
import { expect, test } from 'vitest';
import { TopicTabs } from './TopicTabs.js';
import type { Topic } from './topicRegistry.js';

const topics: Topic[] = [
    { id: 'home', label: 'Home' },
    { id: 'archiver', label: 'Archiver' },
];

test('TopicTabs renders with the archiver tab active', () => {
    const { lastFrame } = render(
        <TopicTabs topics={topics} activeId="archiver" />,
    );

    expect(lastFrame()).toMatchSnapshot();
});

test('TopicTabs renders with the home tab active', () => {
    const { lastFrame } = render(<TopicTabs topics={topics} activeId="home" />);

    expect(lastFrame()).toMatchSnapshot();
});
