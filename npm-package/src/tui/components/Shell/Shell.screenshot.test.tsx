import { render } from 'ink-testing-library';
import { expect, test } from 'vitest';
import { InputEventProvider } from '../../../lib/inputEventProvider/index.js';
import { Shell } from './Shell.js';

test('Shell renders the home tab by default', () => {
    const { lastFrame } = render(
        <InputEventProvider>
            <Shell workspaceRoot="/tmp/ws" />
        </InputEventProvider>,
    );

    expect(lastFrame()).toMatchSnapshot();
});
