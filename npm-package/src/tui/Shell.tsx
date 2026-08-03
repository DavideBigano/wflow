import { Box, useApp, useInput } from 'ink';
import { useCallback, useState } from 'react';
import { TopicTabs } from './TopicTabs.js';
import { TOPICS, type TopicId } from './topicRegistry.js';
import { ArchiverTopic } from './topics/ArchiverTopic.js';
import { HomeTopic } from './topics/HomeTopic.js';

export interface ShellProps {
    workspaceRoot: string;
    initialTopicId?: TopicId;
}

/**
 * Smart, bespoke component: owns the active tab and arbitrates global
 * left/right tab-switching against a topic's own use of those keys (e.g. a
 * yes/no confirm prompt) by suspending itself while that topic reports a modal open.
 */
export function Shell({ workspaceRoot, initialTopicId = 'home' }: ShellProps) {
    const { exit } = useApp();
    const [activeTopicId, setActiveTopicId] = useState<TopicId>(initialTopicId);
    const [modalOpen, setModalOpen] = useState(false);

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

    useInput(
        (input, key) => {
            if (key.leftArrow) cycleTopic(-1);
            else if (key.rightArrow) cycleTopic(1);
            else if (key.escape || input === 'q') exit();
        },
        { isActive: !modalOpen },
    );

    return (
        <Box flexDirection="column">
            <TopicTabs topics={TOPICS} activeId={activeTopicId} />
            {activeTopicId === 'home' && <HomeTopic />}
            {activeTopicId === 'archiver' && (
                <ArchiverTopic
                    workspaceRoot={workspaceRoot}
                    onModalStateChange={setModalOpen}
                />
            )}
        </Box>
    );
}
