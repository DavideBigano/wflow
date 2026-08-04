import { Box, Text } from 'ink';

export interface InputChainDevtoolsProps {
    stack: { name: string; sequence: number }[];
}

/** Dumb, reusable element: lists currently registered input-chain listeners, lowest priority first. */
export function InputChainDevtools({ stack }: InputChainDevtoolsProps) {
    const bySequenceAsc = [...stack].sort((a, b) => a.sequence - b.sequence);

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
                    {'Input Listeners'}
                </Text>
            </Box>
            <Box flexDirection="column" paddingX={1}>
                {bySequenceAsc.length === 0 && <Text dimColor>(empty)</Text>}
                {bySequenceAsc.map((entry, index) => (
                    <Text key={entry.sequence}>
                        {index + 1}
                        {'. '}
                        {entry.name}
                    </Text>
                ))}
            </Box>
        </Box>
    );
}
