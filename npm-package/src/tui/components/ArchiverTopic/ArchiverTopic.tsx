import { Box, Text } from 'ink';
import { useCallback, useEffect, useState } from 'react';
import {
    findActiveId,
    listStashedRuns,
    reviveRun,
    stashActiveRun,
} from '../../../lib/runArchive.js';
import { describeError } from '../../../lib/wflowError.js';
import { ConfirmPrompt } from '../../elements/ConfirmPrompt/ConfirmPrompt.js';
import { StatusMessage } from '../../elements/StatusMessage/StatusMessage.js';
import { RunDisplay } from '../RunDisplay/RunDisplay.js';

const VIEWPORT = 12;

type Status = 'loading' | 'ready' | 'error' | 'busy';

export interface ArchiverTopicProps {
    workspaceRoot: string;
}

/** Smart, bespoke component: owns run listing/archiving state for the archiver tab. */
export function ArchiverTopic({ workspaceRoot }: ArchiverTopicProps) {
    const [status, setStatus] = useState<Status>('loading');
    const [activeRunId, setActiveRunId] = useState<string | null>(null);
    const [stashedRunIds, setStashedRunIds] = useState<string[]>([]);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [selectedRow, setSelectedRow] = useState<string | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const load = useCallback(async () => {
        setStatus('loading');
        try {
            const [runningId, stashedIds] = await Promise.all([
                findActiveId(workspaceRoot),
                listStashedRuns(workspaceRoot),
            ]);
            setActiveRunId(runningId);
            setStashedRunIds(stashedIds);
            setStatus('ready');
        } catch (error) {
            setStatusMessage(describeError(error));
            setStatus('error');
        }
    }, [workspaceRoot]);

    useEffect(() => {
        load();
    }, [load]);

    const onActivate = useCallback((rowId: string) => {
        setSelectedRow(rowId);
        setConfirmOpen(true);
    }, []);

    const onRefresh = useCallback(async () => {
        await load();
        setStatusMessage('Refreshed runs');
    }, [load]);

    const onConfirm = useCallback(async () => {
        setStatus('busy');
        let message: string | null = null;
        try {
            if (selectedRow === null) {
                message = '';
            } else if (selectedRow === activeRunId) {
                const result = await stashActiveRun(workspaceRoot);
                message = `archived "${result.runId}"`;
            } else if (stashedRunIds.includes(selectedRow)) {
                const result = await reviveRun(workspaceRoot, selectedRow, {
                    autoStash: true,
                });
                message = result.stashedRunId
                    ? `Auto-archived "${result.stashedRunId}", restored "${result.revivedRunId}"`
                    : `Restored "${result.revivedRunId}"`;
            }
            await load();
        } catch (error) {
            message = describeError(error);
            setStatus('error');
        } finally {
            setConfirmOpen(false);
        }
        setStatus('ready');
        setStatusMessage(message);
    }, [selectedRow, workspaceRoot, load, activeRunId, stashedRunIds]);

    const onCancel = useCallback(() => {
        setConfirmOpen(false);
    }, []);

    const confirmMessage =
        selectedRow === activeRunId
            ? `Archive currently running run "${selectedRow}"?`
            : selectedRow && stashedRunIds.includes(selectedRow)
              ? `Restore "${selectedRow}"?${activeRunId ? ' (auto-archives the active run first)' : ''}`
              : '';

    return (
        <Box flexDirection="column">
            {status === 'loading' && <Text dimColor>Loading…</Text>}

            {status === 'error' && (
                <Text color="red">Oops...something went wrong.</Text>
            )}

            {status === 'ready' && (
                <>
                    <Box flexDirection="column">
                        <RunDisplay
                            activeRunId={activeRunId}
                            stashedRunIds={stashedRunIds}
                            viewport={VIEWPORT}
                            onActivate={onActivate}
                            onRefresh={onRefresh}
                        />

                        {confirmOpen && (
                            <ConfirmPrompt
                                prompt={confirmMessage}
                                onConfirm={onConfirm}
                                onCancel={onCancel}
                            />
                        )}
                    </Box>

                    <Text dimColor>↑/↓ select · enter confirm · r refresh</Text>
                </>
            )}

            <StatusMessage message={statusMessage ?? ''} marginTop={1} />
        </Box>
    );
}
