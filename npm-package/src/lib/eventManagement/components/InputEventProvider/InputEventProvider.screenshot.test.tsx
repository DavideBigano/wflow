import { Box, Text } from 'ink';
import { describe, expect, test } from 'vitest';
import { renderAndAct } from '../../../../testUtils/inkRenderAndAct.js';
import { Listener } from '../../testUtils/Listener.js';
import { InputEventProvider } from './InputEventProvider.js';

describe('InputEventProvider', () => {
    test('renders children with no devtools panel by default', async () => {
        const { lastFrame } = await renderAndAct(
            <InputEventProvider>
                <Listener inputOptions={{ id: 'list1' }} autofocus>
                    <Text>Hello</Text>
                </Listener>
            </InputEventProvider>,
        );

        expect(lastFrame()).toMatchSnapshot();
    });

    test('renders the devtools panel alongside children when showDevtools is true', async () => {
        const { lastFrame } = await renderAndAct(
            <InputEventProvider showDevtools>
                <Listener inputOptions={{ id: 'list1', name: 'Listener' }} autofocus>
                    <Text>Hello</Text>
                </Listener>
            </InputEventProvider>,
        );

        expect(lastFrame()).toMatchSnapshot();
    });

    test('children fill the remaining width up to the devtools panel', async () => {
        const { lastFrame } = await renderAndAct(
            <InputEventProvider showDevtools>
                <Listener inputOptions={{ id: 'list1', name: 'Listener' }} autofocus>
                    <Box borderStyle="single" width="100%">
                        <Text>Hello</Text>
                    </Box>
                </Listener>
            </InputEventProvider>,
        );

        expect(lastFrame()).toMatchSnapshot();
    });
});
