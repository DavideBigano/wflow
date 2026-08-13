import { Box, Text } from 'ink';
import { useInputListener } from '../../../lib/inputEventProvider/index.js';

export interface BannerProps {
    /** Optional listener id that can be provided to focus the banner */
    id?: string;
    label: string;
    item: string | null;
    placeholder?: string;
    /** Whether Banner currently holds focus — purely a rendering hint (border/marker); doesn't gate input handling. */
    highlighted: boolean;
    /** Called with `item` when Enter is pressed while this row is focused and `item` is non-null. */
    onActivate: (item: string) => void;
}

/**
 * Smart, reusable element: single-item banner row. Has no up/down bounds of
 * its own to intercept — that's left entirely to an ancestor (see
 * `RunDisplay`) — so it only handles Enter.
 */
export function Banner({
    id,
    label,
    item,
    placeholder = 'none',
    highlighted,
    onActivate,
}: BannerProps) {
    useInputListener(
        (_input, key, stopPropagation) => {
            if (key.return && item) {
                stopPropagation();
                onActivate(item);
            }
        },
        { id },
    );

    return (
        <Box
            borderStyle="single"
            borderColor={highlighted ? 'cyan' : undefined}
            paddingX={1}
        >
            <Text>
                {highlighted ? '› ' : '  '}
                {label}:{' '}
                {item ? (
                    <Text color="green">{item}</Text>
                ) : (
                    <Text dimColor>{placeholder}</Text>
                )}
            </Text>
        </Box>
    );
}
