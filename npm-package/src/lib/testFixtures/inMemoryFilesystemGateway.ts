import path from 'node:path';
import type { DirEntry, FilesystemGateway } from '../filesystemGateway.js';

/**
 * In-memory FilesystemGateway fake for tests: directories exist only as far as
 * files live under them (no tracking of empty directories), which is enough
 * to exercise the archive/restore logic without touching real disk.
 */
export function createInMemoryFilesystemGateway(
    initialFiles: Record<string, string> = {},
): FilesystemGateway {
    const files = new Map<string, string>(
        Object.entries(initialFiles).map(([key, value]) => [
            normalize(key),
            value,
        ]),
    );

    return {
        async pathExists(target) {
            const normalized = normalize(target);
            return files.has(normalized) || hasFilesUnder(files, normalized);
        },
        async ensureDir() {
            // Directories are implicit from file paths in this fake — nothing to record.
        },
        async move(from, to) {
            const normalizedFrom = normalize(from);
            const content = files.get(normalizedFrom);
            if (content === undefined)
                throw new Error(`fake fs: cannot move missing file ${from}`);
            files.delete(normalizedFrom);
            files.set(normalize(to), content);
        },
        async removeEmptyDir() {
            // No-op: emptiness is derived from the files map, nothing to remove.
        },
        async listDir(target) {
            return listDirEntries(files, normalize(target));
        },
        async readTextFile(target) {
            const content = files.get(normalize(target));
            if (content === undefined)
                throw new Error(`fake fs: no such file ${target}`);
            return content;
        },
    };
}

function normalize(target: string): string {
    return target.split(path.sep).join('/');
}

function hasFilesUnder(files: Map<string, string>, dir: string): boolean {
    const prefix = `${dir}/`;
    for (const filePath of files.keys()) {
        if (filePath.startsWith(prefix)) return true;
    }
    return false;
}

function listDirEntries(files: Map<string, string>, dir: string): DirEntry[] {
    const prefix = `${dir}/`;
    const seen = new Map<string, boolean>();

    for (const filePath of files.keys()) {
        if (!filePath.startsWith(prefix)) continue;
        const rest = filePath.slice(prefix.length);
        const [first, ...more] = rest.split('/');
        seen.set(first, more.length > 0);
    }

    return Array.from(seen.entries()).map(([name, isDirectory]) => ({
        name,
        isDirectory,
    }));
}
