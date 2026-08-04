import { Box, useApp } from 'ink';
import { useCallback, useState } from 'react';
import { useInputListener } from '../../../lib/inputEventProvider/index.js';
import { TopicTabs } from '../../elements/TopicTabs/TopicTabs.js';
import { TOPICS, type TopicId } from '../../topicRegistry.js';
import { ArchiverTopic } from '../ArchiverTopic/ArchiverTopic.js';
import { HomeTopic } from '../HomeTopic/HomeTopic.js';

export interface ShellProps {
    workspaceRoot: string;
    initialTopicId?: TopicId;
}

/**
 * Smart, bespoke component: owns the active tab and handles global left/right
 * tab-switching. Registers on the shared input chain (see InputEventProvider)
 * at the root, so any nested listener registered later — e.g. a topic's own
 * confirm prompt — outranks it automatically and can swallow keys first.
 */
export function Shell({ workspaceRoot, initialTopicId = 'home' }: ShellProps) {
    const { exit } = useApp();
    const [activeTopicId, setActiveTopicId] = useState<TopicId>(initialTopicId);

    const cycleTopic = useCallback(
        (direction: 1 | -1) => {
            const currentIndex = TOPICS.findIndex(
                (topic) => topic.id === activeTopicId,
            );
            const nextIndex =
                (currentIndex + direction + TOPICS.length) % TOPICS.length;
            setActiveTopicId(TOPICS[nextIndex].id);
        },
        [activeTopicId],
    );

    useInputListener((input, key) => {
        if (key.leftArrow) {
            cycleTopic(-1);
        } else if (key.rightArrow) {
            cycleTopic(1);
        } else if (key.escape || input === 'q') {
            exit();
        }
    });

    return (
        <Box flexDirection="column">
            <TopicTabs topics={TOPICS} activeId={activeTopicId} />
            {activeTopicId === 'home' && <HomeTopic />}
            {activeTopicId === 'archiver' && (
                <ArchiverTopic workspaceRoot={workspaceRoot} />
            )}
        </Box>
    );
}
