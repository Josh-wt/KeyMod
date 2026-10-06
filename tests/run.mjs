import { build } from 'vite';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { builtinModules } from 'node:module';

const outDir = await mkdtemp(join(tmpdir(), 'keymoderator-tests-'));
try {
  await build({
    configFile: false,
    logLevel: 'error',
    build: {
      outDir,
      emptyOutDir: true,
      target: 'esnext',
      minify: false,
      lib: { entry: { thread: 'tests/thread.test.ts', workspace: 'tests/workspace.test.ts', removalTracking: 'tests/removalTracking.test.ts', modMenus: 'tests/modMenus.test.ts', hostPostFallback: 'tests/hostPostFallback.test.ts' },
        formats: ['es'], fileName: (_format, name) => `${name}.test.mjs` },
      rollupOptions: { external: [/^node:/] },
    },
  });
  // The Markdown renderer has separate browser and Node entity decoders.
  await build({
    configFile: false,
    logLevel: 'error',
    resolve: { conditions: ['node'] },
    build: {
      outDir, emptyOutDir: false, target: 'esnext', minify: false,
      lib: { entry: 'tests/markdown.test.tsx', formats: ['es'], fileName: () => 'markdown.test.mjs' },
      rollupOptions: { external: (id) => id.startsWith('node:') || builtinModules.includes(id) },
    },
  });
  const result = spawnSync(process.execPath, ['--test', join(outDir, 'thread.test.mjs'), join(outDir, 'workspace.test.mjs'), join(outDir, 'markdown.test.mjs'), join(outDir, 'removalTracking.test.mjs'), join(outDir, 'modMenus.test.mjs'), join(outDir, 'hostPostFallback.test.mjs')], { stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
} finally {
  await rm(outDir, { recursive: true, force: true });
}
