// Babel config for building/consuming this package.
// The `unplugin-typegpu` plugin transforms `'use gpu'` TS functions into WGSL at build time.
// Consumers' apps need this plugin too so the inline GPU functions get transformed.
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    'unplugin-typegpu/babel',
    'react-native-worklets/plugin', // must be last among Babel plugins (per Reanimated v4 docs)
  ],
};
