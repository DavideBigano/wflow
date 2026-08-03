import { expect, test } from 'vitest';
import { resolveShellRcFile } from './shellRc.js';
import { WflowError } from './wflowError.js';

test('resolveShellRcFile picks .bashrc for a bash $SHELL', () => {
    expect(resolveShellRcFile('/bin/bash', '/home/u')).toBe('/home/u/.bashrc');
});

test('resolveShellRcFile picks .zshrc for a zsh $SHELL', () => {
    expect(resolveShellRcFile('/usr/bin/zsh', '/home/u')).toBe(
        '/home/u/.zshrc',
    );
});

test('resolveShellRcFile throws for an unrecognized shell', () => {
    expect(() => resolveShellRcFile('/usr/bin/fish', '/home/u')).toThrow(
        WflowError,
    );
});

test('resolveShellRcFile throws when $SHELL is empty', () => {
    expect(() => resolveShellRcFile('', '/home/u')).toThrow(WflowError);
});
