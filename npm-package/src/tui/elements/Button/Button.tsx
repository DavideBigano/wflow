import { Box, type BoxProps, Text } from 'ink';
import { useInputListener } from '../../../lib/inputEventProvider/index.js';

export interface ButtonProps extends BoxProps {
    /** Optional listener id that can be provided to focus the banner */
    id?: string;
    /** Label shown for the button. */
    text: string;
    /** Whether Button currently holds focus — purely a rendering hint (brackets/color); doesn't gate input handling. */
    highlighted: boolean;
    /** Called when Enter is pressed while this button is focused. */
    onSelection: () => void;
}

/**
 * Smart, reusable element: a single selectable row. Has no bounds of its own
 * to intercept — up/down are left entirely untouched for an ancestor to
 * interpret — it only handles Enter.
 */
export function Button({
    id,
    text,
    highlighted,
    onSelection,
    ...boxProps
}: ButtonProps) {
    useInputListener(
        (_input, key, stopPropagation) => {
            if (key.return) {
                stopPropagation();
                onSelection();
            }
        },
        { id },
    );

    return (
        <Box {...boxProps}>
            <Text color={highlighted ? 'cyan' : undefined}>
                {highlighted ? `[${text}]` : ` ${text} `}
            </Text>
        </Box>
    );
}
