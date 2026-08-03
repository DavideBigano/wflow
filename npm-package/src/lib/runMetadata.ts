import {
    type FilesystemGateway,
    nodeFilesystemGateway,
} from './filesystemGateway.js';
import { WflowError } from './wflowError.js';

/** Reads `run.json` (per `run.schema.json`'s `{ run: { id, name, description } }` shape) and returns its `run.id`. */
export async function readRunId(
    runFilePath: string,
    fs: FilesystemGateway = nodeFilesystemGateway,
): Promise<string> {
    if (!(await fs.pathExists(runFilePath))) {
        throw new WflowError(
            `run.json not found at ${runFilePath}`,
            'create it (validated against shared/run.schema.json) before archiving or restoring.',
        );
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(await fs.readTextFile(runFilePath));
    } catch {
        throw new WflowError(
            `run.json at ${runFilePath} is not valid JSON`,
            'fix or regenerate the file before continuing.',
        );
    }

    const id = (parsed as { run?: { id?: unknown } } | null)?.run?.id;
    if (typeof id !== 'string' || id.length === 0) {
        throw new WflowError(
            `run.json at ${runFilePath} has no valid "run.id" field`,
            'expected shape { "run": { "id": "...", "name": "...", "description": "..." } } per run.schema.json.',
        );
    }

    return id;
}
