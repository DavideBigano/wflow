import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { reviveRun, stashRunningRun } from './lib/runArchive.js';
import { COMPLETION_MARKER, resolveShellRcFile } from './lib/shellRc.js';
import { describeError } from './lib/wflowError.js';
import { launchApp } from './tui/launch.js';

/** Regenerates the completion script by re-invoking this same CLI's bare `completion` command. */
function generateCompletionScript(): string {
    return execFileSync(process.execPath, [process.argv[1], 'completion'], {
        encoding: 'utf8',
    });
}

/** Appends the completion script to the resolved shell rc file, skipping if it's already there. */
async function installCompletionScript(): Promise<void> {
    const rcFile = resolveShellRcFile();
    const existing = await fs.readFile(rcFile, 'utf8').catch(() => '');

    if (existing.includes(COMPLETION_MARKER)) {
        console.log(
            `completions already installed in ${rcFile} — nothing to do.`,
        );
        return;
    }

    const separator =
        existing.length > 0 && !existing.endsWith('\n') ? '\n' : '';
    await fs.appendFile(rcFile, `${separator}${generateCompletionScript()}`);
    console.log(`installed wflow completions in ${rcFile}`);
    console.log('open a new terminal (or `source` that file) to pick them up.');
}

async function main(): Promise<void> {
    const cli = yargs(hideBin(process.argv))
        .scriptName('wflow')
        .usage(
            '$0 [topic]\n\nLaunches the wflow TUI. Pass a topic name to open directly on that tab.',
        )
        .command(
            ['$0', 'home'],
            'Launch the TUI on the home tab',
            () => {},
            async () => {
                await launchApp({ initialTopicId: 'home' });
            },
        )
        .command(
            'archiver',
            'Archiver topic — launches the TUI on this tab, or run archive/restore directly without it',
            (topic) =>
                topic
                    .command(
                        'archive',
                        'Archive the currently running run, without the TUI',
                        () => {},
                        async () => {
                            const result = await stashRunningRun(process.cwd());
                            const unitsLabel =
                                result.movedUnits.length > 0
                                    ? result.movedUnits.join(', ')
                                    : '(nothing to move)';
                            console.log(
                                `archived "${result.runId}" -> ${unitsLabel}`,
                            );
                        },
                    )
                    .command(
                        'restore <run-id>',
                        'Restore an archived run by id, without the TUI',
                        (subcommand) =>
                            subcommand
                                .positional('run-id', {
                                    type: 'string',
                                    describe: 'Run id to restore',
                                    demandOption: true,
                                })
                                .option('auto-archive', {
                                    alias: 'a',
                                    type: 'boolean',
                                    default: false,
                                    describe:
                                        'Archive the currently running run automatically before restoring',
                                }),
                        async (argv) => {
                            const result = await reviveRun(
                                process.cwd(),
                                argv.runId,
                                {
                                    autoStash: argv.autoArchive,
                                },
                            );
                            if (result.stashedRunId)
                                console.log(
                                    `auto-archived running run "${result.stashedRunId}"`,
                                );
                            console.log(`restored "${result.revivedRunId}"`);
                        },
                    ),
            async () => {
                await launchApp({ initialTopicId: 'archiver' });
            },
        )
        .command(
            'completion',
            'Print the wflow shell completion script',
            (topic) =>
                topic.command(
                    'install',
                    "Append the completion script to your shell's rc file (safe to rerun)",
                    () => {},
                    async () => {
                        await installCompletionScript();
                    },
                ),
            () => {
                cli.showCompletionScript();
            },
        )
        .strict()
        .wrap(Math.min(100, process.stdout.columns || 100))
        .help()
        .fail((message, error) => {
            console.error(describeError(error ?? message));
            process.exit(1);
        });

    await cli.parseAsync();
}

main().catch((error) => {
    console.error(describeError(error));
    process.exitCode = 1;
});
