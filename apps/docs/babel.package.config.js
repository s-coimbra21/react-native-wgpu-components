// Babel config used ONLY by the webpack rule in next.config.mjs that targets
// the workspace package's source files. Everything else in the docs site is
// compiled by Next's SWC pipeline, so we don't disturb fumadocs's pre-bundled
// ESM. The TypeGPU plugin is what turns the `'use gpu'` function bodies in
// shader.ts into real WGSL at build time.
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: 'defaults', modules: false }],
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript',
  ],
  plugins: ['unplugin-typegpu/babel'],
};
