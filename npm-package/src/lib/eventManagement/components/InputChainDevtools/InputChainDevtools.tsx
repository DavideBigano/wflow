import { Box, Text } from 'ink';
import type { StackElement } from '../InputEventProvider/InputEventProvider.js';

export interface InputChainDevtoolsProps {
    stack: StackElement[];
    /** The listener a keypress would currently be dispatched to first, if any. */
    focused: StackElement | null;
}

const TABLE_HEADER = 'Input Listeners';

/** Dumb, reusable element: lists currently registered input-chain listeners, lowest priority first, highlighting the focused one. */
export function InputChainDevtools({
    stack,
    focused,
}: InputChainDevtoolsProps) {
    const bySequenceAsc = [...stack].sort(
        (a, b) => a.sequenceNumber - b.sequenceNumber,
    );

    return (
        <Box borderStyle="single" flexDirection="column">
            <Box
                borderStyle="single"
                borderTop={false}
                borderLeft={false}
                borderRight={false}
                paddingLeft={1}
                paddingRight={1}
            >
                <Text bold underline>
                    {TABLE_HEADER}
                </Text>
            </Box>
            <Box flexDirection="column" paddingX={1} width="100%">
                {bySequenceAsc.length === 0 && <Text dimColor>(empty)</Text>}
                {bySequenceAsc.map((entry, index) => {
                    const isFocused = entry === focused;
                    return (
                        <Text
                            key={entry.sequenceNumber}
                            color={isFocused ? 'cyan' : undefined}
                        >
                            {isFocused ? '› ' : '  '}
                            {index + 1}
                            {'. '}
                            {entry.name ?? entry.id}
                        </Text>
                    );
                })}
            </Box>
        </Box>
    );
}
