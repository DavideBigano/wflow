import { render } from 'ink-testing-library';
import { expect, test, vi } from 'vitest';
import { findRunningId, listStashedRuns } from '../../lib/runArchive.js';
import { ArchiverTopic } from './ArchiverTopic.js';

vi.mock('../../lib/runArchive.js', () => ({
    findRunningId: vi.fn(),
    listStashedRuns: vi.fn(),
    stashRunningRun: vi.fn(),
    reviveRun: vi.fn(),
}));

/** Lets the initial load effect's promises settle before reading the frame. */
async function flushLoad() {
    await new Promise((resolve) => setImmediate(resolve));
}

test('ArchiverTopic renders the empty state', async () => {
    vi.mocked(findRunningId).mockResolvedValue(null);
    vi.mocked(listStashedRuns).mockResolvedValue([]);

    const { lastFrame } = render(
        <ArchiverTopic workspaceRoot="/tmp/ws" onModalStateChange={() => {}} />,
    );
    await flushLoad();

    expect(lastFrame()).toMatchSnapshot();
});

test('ArchiverTopic renders an active run alongside stashed runs', async () => {
    vi.mocked(findRunningId).mockResolvedValue('run-active');
    vi.mocked(listStashedRuns).mockResolvedValue(['run-a', 'run-b']);

    const { lastFrame } = render(
        <ArchiverTopic workspaceRoot="/tmp/ws" onModalStateChange={() => {}} />,
    );
    await flushLoad();

    expect(lastFrame()).toMatchSnapshot();
});
