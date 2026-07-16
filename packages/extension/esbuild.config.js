/**
 * esbuild configuration for bundling the VSCode extension
 * This ensures the vscode module is properly externalized and the extension works in all environments
 */

const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs', // CommonJS format required for VSCode extensions
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: 'out/extension.js',
    external: ['vscode'], // Don't bundle vscode module - it's provided by the runtime
    logLevel: 'info',
    loader: {
      '.ts': 'ts'
    },
    treeShaking: true,
  });

  if (watch) {
    await ctx.watch();
    console.log('Watching for changes...');
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
