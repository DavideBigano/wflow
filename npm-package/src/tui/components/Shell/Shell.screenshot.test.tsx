import { render } from 'ink-testing-library';
import { expect, test } from 'vitest';
import { Shell } from './Shell.js';

test('Shell renders the home tab by default', () => {
    const { lastFrame } = render(<Shell workspaceRoot="/tmp/ws" />);

    expect(lastFrame()).toMatchSnapshot();
});
