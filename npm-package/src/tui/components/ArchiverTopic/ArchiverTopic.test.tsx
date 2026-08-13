import { beforeEach, expect, test, vi } from 'vitest';
import {
    InputEventProvider,
    useInputListener,
} from '../../../lib/inputEventProvider/index.js';
import {
    flush,
    Keys,
    press,
    renderAndSettle,
} from '../../../testUtils/inkTestHelpers.js';
import type { BannerProps } from '../../elements/Banner/Banner.js';
import type { ButtonProps } from '../../elements/Button/Button.js';
import type { ListProps } from '../../elements/List/List.js';

const { bannerSpy, listSpy, buttonSpy } = vi.hoisted(() => ({
    bannerSpy: vi.fn(),
    listSpy: vi.fn(),
    buttonSpy: vi.fn(),
}));

// Each mock still registers a (no-op) listener under the given `id`, matching
// the real element — `focus(id)` throws if the id isn't a listener actually
// on the stack, so a bare `return null` stub isn't enough once ArchiverTopic
// moves focus by id instead of by relative steps.
vi.mock('../../elements/Banner/Banner.js', () => ({
    Banner: (props: BannerProps) => {
        bannerSpy(props);
        useInputListener(() => {}, { id: props.id });
        return null;
    },
}));

vi.mock('../../elements/List/List.js', () => ({
    List: (props: ListProps) => {
        listSpy(props);
        useInputListener(() => {}, { id: props.id });
        return null;
    },
}));

vi.mock('../../elements/Button/Button.js', () => ({
    Button: (props: ButtonProps) => {
        buttonSpy(props);
        useInputListener(() => {}, { id: props.id });
        return null;
    },
}));

vi.mock('../../../lib/runArchive.js', () => ({
    findActiveId: vi.fn(),
    listStashedRuns: vi.fn(),
    stashActiveRun: vi.fn(),
    reviveRun: vi.fn(),
}));

const { findActiveId, listStashedRuns } = await import(
    '../../../lib/runArchive.js'
);
const { ArchiverTopic } = await import('./ArchiverTopic.js');

beforeEach(() => {
    bannerSpy.mockClear();
    listSpy.mockClear();
    buttonSpy.mockClear();
});

/**
 * Renders ArchiverTopic with the given active/stashed runs and settles it
 * past the loading state. Several async hops deep: the mocked run-loading
 * promises resolve, then ArchiverTopic re-renders into 'ready', then the run
 * display mounts and attaches its own input listener — each hop needs its
 * own macrotask, so flush more than once.
 */
async function renderReady(
    activeRunId: string | null,
    stashedRunIds: string[],
) {
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

test('passes the active run through to Banner', async () => {
    await renderReady('run-active', ['run-a']);

    expect(bannerSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ item: 'run-active' }),
    );
});

test('passes the stashed run ids and viewport through to List', async () => {
    await renderReady('run-active', ['run-a', 'run-b']);

    expect(listSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ items: ['run-a', 'run-b'], viewport: 12 }),
    );
});

test('Banner is highlighted by default', async () => {
    await renderReady('run-active', ['run-a']);

    expect(bannerSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ highlighted: true }),
    );
    expect(listSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ initialSelectedIndex: null }),
    );
    expect(buttonSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ highlighted: false }),
    );
});

test('down-arrow moves highlight from banner to list', async () => {
    const { stdin } = await renderReady('run-active', ['run-a']);

    await press(stdin, Keys.down);

    expect(listSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ initialSelectedIndex: 0 }),
    );
});

test('down-arrow skips straight to refresh when there are no stashed runs', async () => {
    const { stdin } = await renderReady('run-active', []);

    await press(stdin, Keys.down);

    expect(buttonSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ highlighted: true }),
    );
});

test('up-arrow from banner wraps straight to refresh', async () => {
    const { stdin } = await renderReady('run-active', ['run-a']);

    await press(stdin, Keys.up);

    expect(buttonSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ highlighted: true }),
    );
});

test('calls onRefresh when pressing r, regardless of which row would be focused', async () => {
    const { stdin } = await renderReady('run-active', ['run-a']);
    vi.mocked(findActiveId).mockClear();

    await press(stdin, 'r');

    expect(findActiveId).toHaveBeenCalledOnce();
});
