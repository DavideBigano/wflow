import type { render } from 'ink-testing-library';
import { expect, test, vi } from 'vitest';
import { InputEventProvider } from '../../../lib/inputEventProvider/index.js';
import { findActiveId, listStashedRuns } from '../../../lib/runArchive.js';
import {
    Keys,
    flush,
    press,
    renderAndSettle as renderOnce,
} from '../../../testUtils/inkTestHelpers.js';
import type { TopicTabsProps } from '../../elements/TopicTabs/TopicTabs.js';

vi.mock('../../../lib/runArchive.js', () => ({
    findActiveId: vi.fn(),
    listStashedRuns: vi.fn(),
    stashActiveRun: vi.fn(),
    reviveRun: vi.fn(),
}));

const { topicTabsSpy } = vi.hoisted(() => ({
    topicTabsSpy: vi.fn(),
}));

vi.mock('../../elements/TopicTabs/TopicTabs.js', () => ({
    TopicTabs: (props: TopicTabsProps) => {
        topicTabsSpy(props);
        return null;
    },
}));

const { Shell } = await import('./Shell.js');

/**
 * Several async hops deep: the mocked run-loading promises resolve, then
 * ArchiverTopic re-renders into 'ready', then RunDisplay mounts and attaches
 * its own input listener — each hop needs its own macrotask, so flush more
 * than once.
 */
async function renderAndSettle(
    ...args: Parameters<typeof render>
): Promise<ReturnType<typeof render>> {
    const result = await renderOnce(...args);
    await flush();
    await flush();
    return result;
}

test('an open confirm prompt blocks Shell from switching tabs on the left arrow', async () => {
    vi.mocked(findActiveId).mockResolvedValue('run-active');
    vi.mocked(listStashedRuns).mockResolvedValue([]);

    const { stdin, lastFrame } = await renderAndSettle(
        <InputEventProvider>
            <Shell workspaceRoot="/tmp/ws" initialTopicId="archiver" />
        </InputEventProvider>,
    );

    // opens the confirm prompt on the active-run banner, selected by default
    await press(stdin, Keys.return);
    expect(lastFrame()).toContain('Archive currently running run');

    // the left arrow is the prompt's own "select yes" key while it's open —
    // it must not also reach Shell's tab-cycling listener beneath it
    await press(stdin, Keys.left);

    expect(topicTabsSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ activeId: 'archiver' }),
    );
});

test('the left arrow switches tabs normally when no confirm prompt is open', async () => {
    vi.mocked(findActiveId).mockResolvedValue(null);
    vi.mocked(listStashedRuns).mockResolvedValue([]);

    const { stdin } = await renderAndSettle(
        <InputEventProvider>
            <Shell workspaceRoot="/tmp/ws" initialTopicId="archiver" />
        </InputEventProvider>,
    );

    await press(stdin, Keys.left);

    expect(topicTabsSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ activeId: 'home' }),
    );
});
