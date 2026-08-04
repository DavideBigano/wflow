import { Box, type BoxProps, Text } from 'ink';
import { useEffect, useState } from 'react';

const DEFAULT_DURATION_MS = 2000;

export interface StatusMessageProps extends BoxProps {
    message: string;
    color?: 'base' | 'error';
    durationMs?: number;
}

/**
 * Reusable element: displays a transient, message that clears itself after
 * `durationMs`, without requiring the caller to clear it back out — setting
 * the same message again (a new object) restarts the timer.
 */
export function StatusMessage({
    message,
    color = 'base',
    durationMs = DEFAULT_DURATION_MS,
    flexDirection: _flexDirection,
    ...boxProps
}: StatusMessageProps) {
    const [displayMessage, setDisplayMessage] = useState<string | null>(
        message,
    );

    useEffect(() => {
        setDisplayMessage(message);
        if (!message) {
            return;
        }
        const timer = setTimeout(() => setDisplayMessage(null), durationMs);
        return () => clearTimeout(timer);
    }, [message, durationMs]);

    if (!displayMessage) {
        return null;
    }

    return (
        <Box flexDirection="column" {...boxProps}>
            <Text color={color === 'base' ? 'green' : 'red'}>
                {displayMessage}
            </Text>
        </Box>
    );
}
