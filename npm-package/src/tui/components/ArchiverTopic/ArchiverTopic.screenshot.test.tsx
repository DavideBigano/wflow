import { expect, test, vi } from 'vitest';
import { InputEventProvider } from '../../../lib/inputEventProvider/index.js';
import { findActiveId, listStashedRuns } from '../../../lib/runArchive.js';
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
 * Several async hops deep: the mocked run-loading promises resolve, then
 * ArchiverTopic re-renders into 'ready', then RunDisplay mounts and attaches
 * its own input listener — each hop needs its own macrotask, so flush more
 * than once.
 */
async function flushLoadFully() {
    await flush();
    await flush();
    await flush();
}

test('ArchiverTopic renders the loading state', async () => {
    vi.mocked(findActiveId).mockReturnValue(new Promise(() => {}));
    vi.mocked(listStashedRuns).mockReturnValue(new Promise(() => {}));

    const { lastFrame } = await renderAndSettle(
        <InputEventProvider>
            <ArchiverTopic workspaceRoot="/tmp/ws" />
        </InputEventProvider>,
    );

    expect(lastFrame()).toMatchSnapshot();
});

test('ArchiverTopic renders the error state', async () => {
    vi.mocked(findActiveId).mockRejectedValue(new Error('disk on fire'));
    vi.mocked(listStashedRuns).mockResolvedValue([]);

    const { lastFrame } = await renderAndSettle(
        <InputEventProvider>
            <ArchiverTopic workspaceRoot="/tmp/ws" />
        </InputEventProvider>,
    );
    await flush();

    expect(lastFrame()).toMatchSnapshot();
});

test('ArchiverTopic renders the empty state', async () => {
    vi.mocked(findActiveId).mockResolvedValue(null);
    vi.mocked(listStashedRuns).mockResolvedValue([]);

    const { lastFrame } = await renderAndSettle(
        <InputEventProvider>
            <ArchiverTopic workspaceRoot="/tmp/ws" />
        </InputEventProvider>,
    );
    await flush();

    expect(lastFrame()).toMatchSnapshot();
});

test('ArchiverTopic renders an active run alongside stashed runs', async () => {
    vi.mocked(findActiveId).mockResolvedValue('run-active');
    vi.mocked(listStashedRuns).mockResolvedValue(['run-a', 'run-b']);

    const { lastFrame } = await renderAndSettle(
        <InputEventProvider>
            <ArchiverTopic workspaceRoot="/tmp/ws" />
        </InputEventProvider>,
    );
    await flush();

    expect(lastFrame()).toMatchSnapshot();
});

test('ArchiverTopic renders no active run alongside stashed runs', async () => {
    vi.mocked(findActiveId).mockResolvedValue(null);
    vi.mocked(listStashedRuns).mockResolvedValue(['run-a', 'run-b']);

    const { lastFrame } = await renderAndSettle(
        <InputEventProvider>
            <ArchiverTopic workspaceRoot="/tmp/ws" />
        </InputEventProvider>,
    );
    await flush();

    expect(lastFrame()).toMatchSnapshot();
});

test('ArchiverTopic renders an active run and no stashed runs', async () => {
    vi.mocked(findActiveId).mockResolvedValue('run-active');
    vi.mocked(listStashedRuns).mockResolvedValue([]);

    const { lastFrame } = await renderAndSettle(
        <InputEventProvider>
            <ArchiverTopic workspaceRoot="/tmp/ws" />
        </InputEventProvider>,
    );
    await flush();

    expect(lastFrame()).toMatchSnapshot();
});

test('ArchiverTopic renders the confirm prompt centered over the run list on enter', async () => {
    vi.mocked(findActiveId).mockResolvedValue('run-active');
    vi.mocked(listStashedRuns).mockResolvedValue([]);

    const { lastFrame, stdin } = await renderAndSettle(
        <InputEventProvider>
            <ArchiverTopic workspaceRoot="/tmp/ws" />
        </InputEventProvider>,
    );
    await flushLoadFully();

    await press(stdin, Keys.return);

    expect(lastFrame()).toMatchSnapshot();
});

test('ArchiverTopic reserves enough room for a confirm prompt taller than the run list, with no bleed-through from the content behind it', async () => {
    // a single unbroken token this long forces getConfirmPromptLayout to
    // hard-wrap it across several rows, growing taller than the (short,
    // empty-stashed-list) run list it's displayed over — regression coverage
    // for a real bug where the reserved overlay height didn't account for
    // this, so the prompt overflowed into the hint text rendered below it.
    const longRunId = 'x'.repeat(300);
    vi.mocked(findActiveId).mockResolvedValue(longRunId);
    vi.mocked(listStashedRuns).mockResolvedValue([]);

    const { lastFrame, stdin } = await renderAndSettle(
        <InputEventProvider>
            <ArchiverTopic workspaceRoot="/tmp/ws" />
        </InputEventProvider>,
    );
    await flushLoadFully();

    await press(stdin, Keys.return);

    const frame = lastFrame() ?? '';
    expect(frame).toContain('↑/↓ select · enter confirm · r refresh');
    expect(frame).toMatchSnapshot();
});
