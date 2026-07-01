import * as esbuild from 'esbuild';
import { builtinModules } from 'module';

const isWatch = process.argv.includes('--watch');
// All node built-in modules + all npm dependencies
const nodeBuiltins = builtinModules.flatMap(m => [m, `node:${m}`]);
const external = [
  ...nodeBuiltins,
  'commander', 'iconv-lite', 'ink', 'react',
  'epub', 'jszip', 'fast-xml-parser',
];

const config = {
  entryPoints: ['src/index.ts'],
  outfile: 'dist/cli.js',
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  banner: {
    js: '#!/usr/bin/env node',
  },
  external,
  plugins: [{
    name: 'empty-devtools',
    setup(build) {
      build.onResolve({ filter: /^react-devtools-core$/ }, () => ({
        path: 'react-devtools-core',
        namespace: 'empty',
      }));
      build.onLoad({ filter: /.*/, namespace: 'empty' }, () => ({
        contents: 'export default {};',
      }));
    },
  }],
  loader: { '.ts': 'ts', '.tsx': 'tsx' },
};

if (isWatch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log('Watching...');
} else {
  await esbuild.build(config);
  console.log('Build complete: dist/cli.js');
}
