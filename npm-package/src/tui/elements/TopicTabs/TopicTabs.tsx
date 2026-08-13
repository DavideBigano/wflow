import { Box, Text } from 'ink';
import type { Topic, TopicId } from '../../topicRegistry.js';

export interface TopicTabsProps {
    topics: Topic[];
    activeId: TopicId;
}

/** Dumb, reusable element: renders a horizontal tab strip from injected props, owns no state. */
export function TopicTabs({ topics, activeId }: TopicTabsProps) {
    return (
        <Box>
            {topics.map((topic) => (
                <Box key={topic.id} marginRight={2}>
                    <Text
                        color={topic.id === activeId ? 'cyan' : undefined}
                        bold={topic.id === activeId}
                    >
                        {topic.id === activeId
                            ? `‹ ${topic.label} ›`
                            : `  ${topic.label}  `}
                    </Text>
                </Box>
            ))}
            <Text dimColor>(←/→ switch tabs)</Text>
        </Box>
    );
}
