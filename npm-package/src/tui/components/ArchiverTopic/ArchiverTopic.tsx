import { Box, Text } from 'ink';
import { useEffect, useId, useState } from 'react';
import {
    useFocusControls,
    useInputListener,
} from '../../../lib/inputEventProvider/index.js';
import {
    findActiveId,
    listStashedRuns,
    reviveRun,
    stashActiveRun,
} from '../../../lib/runArchive.js';
import { describeError } from '../../../lib/wflowError.js';
import { Banner } from '../../elements/Banner/Banner.js';
import { Button } from '../../elements/Button/Button.js';
import { ConfirmPrompt } from '../../elements/ConfirmPrompt/ConfirmPrompt.js';
import { List } from '../../elements/List/List.js';
import { StatusMessage } from '../../elements/StatusMessage/StatusMessage.js';

const VIEWPORT = 12;

type Status = 'loading' | 'ready' | 'error' | 'busy';
type FocusedRegion = 'banner' | 'list' | 'refresh';

export interface ArchiverTopicProps {
    workspaceRoot: string;
}

/**
 * Smart, bespoke component: owns run listing/archiving state for the
 * archiver tab, plus all focus movement between the active-run Banner,
 * stashed-run List, and refresh Button once loaded. `focusedRegion` is
 * tracked only to decide which row renders highlighted. `List` intercepts
 * only up/down *within* its own items and otherwise leaves input untouched;
 * `Banner` and `Button` leave all up/down untouched too (neither has any
 * "bounds" of its own) — all three fall through to this component's own
 * listener, sitting below them in the stack.
 *
 * Known gap: `List` sits *below* `Button` in the stack, so it stays reachable
 * even while `Button` holds focus — an in-bounds up/down press on the refresh
 * button can be intercepted by `List`'s own boundary logic before it reaches
 * here. Not addressed yet.
 */
export function ArchiverTopic({ workspaceRoot }: ArchiverTopicProps) {
    const [status, setStatus] = useState<Status>('loading');
    const [activeRunId, setActiveRunId] = useState<string | null>(null);
    const [stashedRunIds, setStashedRunIds] = useState<string[]>([]);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [selectedRow, setSelectedRow] = useState<string | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [focusedRegion, setFocusedRegion] = useState<FocusedRegion>('banner');
    const [listSelectedIdx, setListSelectedIdx] = useState<number | null>(null);
    const hasStashedRuns = stashedRunIds.length > 0;
    const { focus } = useFocusControls();
    const bannerId = useId();
    const listId = useId();
    const refreshId = useId();

    async function load(workspaceRoot: string) {
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
    }

    // biome-ignore lint/correctness/useExhaustiveDependencies: intentional to trigger the effect only on root change
    useEffect(() => {
        load(workspaceRoot);
    }, [workspaceRoot]);

    async function onActivate(rowId: string) {
        setSelectedRow(rowId);
        setConfirmOpen(true);
    }

    async function onRefresh() {
        await load(workspaceRoot);
        setStatusMessage('Refreshed runs');
    }

    async function onConfirm() {
        setStatus('busy');
        let message: string = '';
        try {
            if (selectedRow === activeRunId) {
                const result = await stashActiveRun(workspaceRoot);
                message = `archived "${result.runId}"`;
            } else if (selectedRow && stashedRunIds.includes(selectedRow)) {
                const result = await reviveRun(workspaceRoot, selectedRow, {
                    autoStash: true,
                });
                message = result.stashedRunId
                    ? `Auto-archived "${result.stashedRunId}", restored "${result.revivedRunId}"`
                    : `Restored "${result.revivedRunId}"`;
            }
            await load(workspaceRoot);
        } catch (error) {
            message = describeError(error);
            setStatus('error');
        } finally {
            setConfirmOpen(false);
        }
        setStatus('ready');
        setStatusMessage(message);
    }

    const confirmMessage =
        selectedRow === activeRunId
            ? `Archive currently running run "${selectedRow}"?`
            : selectedRow && stashedRunIds.includes(selectedRow)
              ? `Restore "${selectedRow}"?${activeRunId ? ' (auto-archives the active run first)' : ''}`
              : '';

    // Only handles input once the run list is actually on screen (`status ===
    // 'ready'`) — mirrors the lifecycle the old, separately-mounted
    // RunDisplay component had, where the listener didn't exist at all
    // outside that window.
    useInputListener(
        (input, key, stopPropagation) => {
            if (input === 'r') {
                stopPropagation();
                onRefresh();
                return;
            }

            if (key.upArrow) {
                stopPropagation();
                if (focusedRegion === 'banner') {
                    focus(refreshId);
                    setFocusedRegion('refresh');
                } else if (focusedRegion === 'list') {
                    focus(bannerId);
                    setFocusedRegion('banner');
                } else {
                    if (hasStashedRuns) {
                        focus(listId);
                        setFocusedRegion('list');
                        setListSelectedIdx(stashedRunIds.length - 1);
                        return;
                    } else {
                        focus(bannerId);
                        setFocusedRegion('banner');
                    }
                }
            } else if (key.downArrow) {
                stopPropagation();
                if (focusedRegion === 'banner') {
                    if (hasStashedRuns) {
                        focus(listId);
                        setFocusedRegion('list');
                        setListSelectedIdx(0);
                        return;
                    } else {
                        focus(refreshId);
                        setFocusedRegion('refresh');
                    }
                } else if (focusedRegion === 'list') {
                    focus(refreshId);
                    setFocusedRegion('refresh');
                } else {
                    focus(bannerId);
                    setFocusedRegion('banner');
                }
            }

            setListSelectedIdx(null);
        },
        { isActive: status === 'ready' },
    );

    // Re-seeds focus onto the Banner every time the run list (re)appears —
    // both the initial load and every later busy -> ready cycle (refresh,
    // confirm/cancel) — matching the reset a fresh mount used to give it
    // back when RunDisplay was a separate component.
    // biome-ignore lint/correctness/useExhaustiveDependencies: only status should retrigger this; focus/focusNext identities are stable
    useEffect(() => {
        if (status === 'ready') {
            setFocusedRegion('banner');
            setListSelectedIdx(null);
            focus(bannerId);
        }
    }, [status]);

    return (
        <Box flexDirection="column">
            {status === 'loading' && <Text dimColor>Loading…</Text>}

            {status === 'error' && (
                <Text color="red">Oops...something went wrong.</Text>
            )}

            {status === 'ready' && (
                <>
                    <Box flexDirection="column" minHeight={10}>
                        <Box flexDirection="column">
                            <Banner
                                id={bannerId}
                                label="Running"
                                item={activeRunId}
                                highlighted={focusedRegion === 'banner'}
                                onActivate={onActivate}
                            />

                            <Box flexDirection="column" paddingLeft={2}>
                                <List
                                    id={listId}
                                    items={stashedRunIds}
                                    initialSelectedIndex={listSelectedIdx}
                                    viewport={VIEWPORT}
                                    onActivate={onActivate}
                                    fallback="No archived runs"
                                />

                                <Button
                                    id={refreshId}
                                    text="refresh"
                                    highlighted={focusedRegion === 'refresh'}
                                    onSelection={onRefresh}
                                    paddingLeft={1}
                                />
                            </Box>
                        </Box>

                        {confirmOpen && (
                            <ConfirmPrompt
                                prompt={confirmMessage}
                                onConfirm={onConfirm}
                                onCancel={() => setConfirmOpen(false)}
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
