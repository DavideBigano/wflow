import { expect, test } from 'vitest';
import {
    findActiveId,
    listStashedRuns,
    reviveRun,
    stashActiveRun,
} from './runArchive.js';
import { createInMemoryFilesystemGateway } from './testFixtures/inMemoryFilesystemGateway.js';
import { WflowError } from './wflowError.js';

const runJson = (id: string) =>
    JSON.stringify({ run: { id, name: id, description: id } });

test("findRunningId returns the live run's id when stages/run.json exists", async () => {
    const fs = createInMemoryFilesystemGateway({
        '/ws/stages/run.json': runJson('run-1'),
    });

    await expect(findActiveId('/ws', fs)).resolves.toBe('run-1');
});

test('findRunningId returns null when stages/run.json is absent', async () => {
    const fs = createInMemoryFilesystemGateway();

    await expect(findActiveId('/ws', fs)).resolves.toBeNull();
});

test('listStashedRuns returns only archived folders that still carry run.json', async () => {
    const fs = createInMemoryFilesystemGateway({
        '/ws/archive/run-a/run.json': runJson('run-a'),
        '/ws/archive/run-a/01-intake/idea.json': '{}',
        '/ws/archive/run-b/01-intake/idea.json': '{}',
    });

    await expect(listStashedRuns('/ws', fs)).resolves.toEqual(['run-a']);
});

test("stashRunningRun moves the live run's outputs and run.json under archive/<run-id>", async () => {
    const fs = createInMemoryFilesystemGateway({
        '/ws/stages/run.json': runJson('run-1'),
        '/ws/stages/01-intake/outputs/idea.json': '{}',
    });

    await stashActiveRun('/ws', fs);

    await expect(
        fs.readTextFile('/ws/archive/run-1/01-intake/idea.json'),
    ).resolves.toBe('{}');
});

test('stashRunningRun leaves no live run.json behind afterwards', async () => {
    const fs = createInMemoryFilesystemGateway({
        '/ws/stages/run.json': runJson('run-1'),
        '/ws/stages/01-intake/outputs/idea.json': '{}',
    });

    await stashActiveRun('/ws', fs);

    await expect(fs.pathExists('/ws/stages/run.json')).resolves.toBe(false);
});

test('stashRunningRun throws when no run is live', async () => {
    const fs = createInMemoryFilesystemGateway();

    await expect(stashActiveRun('/ws', fs)).rejects.toThrow(WflowError);
});

test("reviveRun moves an archived run's outputs and run.json back to the live layers", async () => {
    const fs = createInMemoryFilesystemGateway({
        '/ws/archive/run-1/run.json': runJson('run-1'),
        '/ws/archive/run-1/01-intake/idea.json': '{}',
        '/ws/stages/01-intake/outputs/.keep': '',
    });

    await reviveRun('/ws', 'run-1', { autoStash: false }, fs);

    await expect(
        fs.readTextFile('/ws/stages/01-intake/outputs/idea.json'),
    ).resolves.toBe('{}');
});

test('reviveRun throws for an unknown run id', async () => {
    const fs = createInMemoryFilesystemGateway();

    await expect(
        reviveRun('/ws', 'missing-run', { autoStash: false }, fs),
    ).rejects.toThrow(WflowError);
});

test('reviveRun throws when a run is already live and autoStash is off', async () => {
    const fs = createInMemoryFilesystemGateway({
        '/ws/stages/run.json': runJson('run-live'),
        '/ws/archive/run-1/run.json': runJson('run-1'),
    });

    await expect(
        reviveRun('/ws', 'run-1', { autoStash: false }, fs),
    ).rejects.toThrow(WflowError);
});

test('reviveRun auto-stashes the live run and reports its id when autoStash is on', async () => {
    const fs = createInMemoryFilesystemGateway({
        '/ws/stages/run.json': runJson('run-live'),
        '/ws/archive/run-1/run.json': runJson('run-1'),
    });

    const result = await reviveRun('/ws', 'run-1', { autoStash: true }, fs);

    expect(result.stashedRunId).toBe('run-live');
});
