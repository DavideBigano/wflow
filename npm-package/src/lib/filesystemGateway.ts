import fs from "node:fs/promises";

export interface DirEntry {
  name: string;
  isDirectory: boolean;
}

/**
 * Minimal filesystem seam used by every side-effecting module in this CLI.
 * Passing a fake implementation (in-memory, recording, etc.) in place of
 * `nodeFilesystemGateway` is enough to unit-test the archiver logic without touching disk.
 */
export interface FilesystemGateway {
  pathExists(target: string): Promise<boolean>;
  ensureDir(target: string): Promise<void>;
  move(from: string, to: string): Promise<void>;
  removeEmptyDir(target: string): Promise<void>;
  listDir(target: string): Promise<DirEntry[]>;
  readTextFile(target: string): Promise<string>;
}

export const nodeFilesystemGateway: FilesystemGateway = {
  async pathExists(target) {
    try {
      await fs.access(target);
      return true;
    } catch {
      return false;
    }
  },
  async ensureDir(target) {
    await fs.mkdir(target, { recursive: true });
  },
  async move(from, to) {
    await fs.rename(from, to);
  },
  async removeEmptyDir(target) {
    await fs.rmdir(target);
  },
  async listDir(target) {
    const entries = await fs.readdir(target, { withFileTypes: true });
    return entries.map((entry) => ({ name: entry.name, isDirectory: entry.isDirectory() }));
  },
  async readTextFile(target) {
    return fs.readFile(target, "utf8");
  },
};
