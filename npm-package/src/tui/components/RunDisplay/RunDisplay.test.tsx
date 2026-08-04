import { render } from 'ink-testing-library';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { BannerProps } from '../../elements/Banner/Banner.js';
import type { ListProps } from '../../elements/List/List.js';

const { bannerSpy, listSpy } = vi.hoisted(() => ({
    bannerSpy: vi.fn(),
    listSpy: vi.fn(),
}));

vi.mock('../../elements/Banner/Banner.js', () => ({
    Banner: (props: BannerProps) => {
        bannerSpy(props);
        return null;
    },
}));

vi.mock('../../elements/List/List.js', () => ({
    List: (props: ListProps) => {
        listSpy(props);
        return null;
    },
}));

const { InputEventProvider } = await import(
    '../../../lib/inputEventProvider/index.js'
);
const { RunDisplay } = await import('./RunDisplay.js');

const UP = '[A';
const DOWN = '[B';
const RETURN = '\r';

/** ink attaches its raw-mode input listener in an effect after mount, and useInput updates state asynchronously; flush a macrotask to let both settle. */
function flush() {
    return new Promise((resolve) => setImmediate(resolve));
}

async function renderAndSettle(
    ...args: Parameters<typeof render>
): Promise<ReturnType<typeof render>> {
    const result = render(...args);
    await flush();
    return result;
}

async function press(stdin: ReturnType<typeof render>['stdin'], key: string) {
    stdin.write(key);
    await flush();
}

beforeEach(() => {
    bannerSpy.mockClear();
    listSpy.mockClear();
});

describe('default selection', () => {
    test('selects the active run by default', async () => {
        await renderAndSettle(
            <InputEventProvider>
                <RunDisplay
                    activeRunId="run-active"
                    stashedRunIds={['run-a', 'run-b']}
                    viewport={5}
                    onActivate={vi.fn()}
                    onRefresh={vi.fn()}
                />
            </InputEventProvider>,
        );

        expect(bannerSpy).toHaveBeenLastCalledWith(
            expect.objectContaining({ highlighted: true }),
        );
        expect(listSpy).toHaveBeenLastCalledWith(
            expect.objectContaining({ selectedIndex: -1 }),
        );
    });

    test('selects the empty banner by default when there is no active run', async () => {
        await renderAndSettle(
            <InputEventProvider>
                <RunDisplay
                    activeRunId={null}
                    stashedRunIds={['run-a', 'run-b']}
                    viewport={5}
                    onActivate={vi.fn()}
                    onRefresh={vi.fn()}
                />
            </InputEventProvider>,
        );

        expect(bannerSpy).toHaveBeenLastCalledWith(
            expect.objectContaining({ highlighted: true }),
        );
        expect(listSpy).toHaveBeenLastCalledWith(
            expect.objectContaining({ selectedIndex: -1 }),
        );
    });
});

describe('down arrow', () => {
    test('moves the selection into the list (empty banner)', async () => {
        const { stdin } = await renderAndSettle(
            <InputEventProvider>
                <RunDisplay
                    activeRunId={null}
                    stashedRunIds={['run-a', 'run-b']}
                    viewport={5}
                    onActivate={vi.fn()}
                    onRefresh={vi.fn()}
                />
            </InputEventProvider>,
        );
        bannerSpy.mockClear();
        listSpy.mockClear();

        await press(stdin, DOWN);

        expect(bannerSpy).toHaveBeenLastCalledWith(
            expect.objectContaining({ highlighted: false }),
        );
        expect(listSpy).toHaveBeenLastCalledWith(
            expect.objectContaining({ selectedIndex: 0 }),
        );
    });

    test('moves the selection into the list (active run)', async () => {
        const { stdin } = await renderAndSettle(
            <InputEventProvider>
                <RunDisplay
                    activeRunId="run-active"
                    stashedRunIds={['run-a', 'run-b']}
                    viewport={5}
                    onActivate={vi.fn()}
                    onRefresh={vi.fn()}
                />
            </InputEventProvider>,
        );
        bannerSpy.mockClear();
        listSpy.mockClear();

        await press(stdin, DOWN);

        expect(bannerSpy).toHaveBeenLastCalledWith(
            expect.objectContaining({ highlighted: false }),
        );
        expect(listSpy).toHaveBeenLastCalledWith(
            expect.objectContaining({ selectedIndex: 0 }),
        );
    });

    test('goes straight from the banner to refresh when there are no stashed runs', async () => {
        const { stdin, lastFrame } = await renderAndSettle(
            <InputEventProvider>
                <RunDisplay
                    activeRunId="run-active"
                    stashedRunIds={[]}
                    viewport={5}
                    onActivate={vi.fn()}
                    onRefresh={vi.fn()}
                />
            </InputEventProvider>,
        );
        bannerSpy.mockClear();

        await press(stdin, DOWN);

        expect(bannerSpy).toHaveBeenLastCalledWith(
            expect.objectContaining({ highlighted: false }),
        );
        // the refresh row isn't a prop on a mocked element, so assert on rendered text
        expect(lastFrame()).toContain('› [refresh]');
    });

    test('wraps from refresh back to the banner', async () => {
        const { stdin } = await renderAndSettle(
            <InputEventProvider>
                <RunDisplay
                    activeRunId="run-active"
                    stashedRunIds={['run-a']}
                    viewport={5}
                    onActivate={vi.fn()}
                    onRefresh={vi.fn()}
                />
            </InputEventProvider>,
        );

        await press(stdin, DOWN);
        await press(stdin, DOWN);
        bannerSpy.mockClear();

        await press(stdin, DOWN);

        expect(bannerSpy).toHaveBeenLastCalledWith(
            expect.objectContaining({ highlighted: true }),
        );
    });
});

