import path from 'node:path';
import {
    type FilesystemGateway,
    nodeFilesystemGateway,
} from './filesystemGateway.js';
import { relocateTree } from './relocate.js';
import { readRunId } from './runMetadata.js';
import { WflowError } from './wflowError.js';
import {
    discoverOutputUnits,
    resolveArchiveDir,
    resolveRunFile,
} from './workspacePaths.js';

export interface StashResult {
    runId: string;
    movedUnits: string[];
}

export interface ReviveOptions {
    autoStash: boolean;
}

export interface ReviveResult {
    revivedRunId: string;
    /** Set when a running run was auto-archived to make room. */
    stashedRunId?: string;
}

/** The id of the run currently sitting in stages/run.json, or null if none is live. */
export async function findActiveId(
    workspaceRoot: string,
    fs: FilesystemGateway = nodeFilesystemGateway,
): Promise<string | null> {
    const runFile = resolveRunFile(workspaceRoot);
    if (!(await fs.pathExists(runFile))) {
        return null;
    }
    return readRunId(runFile, fs);
}

/** Ids of every archived run — folders under archive/ that still carry a run.json. */
export async function listStashedRuns(
    workspaceRoot: string,
    fs: FilesystemGateway = nodeFilesystemGateway,
): Promise<string[]> {
    const archiveDir = resolveArchiveDir(workspaceRoot);
    if (!(await fs.pathExists(archiveDir))) {
        return [];
    }

    const entries = await fs.listDir(archiveDir);
    const dirs = entries
        .filter((entry) => entry.isDirectory)
        .map((entry) => entry.name);

    // A restored run leaves its (now empty) folder behind — run.json is moved
    // back out on restore, so its presence is what makes a folder count as an
    // actual archived run rather than a leftover shell.
    const withRunFile = await Promise.all(
        dirs.map(async (runId) => {
            const hasRunFile = await fs.pathExists(
                path.join(archiveDir, runId, 'run.json'),
            );
            return hasRunFile ? runId : null;
        }),
    );

    return withRunFile
        .filter((runId): runId is string => runId !== null)
        .sort((a, b) => a.localeCompare(b));
}

/** Moves the live run's output units and run.json into archive/<run-id>/, emptying the live layers. */
export async function stashActiveRun(
    workspaceRoot: string,
    fs: FilesystemGateway = nodeFilesystemGateway,
): Promise<StashResult> {
    const runId = await findActiveId(workspaceRoot, fs);
    if (!runId) {
        throw new WflowError(
            'no run is currently active (stages/run.json not found)',
            'create stages/run.json (validated against shared/run.schema.json) before archiving.',
        );
    }

    const units = await discoverOutputUnits(workspaceRoot, fs);
    const archiveRunDir = path.join(resolveArchiveDir(workspaceRoot), runId);
    await fs.ensureDir(archiveRunDir);

    const movedUnits: string[] = [];
    for (const unit of units) {
        const moved = await relocateTree(
            unit.sourceDir,
            path.join(archiveRunDir, unit.name),
            fs,
            {
                removeRootWhenEmpty: false,
            },
        );
        if (moved.length > 0) {
            movedUnits.push(unit.name);
        }
    }

    await fs.move(
        resolveRunFile(workspaceRoot),
        path.join(archiveRunDir, 'run.json'),
    );

    return { runId, movedUnits };
}

/** Moves an archived run's output units and run.json back into the live layers. */
export async function reviveRun(
    workspaceRoot: string,
    targetRunId: string,
    options: ReviveOptions,
    fs: FilesystemGateway = nodeFilesystemGateway,
): Promise<ReviveResult> {
    const archiveRunDir = path.join(
        resolveArchiveDir(workspaceRoot),
        targetRunId,
    );

    if (!(await fs.pathExists(archiveRunDir))) {
        const known = await listStashedRuns(workspaceRoot, fs);
        throw new WflowError(
            `no archived run found for id "${targetRunId}"`,
            known.length > 0
                ? `known archived run ids: ${known.join(', ')}`
                : 'the archive/ folder is empty; nothing to restore.',
        );
    }

    const archivedRunFile = path.join(archiveRunDir, 'run.json');
    const archivedRunId = await readRunId(archivedRunFile, fs);
    if (archivedRunId !== targetRunId) {
        throw new WflowError(
            `archived run.json id "${archivedRunId}" does not match its folder name "${targetRunId}"`,
            'the archive is out of sync; rename the folder or fix run.json before restoring.',
        );
    }

    const runningId = await findActiveId(workspaceRoot, fs);
    let stashedRunIdFromAutoStash: string | undefined;

    if (runningId) {
        if (!options.autoStash) {
            throw new WflowError(
                `a run is already active ("${runningId}")`,
                'archive it first, or pass the auto-archive option to archive it automatically before restoring.',
            );
        }
        const result = await stashActiveRun(workspaceRoot, fs);
        stashedRunIdFromAutoStash = result.runId;
    }

    await fs.move(archivedRunFile, resolveRunFile(workspaceRoot));

    const units = await discoverOutputUnits(workspaceRoot, fs);
    for (const unit of units) {
        await relocateTree(
            path.join(archiveRunDir, unit.name),
            unit.sourceDir,
            fs,
            {
                removeRootWhenEmpty: true,
            },
        );
    }

    return {
        revivedRunId: targetRunId,
        stashedRunId: stashedRunIdFromAutoStash,
    };
}
