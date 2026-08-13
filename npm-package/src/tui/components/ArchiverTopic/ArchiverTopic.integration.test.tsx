import type { render } from 'ink-testing-library';
import { expect, test, vi } from 'vitest';
import { InputEventProvider } from '../../../lib/inputEventProvider/index.js';
import {
    findActiveId,
    listStashedRuns,
    stashActiveRun,
} from '../../../lib/runArchive.js';
import {
    flush,
    Keys,
    press,
    renderAndSettle,
} from '../../../testUtils/inkTestHelpers.js';
import { ArchiverTopic } from './ArchiverTopic.js';

vi.mock('../../../lib/runArchive.js', () => ({
    findActiveId: vi.fn(),
    listStashedRuns: vi.fn(),
    stashActiveRun: vi.fn(),
    reviveRun: vi.fn(),
}));

/**
 * Renders ArchiverTopic with the given active/stashed runs and settles it
 * past the loading state. Several async hops deep: the mocked run-loading
 * promises resolve, then ArchiverTopic re-renders into 'ready' and attaches
 * its own input listener — each hop needs its own macrotask, so flush more
 * than once.
 */
async function renderReady(
    activeRunId: string | null,
    stashedRunIds: string[],
): Promise<ReturnType<typeof render>> {
    vi.mocked(findActiveId).mockResolvedValue(activeRunId);
    vi.mocked(listStashedRuns).mockResolvedValue(stashedRunIds);

    const rendered = await renderAndSettle(
        <InputEventProvider>
            <ArchiverTopic workspaceRoot="/tmp/ws" />
        </InputEventProvider>,
    );
    await flush();
    await flush();
    await flush();

    return rendered;
}

/** `renderReady` with an active run and two stashed runs, then opens the confirm prompt on the (default-selected) active-run banner. */
async function renderWithConfirmOpen(): Promise<ReturnType<typeof render>> {
    const rendered = await renderReady('run-active', ['run-a', 'run-b']);

    await press(rendered.stdin, Keys.return);

    return rendered;
}

test('an open confirm prompt blocks the run list from moving its selection on the down arrow', async () => {
    const { stdin, lastFrame } = await renderWithConfirmOpen();

    await press(stdin, Keys.down);

    expect(lastFrame()).not.toContain('› run-a');
});

test('an open confirm prompt blocks the run list from moving its selection on the up arrow', async () => {
    const { stdin, lastFrame } = await renderWithConfirmOpen();

    await press(stdin, Keys.up);

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
    await press(stdin, Keys.return);

    expect(stashActiveRun).toHaveBeenCalledOnce();
});

test('focus starts on the banner by default', async () => {
    const { stdin, lastFrame } = await renderReady('run-active', [
        'run-a',
        'run-b',
    ]);

    await press(stdin, Keys.return);

    expect(lastFrame()).toContain(
        'Archive currently running run "run-active"?',
    );
});

test('down through every stashed run then past the last one reaches refresh', async () => {
    const { stdin } = await renderReady('run-active', ['run-a', 'run-b']);
    vi.mocked(findActiveId).mockClear();

    await press(stdin, Keys.down); // banner -> run-a
    await press(stdin, Keys.down); // run-a -> run-b
    await press(stdin, Keys.down); // run-b -> refresh
    await press(stdin, Keys.return);

    expect(findActiveId).toHaveBeenCalledOnce();
});

test('up from refresh re-enters the list', async () => {
    const { stdin, lastFrame } = await renderReady('run-active', [
        'run-a',
        'run-b',
    ]);

    await press(stdin, Keys.down); // banner -> run-a
    await press(stdin, Keys.down); // run-a -> run-b
    await press(stdin, Keys.down); // run-b -> refresh
    await press(stdin, Keys.up); // refresh -> back into the list

    await press(stdin, Keys.return);

    expect(lastFrame()).toContain('Restore "run-b"?');
});

test('up from the list top returns to the banner', async () => {
    const { stdin, lastFrame } = await renderReady('run-active', [
        'run-a',
        'run-b',
    ]);

    await press(stdin, Keys.down); // banner -> run-a
    await press(stdin, Keys.up); // run-a -> banner

    await press(stdin, Keys.return);

    expect(lastFrame()).toContain(
        'Archive currently running run "run-active"?',
    );
});

test('up from the banner wraps straight to refresh', async () => {
    const { stdin } = await renderReady('run-active', ['run-a', 'run-b']);
    vi.mocked(findActiveId).mockClear();

    await press(stdin, Keys.up);
    await press(stdin, Keys.return);

    expect(findActiveId).toHaveBeenCalledOnce();
});

test('down from refresh wraps straight to the banner', async () => {
    const { stdin, lastFrame } = await renderReady('run-active', [
        'run-a',
        'run-b',
    ]);

    await press(stdin, Keys.up); // banner -> refresh (wrap)
    await press(stdin, Keys.down); // refresh -> banner (wrap)
    await press(stdin, Keys.return);

    expect(lastFrame()).toContain(
        'Archive currently running run "run-active"?',
    );
});

test('with no stashed runs, down skips straight from banner to refresh', async () => {
    const { stdin } = await renderReady('run-active', []);
    vi.mocked(findActiveId).mockClear();

    await press(stdin, Keys.down); // banner -> refresh, skipping the empty list
    await press(stdin, Keys.return);

    expect(findActiveId).toHaveBeenCalledOnce();
});

test('with no stashed runs, up from refresh skips straight to the banner', async () => {
    const { stdin, lastFrame } = await renderReady('run-active', []);

    await press(stdin, Keys.up); // banner -> refresh (wrap)
    await press(stdin, Keys.up); // refresh -> banner, skipping the empty list
    await press(stdin, Keys.return);

    expect(lastFrame()).toContain(
        'Archive currently running run "run-active"?',
    );
});

test("'r' triggers a refresh regardless of which row is focused", async () => {
    const { stdin } = await renderReady('run-active', ['run-a']);
    vi.mocked(findActiveId).mockClear();

    await press(stdin, Keys.down); // banner -> run-a

    await press(stdin, 'r');

    expect(findActiveId).toHaveBeenCalledOnce();
});
