import { Box, Text } from 'ink';
import React from 'react';

export interface ConfirmPromptProps {
    prompt: string;
    isYesActive: boolean;
}

/** Dumb, reusable element: pure presentational yes/no prompt, no state of its own. */
export function ConfirmPrompt({ prompt, isYesActive }: ConfirmPromptProps) {
    return (
        <Box
            borderStyle="round"
            borderColor="yellow"
            paddingX={1}
            flexDirection="column"
        >
            <Text>{prompt}</Text>
            <Text>
                {isYesActive ? (
                    <Text color="green" bold>
                        [Yes]
                    </Text>
                ) : (
                    <Text dimColor>Yes</Text>
                )}
                {'   '}
                {!isYesActive ? (
                    <Text color="red" bold>
                        [No]
                    </Text>
                ) : (
                    <Text dimColor>No</Text>
                )}
            </Text>
            <Text dimColor>
                ←/→ or y/n to choose · enter to confirm · esc to cancel
            </Text>
        </Box>
    );
}
