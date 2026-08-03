import { render } from 'ink';
import React from 'react';
import { WflowError } from '../lib/wflowError.js';
import { Shell } from './Shell.js';
import type { TopicId } from './topicRegistry.js';

export interface LaunchOptions {
    initialTopicId?: TopicId;
    workspaceRoot?: string;
}

/** Boots the ink TUI, rooted at the given workspace directory (defaults to cwd). */
export async function launchApp(options: LaunchOptions = {}): Promise<void> {
    if (!process.stdin.isTTY) {
        throw new WflowError(
            'the wflow TUI requires an interactive terminal (stdin is not a TTY)',
            'run it directly in a terminal.',
        );
    }

    const workspaceRoot = options.workspaceRoot ?? process.cwd();
    const { waitUntilExit } = render(
        React.createElement(Shell, {
            workspaceRoot,
            initialTopicId: options.initialTopicId,
        }),
    );
    await waitUntilExit();
}
