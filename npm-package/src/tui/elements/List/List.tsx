import { Box, Text } from 'ink';
import { useEffect, useRef, useState } from 'react';
import { useInputListener } from '../../../lib/inputEventProvider/index.js';

export interface ListProps {
    /** Optional listener id that can be provided to focus the banner */
    id?: string;
    items: string[];
    viewport: number;
    fallback?: string;
    /** Seeds the selected item on first mount. Defaults to null (nothing selected). */
    initialSelectedIndex?: number | null;
    /** Called with the selected item when Enter is pressed while List is focused. */
    onActivate: (item: string) => void;
}

/**
 * Smart, reusable element: scrollable list owning its own up/down navigation
 * *within its own bounds* — an empty list, or an up/down press past its
 * first/last item, is left untouched (no `stopPropagation`) for an ancestor
 * to interpret as a request to move focus elsewhere; List itself never moves
 * focus.
 */
export function List({
    id,
    items,
    viewport,
    fallback = 'No items',
    initialSelectedIndex = null,
    onActivate,
}: ListProps) {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(
        initialSelectedIndex,
    );

    useInputListener(
        (_input, key, stopPropagation) => {
            if (items.length === 0 || selectedIndex === null) {
                return;
            }

            if (key.upArrow) {
                if (selectedIndex === 0) {
                    return;
                }
                setSelectedIndex((index) => (index as number) - 1);
                stopPropagation();
            } else if (key.downArrow) {
                if (selectedIndex === items.length - 1) {
                    return;
                }
                setSelectedIndex((index) => (index as number) + 1);
                stopPropagation();
            } else if (key.return && items[selectedIndex]) {
                stopPropagation();
                onActivate(items[selectedIndex]);
            }
        },
        { id },
    );

    const scrollOffset = computeScrollOffset(
        selectedIndex,
        items.length,
        viewport,
    );
    const visible = items.slice(scrollOffset, scrollOffset + viewport);

    // `useState`'s initializer already seeds `selectedIndex` for the first
    // render, so this effect's job is only to re-seed it on later prop
    // changes (e.g. a parent re-entering the list at a new index). Running it
    // on mount too would be redundant at best — and at worst race the very
    // first keypress, since passive effects can flush after synchronous
    // input handling and stomp on navigation that already happened.
    const isMounted = useRef(false);
    useEffect(() => {
        if (isMounted.current) {
            setSelectedIndex(initialSelectedIndex);
        }
        isMounted.current = true;
    }, [initialSelectedIndex]);

    if (items.length <= 0) {
        return (
            <Box flexDirection="column" paddingLeft={2}>
                <Text>{fallback}</Text>
            </Box>
        );
    }

    return (
        <Box flexDirection="column">
            <Text dimColor>
                {scrollOffset > 0 ? `↑ ${scrollOffset} more` : ' '}
            </Text>

            {visible.map((item, i) => {
                const realIndex = scrollOffset + i;
                const isSelected = realIndex === selectedIndex;
                return (
                    <Text key={item} color={isSelected ? 'cyan' : undefined}>
                        {isSelected ? '› ' : '  '}
                        {item}
                    </Text>
                );
            })}

            <Text dimColor>
                {scrollOffset + viewport < items.length
                    ? `↓ ${items.length - scrollOffset - viewport} more`
                    : ' '}
            </Text>
        </Box>
    );
}

/** Centers a fixed-size viewport window around the selected index within [0, total). */
export function computeScrollOffset(
    selectedIndex: number | null,
    total: number,
    viewport: number,
): number {
    if (total <= viewport || selectedIndex === null) {
        return 0;
    }
    const centered = selectedIndex - Math.floor(viewport / 2);
    return Math.max(0, Math.min(centered, total - viewport));
}
