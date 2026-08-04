import { render } from 'ink-testing-library';
import { expect, test, vi } from 'vitest';
import { InputEventProvider } from '../../../lib/inputEventProvider/index.js';
import {
    findActiveId,
    listStashedRuns,
    stashActiveRun,
} from '../../../lib/runArchive.js';
import { ArchiverTopic } from './ArchiverTopic.js';

vi.mock('../../../lib/runArchive.js', () => ({
    findActiveId: vi.fn(),
    listStashedRuns: vi.fn(),
    stashActiveRun: vi.fn(),
    reviveRun: vi.fn(),
}));

const UP = '[A';
const DOWN = '[B';
const RETURN = '\r';

function flush() {
    return new Promise((resolve) => setImmediate(resolve));
}

async function press(stdin: ReturnType<typeof render>['stdin'], key: string) {
    stdin.write(key);
    await flush();
}

/**
 * Renders ArchiverTopic with an active run and stashed runs, then opens the
 * confirm prompt on the (default-selected) active-run banner. Several async
 * hops deep: the mocked run-loading promises resolve, then ArchiverTopic
 * re-renders into 'ready', then RunDisplay mounts and reports its initial
 * selection — each hop needs its own macrotask, so flush more than once.
 */
async function renderWithConfirmOpen(): Promise<ReturnType<typeof render>> {
    vi.mocked(findActiveId).mockResolvedValue('run-active');
    vi.mocked(listStashedRuns).mockResolvedValue(['run-a', 'run-b']);

    const rendered = render(
        <InputEventProvider>
            <ArchiverTopic workspaceRoot="/tmp/ws" />
        </InputEventProvider>,
    );
    await flush();
    await flush();
    await flush();

    await press(rendered.stdin, RETURN);

    return rendered;
}

test('an open confirm prompt blocks the run list from moving its selection on the down arrow', async () => {
    const { stdin, lastFrame } = await renderWithConfirmOpen();

    await press(stdin, DOWN);

    expect(lastFrame()).not.toContain('› run-a');
});

test('an open confirm prompt blocks the run list from moving its selection on the up arrow', async () => {
    const { stdin, lastFrame } = await renderWithConfirmOpen();

    await press(stdin, UP);

    expect(lastFrame()).not.toContain('› [refresh]');
});

test('an open confirm prompt blocks the run list from refreshing on r', async () => {
    const { stdin } = await renderWithConfirmOpen();
    vi.mocked(findActiveId).mockClear();

    await press(stdin, 'r');

    expect(findActiveId).not.toHaveBeenCalled();
});

test('an open confirm prompt handles enter itself instead of letting it reach the run list', async () => {
    vi.mocked(stashActiveRun).mockResolvedValue({
        runId: 'run-active',
        movedUnits: [],
    });
    const { stdin } = await renderWithConfirmOpen();

    // the prompt's own "confirm yes" key — must resolve the prompt, not be
    // treated as the run list's own "activate the selected row" key
    await press(stdin, RETURN);

    expect(stashActiveRun).toHaveBeenCalledOnce();
});
