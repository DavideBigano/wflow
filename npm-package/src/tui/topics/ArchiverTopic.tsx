import { Box, Text, useInput } from 'ink';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    findRunningId,
    listStashedRuns,
    reviveRun,
    stashRunningRun,
} from '../../lib/runArchive.js';
import { describeError } from '../../lib/wflowError.js';
import { ConfirmPrompt } from './ConfirmPrompt.js';

type ArchiverRow =
    | { kind: 'active'; runId: string }
    | { kind: 'stashed'; runId: string }
    | { kind: 'refresh' };

const VIEWPORT = 12;

type LoadPhase = 'loading' | 'ready' | 'error';

export interface ArchiverTopicProps {
    workspaceRoot: string;
    /** Lets the shell suspend its own left/right tab-switching while this topic's confirm prompt owns those keys. */
    onModalStateChange: (open: boolean) => void;
}

/** Smart, bespoke component: owns run listing/archiving state for the archiver tab. */
export function ArchiverTopic({
    workspaceRoot,
    onModalStateChange,
}: ArchiverTopicProps) {
    const [phase, setPhase] = useState<LoadPhase>('loading');
    const [activeRunId, setActiveRunId] = useState<string | null>(null);
    const [stashedRunIds, setStashedRunIds] = useState<string[]>([]);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [selected, setSelected] = useState(0);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmYes, setConfirmYes] = useState(true);

    const load = useCallback(async () => {
        try {
            const [runningId, stashedIds] = await Promise.all([
                findRunningId(workspaceRoot),
                listStashedRuns(workspaceRoot),
            ]);
            setActiveRunId(runningId);
            setStashedRunIds(stashedIds);
            setLoadError(null);
            setPhase('ready');
        } catch (error) {
            setLoadError(describeError(error));
            setPhase('error');
        }
    }, [workspaceRoot]);

    useEffect(() => {
        load();
    }, [load]);

    const rows: ArchiverRow[] = useMemo(
        () => [
            ...(activeRunId
                ? ([{ kind: 'active', runId: activeRunId }] as ArchiverRow[])
                : []),
            ...stashedRunIds.map(
                (runId): ArchiverRow => ({ kind: 'stashed', runId }),
            ),
            { kind: 'refresh' },
        ],
        [activeRunId, stashedRunIds],
    );

    useEffect(() => {
        setSelected((current) =>
            Math.max(0, Math.min(current, rows.length - 1)),
        );
    }, [rows.length]);

    useEffect(() => {
        onModalStateChange(confirmOpen);
    }, [confirmOpen, onModalStateChange]);

    const closeConfirm = useCallback(() => {
        setConfirmOpen(false);
        setConfirmYes(true);
    }, []);

    const refresh = useCallback(async () => {
        setBusy(true);
        setStatusMessage(null);
        await load();
        setStatusMessage('refreshed');
        setBusy(false);
    }, [load]);

    const executeConfirm = useCallback(async () => {
        if (!confirmYes) {
            closeConfirm();
            return;
        }

        const row = rows[selected];
        if (!row || row.kind === 'refresh') {
            closeConfirm();
            return;
        }

        setBusy(true);
        try {
            if (row.kind === 'active') {
                const result = await stashRunningRun(workspaceRoot);
                setStatusMessage(`archived "${result.runId}"`);
            } else {
                const result = await reviveRun(workspaceRoot, row.runId, {
                    autoStash: true,
                });
                setStatusMessage(
                    result.stashedRunId
                        ? `auto-archived "${result.stashedRunId}", restored "${result.revivedRunId}"`
                        : `restored "${result.revivedRunId}"`,
                );
            }
            await load();
        } catch (error) {
            setStatusMessage(describeError(error));
        } finally {
            setBusy(false);
            closeConfirm();
        }
    }, [confirmYes, rows, selected, workspaceRoot, load, closeConfirm]);

    useInput((input, key) => {
        if (busy) return;

        if (confirmOpen) {
            if (key.leftArrow || input === 'y') setConfirmYes(true);
            else if (key.rightArrow || input === 'n') setConfirmYes(false);
            else if (key.return) void executeConfirm();
            else if (key.escape) closeConfirm();
            return;
        }

        if (input === 'r') void refresh();
        else if (key.upArrow)
            setSelected((current) => Math.max(0, current - 1));
        else if (key.downArrow)
            setSelected((current) => Math.min(rows.length - 1, current + 1));
        else if (key.return && rows[selected]?.kind === 'refresh')
            void refresh();
        else if (key.return && rows.length > 0) {
            setStatusMessage(null);
            setConfirmYes(true);
            setConfirmOpen(true);
        }
    });

    if (phase === 'loading') {
        return <Text dimColor>loading…</Text>;
    }

    if (phase === 'error') {
        return (
            <Box flexDirection="column">
                <Text color="red">{loadError}</Text>
            </Box>
        );
    }

    const isActiveSelected = activeRunId !== null && selected === 0;
    const isRefreshSelected = selected === rows.length - 1;
    const stashedSelectedIndex = activeRunId ? selected - 1 : selected;
    const scrollOffset = computeScrollOffset(
        Math.min(stashedSelectedIndex, Math.max(stashedRunIds.length - 1, 0)),
        stashedRunIds.length,
        VIEWPORT,
    );
    const visible = stashedRunIds.slice(scrollOffset, scrollOffset + VIEWPORT);

    const selectedRow = rows[selected];
    const confirmMessage =
        selectedRow?.kind === 'active'
            ? `Archive currently running run "${selectedRow.runId}"?`
            : selectedRow?.kind === 'stashed'
              ? `Restore "${selectedRow.runId}"?${activeRunId ? ' (auto-archives the running run first)' : ''}`
              : '';

    return (
        <Box flexDirection="column">
            <Box
                borderStyle="single"
                borderColor={isActiveSelected ? 'cyan' : undefined}
                paddingX={1}
                marginBottom={1}
            >
                <Text>
                    {isActiveSelected ? '› ' : '  '}
                    Running:{' '}
                    {activeRunId ? (
                        <Text color="green">{activeRunId}</Text>
                    ) : (
                        <Text dimColor>none</Text>
                    )}
                </Text>
            </Box>

            <Box flexDirection="column" marginBottom={1}>
                {stashedRunIds.length === 0 && (
                    <Text dimColor>no archived runs</Text>
                )}

                {scrollOffset > 0 && (
                    <Text dimColor>↑ {scrollOffset} more</Text>
                )}

                {visible.map((runId, i) => {
                    const realIndex = scrollOffset + i;
                    const isSelected =
                        !isActiveSelected &&
                        !isRefreshSelected &&
                        realIndex === stashedSelectedIndex;
                    return (
                        <Text
                            key={runId}
                            color={isSelected ? 'cyan' : undefined}
                        >
                            {isSelected ? '› ' : '  '}
                            {runId}
                        </Text>
                    );
                })}

                {scrollOffset + VIEWPORT < stashedRunIds.length && (
                    <Text dimColor>
                        ↓ {stashedRunIds.length - scrollOffset - VIEWPORT} more
                    </Text>
                )}

                <Text color={isRefreshSelected ? 'cyan' : undefined}>
                    {isRefreshSelected ? '› ' : '  '}
                    {'[refresh]'}
                </Text>
            </Box>

            {confirmOpen && (
                <ConfirmPrompt
                    prompt={confirmMessage}
                    isYesActive={confirmYes}
                />
            )}

            {!confirmOpen && statusMessage && (
                <Text dimColor>{statusMessage}</Text>
            )}
            {busy && <Text dimColor>working…</Text>}

            <Text dimColor>↑/↓ select · enter confirm · r refresh</Text>
        </Box>
    );
}

/** Centers a fixed-size viewport window around the selected index within [0, total). */
function computeScrollOffset(
    selectedIndex: number,
    total: number,
    viewport: number,
): number {
    if (total <= viewport) return 0;
    const centered = selectedIndex - Math.floor(viewport / 2);
    return Math.max(0, Math.min(centered, total - viewport));
}