describe('up arrow', () => {
    test('moves the selection back up (empty banner)', async () => {
        const { stdin } = await renderAndSettle(
            <InputEventProvider>
                <RunDisplay
                    activeRunId={null}
                    stashedRunIds={['run-a', 'run-b']}
                    viewport={5}
                    onActivate={vi.fn()}
                    onRefresh={vi.fn()}
                />
            </InputEventProvider>,
        );
        await press(stdin, DOWN);
        await press(stdin, DOWN);
        listSpy.mockClear();

        await press(stdin, UP);

        expect(listSpy).toHaveBeenLastCalledWith(
            expect.objectContaining({ selectedIndex: 0 }),
        );
    });

    test('moves the selection back up (active run)', async () => {
        const { stdin } = await renderAndSettle(
            <InputEventProvider>
                <RunDisplay
                    activeRunId="run-active"
                    stashedRunIds={['run-a', 'run-b']}
                    viewport={5}
                    onActivate={vi.fn()}
                    onRefresh={vi.fn()}
                />
            </InputEventProvider>,
        );
        await press(stdin, DOWN);
        await press(stdin, DOWN);
        listSpy.mockClear();

        await press(stdin, UP);

        expect(listSpy).toHaveBeenLastCalledWith(
            expect.objectContaining({ selectedIndex: 0 }),
        );
    });

    test('wraps from the banner up to refresh', async () => {
        const { stdin, lastFrame } = await renderAndSettle(
            <InputEventProvider>
                <RunDisplay
                    activeRunId="run-active"
                    stashedRunIds={['run-a', 'run-b']}
                    viewport={5}
                    onActivate={vi.fn()}
                    onRefresh={vi.fn()}
                />
            </InputEventProvider>,
        );
        bannerSpy.mockClear();

        await press(stdin, UP);

        expect(bannerSpy).toHaveBeenLastCalledWith(
            expect.objectContaining({ highlighted: false }),
        );
        // the refresh row isn't a prop on a mocked element, so assert on rendered text
        expect(lastFrame()).toContain('› [refresh]');
    });

    test('goes straight from refresh back to the banner when there are no stashed runs', async () => {
        const { stdin } = await renderAndSettle(
            <InputEventProvider>
                <RunDisplay
                    activeRunId="run-active"
                    stashedRunIds={[]}
                    viewport={5}
                    onActivate={vi.fn()}
                    onRefresh={vi.fn()}
                />
            </InputEventProvider>,
        );
        await press(stdin, DOWN);
        bannerSpy.mockClear();

        await press(stdin, UP);

        expect(bannerSpy).toHaveBeenLastCalledWith(
            expect.objectContaining({ highlighted: true }),
        );
    });
});

describe('onActivate', () => {
    test('is called with the active run id when Enter is pressed on the active-run banner', async () => {
        const onActivate = vi.fn();
        const { stdin } = await renderAndSettle(
            <InputEventProvider>
                <RunDisplay
                    activeRunId="run-active"
                    stashedRunIds={['run-a', 'run-b']}
                    viewport={5}
                    onActivate={onActivate}
                    onRefresh={vi.fn()}
                />
            </InputEventProvider>,
        );

        await press(stdin, RETURN);

        expect(onActivate).toHaveBeenLastCalledWith('run-active');
    });

    test('is called with the stashed row id when Enter is pressed on it', async () => {
        const onActivate = vi.fn();
        const { stdin } = await renderAndSettle(
            <InputEventProvider>
                <RunDisplay
                    activeRunId="run-active"
                    stashedRunIds={['run-a', 'run-b']}
                    viewport={5}
                    onActivate={onActivate}
                    onRefresh={vi.fn()}
                />
            </InputEventProvider>,
        );
        await press(stdin, DOWN);

        await press(stdin, RETURN);

        expect(onActivate).toHaveBeenLastCalledWith('run-a');
    });

    test('is not called when Enter is pressed on the empty banner (no active run)', async () => {
        const onActivate = vi.fn();
        const { stdin } = await renderAndSettle(
            <InputEventProvider>
                <RunDisplay
                    activeRunId={null}
                    stashedRunIds={['run-a', 'run-b']}
                    viewport={5}
                    onActivate={onActivate}
                    onRefresh={vi.fn()}
                />
            </InputEventProvider>,
        );

        await press(stdin, RETURN);

        expect(onActivate).not.toHaveBeenCalled();
    });
});

describe('onRefresh', () => {
    test('is called when pressing r', async () => {
        const onRefresh = vi.fn();
        const { stdin } = await renderAndSettle(
            <InputEventProvider>
                <RunDisplay
                    activeRunId="run-active"
                    stashedRunIds={['run-a', 'run-b']}
                    viewport={5}
                    onActivate={vi.fn()}
                    onRefresh={onRefresh}
                />
            </InputEventProvider>,
        );

        await press(stdin, 'r');

        expect(onRefresh).toHaveBeenCalledOnce();
    });

    test('is called when pressing enter on the refresh row', async () => {
        const onRefresh = vi.fn();
        const { stdin } = await renderAndSettle(
            <InputEventProvider>
                <RunDisplay
                    activeRunId="run-active"
                    stashedRunIds={['run-a', 'run-b']}
                    viewport={5}
                    onActivate={vi.fn()}
                    onRefresh={onRefresh}
                />
            </InputEventProvider>,
        );
        await press(stdin, UP);

        await press(stdin, RETURN);

        expect(onRefresh).toHaveBeenCalledOnce();
    });
});
