import { Box, Text, useStdout } from 'ink';
import { useState } from 'react';
import { useInputListener } from '../../../lib/inputEventProvider/index.js';

export interface ConfirmPromptProps {
    prompt: string;
    /** Suspends the prompt's own input handling, e.g. while the caller is busy resolving a previous choice. Defaults to true. */
    isActive?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

const HINT = '←/→ or y/n to choose · enter to confirm · esc to cancel';
// '[Yes]    No ' and ' Yes    [No]' are both this many characters.
const CHOICE_LINE_LENGTH = 12;
// 2 border columns + 2 side-padding columns baked into every content line.
const BOX_OVERHEAD = 4;
const FALLBACK_TERMINAL_WIDTH = 80;

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

/** Splits the slack between `width` and `contentLength` into left/right space counts, favoring the right side by one when it's odd. */
export function centerPadding(
    width: number,
    contentLength: number,
): { left: number; right: number } {
    const slack = Math.max(0, width - contentLength);
    const left = Math.floor(slack / 2);
    return { left, right: slack - left };
}

/**
 * Ink's absolute-position boxes don't paint a background — only the glyphs a
 * line actually draws, and that includes `paddingX`, which is pure layout
 * spacing with no glyph behind it. So every row (side padding included) is
 * built as one literal, fully space-padded string, and the box itself carries
 * no padding of its own — otherwise whatever's behind the prompt shows
 * through the gaps.
 */
export function centerLine(text: string, width: number): string {
    const { left, right } = centerPadding(width, text.length);
    return ` ${' '.repeat(left)}${text}${' '.repeat(right)} `;
}

/**
 * Greedily word-wraps `text` so no returned line ever exceeds `maxWidth`. A
 * single word longer than `maxWidth` is hard-broken mid-word — leaving it
 * unbroken would make Ink's own Box wrap it internally instead, at a row Ink
 * manages itself rather than one this module accounted for, misaligning the
 * border painted around it.
 */
export function wrapText(text: string, maxWidth: number): string[] {
    if (maxWidth <= 0) {
        return [text];
    }

    const lines: string[] = [];
    let current = '';
    for (const word of text.split(' ')) {
        let remaining = word;
        while (remaining.length > maxWidth) {
            if (current) {
                lines.push(current);
                current = '';
            }
            lines.push(remaining.slice(0, maxWidth));
            remaining = remaining.slice(maxWidth);
        }

        const candidate = current ? `${current} ${remaining}` : remaining;
        if (candidate.length > maxWidth && current) {
            lines.push(current);
            current = remaining;
        } else {
            current = candidate;
        }
    }
    if (current) {
        lines.push(current);
    }
    return lines;
}

export interface ConfirmPromptLayout {
    contentWidth: number;
    promptLines: string[];
    hintLines: string[];
    /** Total rendered row count, borders included — what a caller needs to reserve so an absolutely-positioned prompt never overflows its container. */
    height: number;
}

/**
 * Computes wrapping/sizing for a given prompt and terminal width — the single
 * source of truth `ConfirmPrompt` renders from and callers can use to reserve
 * enough room for it (see `ArchiverTopic`), so the two never drift apart.
 */
export function getConfirmPromptLayout(
    prompt: string,
    terminalColumns: number,
): ConfirmPromptLayout {
    const maxContentWidth = Math.max(
        CHOICE_LINE_LENGTH,
        (terminalColumns || FALLBACK_TERMINAL_WIDTH) - BOX_OVERHEAD,
    );
    const promptLines = wrapText(prompt, maxContentWidth);
    const hintLines = wrapText(HINT, maxContentWidth);
    const contentWidth = Math.min(
        maxContentWidth,
        Math.max(
            CHOICE_LINE_LENGTH,
            ...promptLines.map((text) => text.length),
            ...hintLines.map((text) => text.length),
        ),
    );
    // borders (2) + choice line (1)
    const height = promptLines.length + hintLines.length + 3;

    return { contentWidth, promptLines, hintLines, height };
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
    const { stdout } = useStdout();

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

    const { contentWidth, promptLines, hintLines } = getConfirmPromptLayout(
        prompt,
        stdout.columns,
    );
    const choicePadding = centerPadding(contentWidth, CHOICE_LINE_LENGTH);

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
                width={contentWidth + BOX_OVERHEAD}
            >
                {keyWrappedLines(promptLines).map(({ key, text }) => (
                    <Text key={key}>{centerLine(text, contentWidth)}</Text>
                ))}
                <Text>
                    {' '}
                    {' '.repeat(choicePadding.left)}
                    {isYesActive ? (
                        <Text color="green" bold>
                            [Yes]
                        </Text>
                    ) : (
                        <Text dimColor> Yes </Text>
                    )}
                    {'   '}
                    {!isYesActive ? (
                        <Text color="red" bold>
                            [No]
                        </Text>
                    ) : (
                        <Text dimColor> No </Text>
                    )}
                    {' '.repeat(choicePadding.right)}{' '}
                </Text>
                {keyWrappedLines(hintLines).map(({ key, text }) => (
                    <Text key={key} dimColor>
                        {centerLine(text, contentWidth)}
                    </Text>
                ))}
            </Box>
        </Box>
    );
}
