import path from 'node:path';
import {
    type FilesystemGateway,
    nodeFilesystemGateway,
} from './filesystemGateway.js';

export interface RelocateOptions {
    /** Remove `source` itself once it (and every subdirectory) is empty. */
    removeRootWhenEmpty?: boolean;
}

/**
 * Moves every file under `source` into the equivalent path under `destination`,
 * recreating subdirectories as needed and pruning subdirectories left empty
 * behind it. Returns the list of moved files, relative to `source`.
 */
export async function relocateTree(
    source: string,
    destination: string,
    fs: FilesystemGateway = nodeFilesystemGateway,
    options: RelocateOptions = {},
): Promise<string[]> {
    const moved: string[] = [];

    if (!(await fs.pathExists(source))) return moved;

    await transferEntries(source, source, destination, fs, moved);

    if (options.removeRootWhenEmpty) {
        await pruneIfEmpty(source, fs);
    }

    return moved;
}

async function transferEntries(
    root: string,
    source: string,
    destination: string,
    fs: FilesystemGateway,
    moved: string[],
): Promise<void> {
    const entries = await fs.listDir(source);
    if (entries.length === 0) return;

    await fs.ensureDir(destination);

    for (const entry of entries) {
        const sourcePath = path.join(source, entry.name);
        const destinationPath = path.join(destination, entry.name);

        if (entry.isDirectory) {
            await transferEntries(root, sourcePath, destinationPath, fs, moved);
            await pruneIfEmpty(sourcePath, fs);
        } else {
            await fs.move(sourcePath, destinationPath);
            moved.push(path.relative(root, sourcePath));
        }
    }
}

async function pruneIfEmpty(dir: string, fs: FilesystemGateway): Promise<void> {
    const entries = await fs.listDir(dir).catch(() => null);
    if (entries !== null && entries.length === 0) {
        await fs.removeEmptyDir(dir);
    }
}
