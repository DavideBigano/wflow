import { Box, Text } from 'ink';
import { useMemo, useState } from 'react';
import { useInputListener } from '../../../lib/inputEventProvider/index.js';
import { Banner } from '../../elements/Banner/Banner.js';
import { List } from '../../elements/List/List.js';

/* export type RunRow =
    | { kind: 'banner'; runId: string | null }
    | { kind: 'stashed'; runId: string }
    | { kind: 'refresh' }; */

export interface RunDisplayProps {
    activeRunId: string | null;
    stashedRunIds: string[];
    viewport: number;
    /** Called with the selected row (the active-run banner or a stashed run) when Enter is pressed — not the refresh row. */
    onActivate: (rowId: string) => void;
    /** Called when the user triggers a refresh, either via the 'r' key or by confirming the [refresh] row. */
    onRefresh: () => void;
}

/** Smart, bespoke component: displays the active/stashed/refresh runs and owns up/down row selection; other keys aren't handled yet. */
export function RunDisplay({
    activeRunId,
    stashedRunIds,
    viewport,
    onActivate,
    onRefresh,
}: RunDisplayProps) {
    const runs = useMemo(
        () => [activeRunId, ...stashedRunIds],
        [activeRunId, stashedRunIds],
    );

    const itemLength = runs.length + 1;

    const [selected, setSelected] = useState(0);

    useInputListener((input, key, stopPropagation) => {
        if (key.upArrow) {
            setSelected((current) => (current - 1 + itemLength) % itemLength);
        } else if (key.downArrow) {
            setSelected((current) => (current + 1) % itemLength);
        } else if (input === 'r') {
            stopPropagation();
            onRefresh();
        } else if (key.return && selected === itemLength - 1) {
            stopPropagation();
            onRefresh();
        } else if (key.return && runs[selected]) {
            stopPropagation();
            onActivate(runs[selected]);
        }
    });

    const isBannerSelected = selected === 0;
    const isRefreshSelected = selected === itemLength - 1;
    const listSelectedIndex = selected - 1;

    return (
        <Box flexDirection="column">
            <Banner
                label="Running"
                item={activeRunId}
                highlighted={isBannerSelected}
            />

            <Box flexDirection="column" paddingLeft={2}>
                {stashedRunIds.length === 0 && (
                    <Text dimColor>no archived runs</Text>
                )}

                <List
                    items={stashedRunIds}
                    selectedIndex={listSelectedIndex}
                    viewport={viewport}
                />

                <Text color={isRefreshSelected ? 'cyan' : undefined}>
                    {isRefreshSelected ? '› ' : '  '}
                    [refresh]
                </Text>
            </Box>
        </Box>
    );
}
