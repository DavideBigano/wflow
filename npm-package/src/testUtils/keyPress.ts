import type { render } from 'ink-testing-library';
import { act } from 'react';

const ESC = '';

/**
 * Raw ANSI escape sequences for keys used in the app.
 */
export const Keys = {
    up: `${ESC}[A`,
    down: `${ESC}[B`,
    left: `${ESC}[D`,
    right: `${ESC}[C`,
    return: '\r',
    escape: ESC,
} as const;

/**
 * Writes `key` to `stdin`, wrapped in act so that multiple key
 * presses don't incur in stale closures. Accepts a raw string
 * or one of {@link Keys}.
 */
export async function press(
    stdin: ReturnType<typeof render>['stdin'],
    key: string,
): Promise<void> {
    await act(async () => {
        stdin.write(key);
    });
}
