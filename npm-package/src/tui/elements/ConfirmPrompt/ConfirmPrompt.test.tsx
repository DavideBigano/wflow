import { expect, test } from 'vitest';
import {
    centerLine,
    centerPadding,
    getConfirmPromptLayout,
    wrapText,
} from './ConfirmPrompt.js';

test('centerPadding splits even slack evenly', () => {
    expect(centerPadding(10, 4)).toEqual({ left: 3, right: 3 });
});

test('centerPadding favors the right side when slack is odd', () => {
    expect(centerPadding(9, 4)).toEqual({ left: 2, right: 3 });
});

test('centerPadding returns no slack when content already fills the width', () => {
    expect(centerPadding(4, 4)).toEqual({ left: 0, right: 0 });
});

test('centerLine wraps text with a border-padding space on each side', () => {
    expect(centerLine('hi', 4)).toBe('  hi  ');
});

test('wrapText keeps text that already fits on one line', () => {
    expect(wrapText('hello world', 20)).toEqual(['hello world']);
});

test('wrapText breaks text on word boundaries once it exceeds maxWidth', () => {
    expect(wrapText('one two three four', 9)).toEqual([
        'one two',
        'three',
        'four',
    ]);
});

test('wrapText hard-breaks a single word longer than maxWidth', () => {
    expect(wrapText('supercalifragilisticexpialidocious', 5)).toEqual([
        'super',
        'calif',
        'ragil',
        'istic',
        'expia',
        'lidoc',
        'ious',
    ]);
});

test('wrapText never returns a line longer than maxWidth', () => {
    const lines = wrapText(
        'Archive currently running run "2026-07-28-dichiarazioni-origine-5-ivan-supplier-data-sharing"?',
        56,
    );

    expect(lines.every((line) => line.length <= 56)).toBe(true);
});

test('getConfirmPromptLayout reserves one row per wrapped prompt/hint line plus the choice line and borders', () => {
    const layout = getConfirmPromptLayout('short prompt', 100);

    // 1 prompt line + 1 choice line + 1 hint line (it fits on one line at width 100) + 2 borders
    expect(layout.height).toBe(5);
});

test('getConfirmPromptLayout grows height to fit a wrapped prompt', () => {
    const wrapped = getConfirmPromptLayout(
        'Archive currently running run "2026-07-28-dichiarazioni-origine-5-ivan-supplier-data-sharing"?',
        60,
    );
    const short = getConfirmPromptLayout('short prompt', 60);

    expect(wrapped.height).toBeGreaterThan(short.height);
});
