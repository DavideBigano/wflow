import { Box, Text } from 'ink';

export interface BannerProps {
    label: string;
    item: string | null;
    highlighted: boolean;
    placeholder?: string;
}

/** Dumb, reusable element: single-item banner row with position marker and highlight border, injected props only. */
export function Banner({
    label,
    item,
    highlighted,
    placeholder = 'none',
}: BannerProps) {
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
