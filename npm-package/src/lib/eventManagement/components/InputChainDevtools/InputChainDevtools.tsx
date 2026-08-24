import { Box, Text } from 'ink';
import { useContext } from 'react';
import { InputEventContext } from '../InputEventProvider/InputEventProvider.js';

const TABLE_HEADER = 'Input Listeners';

/**
 * Lists currently registered input-chain listeners reading from
 * context and highlighting the focused one.
 */
export function InputChainDevtools() {
    const context = useContext(InputEventContext);
    if (!context) {
        throw new Error(
            'useInputListener must be used within an InputEventProvider subtree',
        );
    }

    const { registry, focused } = context;

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
                {registry.current.length === 0 && <Text dimColor>(empty)</Text>}
                {registry.current.map((entry, index) => {
                    const isFocused = entry === focused;
                    return (
                        <Text
                            key={entry.id}
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
