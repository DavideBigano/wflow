import { homedir } from 'node:os';
import path from 'node:path';
import { WflowError } from './wflowError.js';

/** Marker delimiting the wflow completion block, so an install can detect it's already there. */
export const COMPLETION_MARKER = '###-begin-wflow-completions-###';

/** Picks the shell rc file completions should be appended to, based on $SHELL. */
export function resolveShellRcFile(
    shellEnvVar: string | undefined = process.env.SHELL,
    home: string = homedir(),
): string {
    if (shellEnvVar?.includes('zsh')) return path.join(home, '.zshrc');
    if (shellEnvVar?.includes('bash')) return path.join(home, '.bashrc');

    throw new WflowError(
        `could not determine your shell's rc file from $SHELL ("${shellEnvVar ?? ''}")`,
        'install manually instead: wflow completion >> <your-shell-rc-file>',
    );
}
