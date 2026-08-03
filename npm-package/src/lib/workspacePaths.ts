import path from 'node:path';
import {
    type FilesystemGateway,
    nodeFilesystemGateway,
} from './filesystemGateway.js';

export interface OutputUnit {
    /** Folder name used both under stages/ (as NN-name/outputs or outputs/) and under archive/<run-id>/ */
    name: string;
    sourceDir: string;
}

/** Path to a workspace's `stages/` layer, given its root. */
export function resolveStagesDir(workspaceRoot: string): string {
    return path.join(workspaceRoot, 'stages');
}

/** Path to a workspace's `archive/` layer, given its root. */
export function resolveArchiveDir(workspaceRoot: string): string {
    return path.join(workspaceRoot, 'archive');
}

/** Path to the live run's `run.json`, given the workspace root. */
export function resolveRunFile(workspaceRoot: string): string {
    return path.join(resolveStagesDir(workspaceRoot), 'run.json');
}

/**
 * Enumerates every output folder under stages/: each `stages/NN-name/outputs`
 * plus the root `stages/outputs`. These are the units moved during archive/restore.
 */
export async function discoverOutputUnits(
    workspaceRoot: string,
    fs: FilesystemGateway = nodeFilesystemGateway,
): Promise<OutputUnit[]> {
    const stagesDir = resolveStagesDir(workspaceRoot);
    const entries = await fs.listDir(stagesDir);
    const units: OutputUnit[] = [];

    for (const entry of entries) {
        if (!entry.isDirectory) continue;

        if (entry.name === 'outputs') {
            units.push({
                name: 'outputs',
                sourceDir: path.join(stagesDir, 'outputs'),
            });
            continue;
        }

        if (/^\d+-/.test(entry.name)) {
            const outputsDir = path.join(stagesDir, entry.name, 'outputs');
            if (await fs.pathExists(outputsDir)) {
                units.push({ name: entry.name, sourceDir: outputsDir });
            }
        }
    }

    return units;
}
