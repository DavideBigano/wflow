import { Box, Text } from 'ink';

export interface ListProps {
    items: string[];
    selectedIndex: number;
    viewport: number;
}

/** Dumb, reusable element: scrollable, position-highlighted list of items, injected props only. */
export function List({ items, selectedIndex, viewport }: ListProps) {
    const scrollOffset = computeScrollOffset(
        selectedIndex,
        items.length,
        viewport,
    );
    const visible = items.slice(scrollOffset, scrollOffset + viewport);

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
    selectedIndex: number,
    total: number,
    viewport: number,
): number {
    if (total <= viewport) {
        return 0;
    }
    const centered = selectedIndex - Math.floor(viewport / 2);
    return Math.max(0, Math.min(centered, total - viewport));
}
