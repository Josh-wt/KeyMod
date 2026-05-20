import { defineConfig } from 'vite';
import { builtinModules } from 'node:module';

const nodeBuiltins = new Set([...builtinModules, ...builtinModules.map((moduleName) => `node:${moduleName}`)]);

export default defineConfig({
  ssr: {
    noExternal: true,
  },
  build: {
    ssr: 'src/server/index.ts',
    outDir: 'dist/server',
    emptyOutDir: true,
    target: 'node22',
    rollupOptions: {
      external: (id) => nodeBuiltins.has(id),
      output: {
        entryFileNames: 'index.cjs',
        exports: 'named',
        format: 'cjs',
        inlineDynamicImports: true,
      },
    },
  },
});
