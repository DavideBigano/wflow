import { Box, Text } from 'ink';
import { useState } from 'react';
import { useInputListener } from '../../../lib/inputEventProvider/index.js';

export interface ConfirmPromptProps {
    prompt: string;
    /** Suspends the prompt's own input handling, e.g. while the caller is busy resolving a previous choice. Defaults to true. */
    isActive?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

const CHOICE_LINE_Y = '[Yes]    No ';
const CHOICE_LINE_N = ' Yes    [No]';

/** Pairs each line with a key that stays unique even when hard-wrapping repeats the same chunk of text (e.g. a run id of all the same character). */
export function keyWrappedLines(
    lines: string[],
): { key: string; text: string }[] {
    const seenCount = new Map<string, number>();
    return lines.map((text) => {
        const count = (seenCount.get(text) ?? 0) + 1;
        seenCount.set(text, count);
        return { key: `${text}#${count}`, text };
    });
}

/**
 * Smart, reusable element: owns its yes/no selection and, while active, swallows
 * every key via `stopPropagation` so nothing behind it (e.g. Shell's tab
 * cycling) ever sees them. Resolves by calling `onConfirm` or `onCancel`.
 * Wraps and re-centers its text if the terminal is too narrow for it.
 */
export function ConfirmPrompt({
    prompt,
    onConfirm,
    onCancel,
}: ConfirmPromptProps) {
    const [isYesActive, setIsYesActive] = useState(true);

    useInputListener((input, key, stopPropagation) => {
        if (key.leftArrow || input === 'y') {
            setIsYesActive(true);
        } else if (key.rightArrow || input === 'n') {
            setIsYesActive(false);
        } else if (key.return) {
            if (isYesActive) {
                onConfirm();
            } else {
                onCancel();
            }
        } else if (key.escape) {
            onCancel();
        }
        stopPropagation();
    });

    const promptLiness = prompt.split(' ');

    return (
        <Box
            position="absolute"
            width="100%"
            height="100%"
            alignItems="center"
            justifyContent="center"
        >
            <Box
                borderStyle="round"
                borderColor="yellow"
                flexDirection="column"
                // width={contentWidth + BOX_OVERHEAD}
                backgroundColor="black"
                alignItems="center"
            >
                <Box
                    flexWrap="wrap"
                    flexDirection="row"
                    justifyContent="center"
                    paddingBottom={1}
                >
                    {keyWrappedLines(promptLiness).map(({ key, text }) => (
                        <Text key={key} dimColor>
                            {`${text} `}
                        </Text>
                    ))}
                </Box>
                <Text>{isYesActive ? CHOICE_LINE_Y : CHOICE_LINE_N}</Text>
                <Box
                    flexWrap="wrap"
                    flexDirection="row"
                    justifyContent="center"
                    paddingTop={1}
                >
                    <Text>{'←/→ or y/n to choose '}</Text>
                    <Text>{'· '}</Text>
                    <Text>{'enter to confirm '}</Text>
                    <Text>{'· '}</Text>
                    <Text>{'esc to cancel '}</Text>
                </Box>
            </Box>
        </Box>
    );
}
