import { render } from 'ink-testing-library';
import React from 'react';
import { expect, test } from 'vitest';
import { TopicTabs } from './TopicTabs.js';
import type { Topic } from './topicRegistry.js';

const topics: Topic[] = [
    { id: 'home', label: 'Home' },
    { id: 'archiver', label: 'Archiver' },
];

test('TopicTabs highlights the active tab with angle brackets', () => {
    const { lastFrame } = render(
        <TopicTabs topics={topics} activeId="archiver" />,
    );

    expect(lastFrame()).toContain('‹ Archiver ›');
});

test('TopicTabs renders an inactive tab in plain form', () => {
    const { lastFrame } = render(
        <TopicTabs topics={topics} activeId="archiver" />,
    );

    expect(lastFrame()).not.toContain('‹ Home ›');
});
