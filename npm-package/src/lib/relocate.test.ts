import { expect, test } from 'vitest';
import { relocateTree } from './relocate.js';
import { createInMemoryFilesystemGateway } from './testFixtures/inMemoryFilesystemGateway.js';

test('relocateTree moves every file from source to the equivalent destination path', async () => {
    const fs = createInMemoryFilesystemGateway({
        '/ws/stages/01-intake/outputs/idea.json': '{}',
        '/ws/stages/01-intake/outputs/notes/note.md': 'hello',
    });

    await relocateTree(
        '/ws/stages/01-intake/outputs',
        '/ws/archive/run-1/01-intake',
        fs,
    );

    await expect(
        fs.readTextFile('/ws/archive/run-1/01-intake/idea.json'),
    ).resolves.toBe('{}');
});

test('relocateTree preserves nested subdirectory structure at the destination', async () => {
    const fs = createInMemoryFilesystemGateway({
        '/ws/stages/01-intake/outputs/notes/note.md': 'hello',
    });

    await relocateTree(
        '/ws/stages/01-intake/outputs',
        '/ws/archive/run-1/01-intake',
        fs,
    );

    await expect(
        fs.readTextFile('/ws/archive/run-1/01-intake/notes/note.md'),
    ).resolves.toBe('hello');
});

test('relocateTree returns moved files as paths relative to source', async () => {
    const fs = createInMemoryFilesystemGateway({
        '/ws/stages/01-intake/outputs/idea.json': '{}',
        '/ws/stages/01-intake/outputs/notes/note.md': 'hello',
    });

    const moved = await relocateTree(
        '/ws/stages/01-intake/outputs',
        '/ws/archive/run-1/01-intake',
        fs,
    );

    expect(moved.sort()).toEqual(['idea.json', 'notes/note.md'].sort());
});

test('relocateTree removes the emptied source root when removeRootWhenEmpty is set', async () => {
    const fs = createInMemoryFilesystemGateway({
        '/ws/archive/run-1/01-intake/idea.json': '{}',
    });

    await relocateTree(
        '/ws/archive/run-1/01-intake',
        '/ws/stages/01-intake/outputs',
        fs,
        {
            removeRootWhenEmpty: true,
        },
    );

    await expect(fs.pathExists('/ws/archive/run-1/01-intake')).resolves.toBe(
        false,
    );
});

test('relocateTree leaves the source root behind when removeRootWhenEmpty is not set', async () => {
    const fs = createInMemoryFilesystemGateway({
        '/ws/archive/run-1/01-intake/idea.json': '{}',
    });

    // This fake models directories only via file presence, so "left behind" here
    // means the destination file exists rather than the (now-fileless) source path.
    await relocateTree(
        '/ws/archive/run-1/01-intake',
        '/ws/stages/01-intake/outputs',
        fs,
        {
            removeRootWhenEmpty: false,
        },
    );

    await expect(
        fs.pathExists('/ws/stages/01-intake/outputs/idea.json'),
    ).resolves.toBe(true);
});

test('relocateTree on a missing source returns an empty list', async () => {
    const fs = createInMemoryFilesystemGateway();

    const moved = await relocateTree(
        '/ws/does-not-exist',
        '/ws/destination',
        fs,
    );

    expect(moved).toEqual([]);
});
