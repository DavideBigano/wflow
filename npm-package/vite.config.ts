import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

const emptyModulePath = fileURLToPath(
    new URL('./empty-module.mjs', import.meta.url),
);

// ink's reconciler dynamically imports './devtools.js' (which unconditionally
// calls react-devtools-core at import time which either doesn't exist or misbehaves
// in a bundled Node CLI.) whenever it's reached. Stub the target out so it's
// never bundled or evaluated, regardless of dead-code elimination of the
// `DEV === 'true'` guard around it.
function stubInkDevtools(): Plugin {
    return {
        name: 'stub-ink-devtools',
        enforce: 'pre',
        resolveId(source, importer) {
            const importerPosix = importer?.split(path.sep).join('/') ?? '';
            if (
                source.endsWith('devtools.js') &&
                importerPosix.includes('/ink/build/')
            ) {
                return emptyModulePath;
            }
            return null;
        },
    };
}

export default defineConfig({
    define: {
        // Forced to 'development' so react/react-reconciler's dev builds get
        // bundled instead of production ones — dev-only React internals
        // (e.g. getOwner() on the dispatcher, read by getOwnerFiber.ts) don't
        // exist in the production build at all. Tactical fix; see TODO.md.
        'process.env.NODE_ENV': JSON.stringify('development'),
        'process.env.DEV': JSON.stringify('false'),
    },
    plugins: [stubInkDevtools()],
    build: {
        target: 'node20',
        outDir: 'dist',
        emptyOutDir: true,
        ssr: true,
        lib: {
            entry: fileURLToPath(new URL('src/cli.ts', import.meta.url)),
            formats: ['es'],
            fileName: () => 'cli.mjs',
        },
        rollupOptions: {
            output: {
                banner: '#!/usr/bin/env node',
                entryFileNames: 'cli.mjs',
                inlineDynamicImports: true,
            },
        },
    },
    ssr: {
        // Bundle all deps (ink, react, yargs) into the single output file.
        noExternal: true,
    },
});
