import { createMDX } from 'fumadocs-mdx/next';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const isCI = process.env.GITHUB_ACTIONS === 'true';
// On GitHub Pages this site is served from /<repo>/ — locally we want /.
const repo = 'react-native-wgpu-components';

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  basePath: isCI ? `/${repo}` : '',
  images: { unoptimized: true },

  // Live component previews on docs pages render real React Native components
  // through react-native-web. Map the bare `react-native` specifier to its
  // web shim and force a .web.* extension preference so any platform-split
  // modules (e.g. react-native-wgpu) pick up their web entry.
  transpilePackages: [
    'react-native',
    'react-native-web',
    'react-native-gesture-handler',
    'react-native-reanimated',
    'react-native-wgpu',
    'react-native-wgpu-components',
    'react-native-worklets',
    'typegpu',
  ],

  webpack: (cfg, { webpack }) => {
    // React Native global. Metro defines it automatically; webpack doesn't.
    // Reanimated checks `__DEV__` at module init and throws without it.
    cfg.plugins.push(
      new webpack.DefinePlugin({
        __DEV__: process.env.NODE_ENV !== 'production',
      }),
    );
    cfg.resolve.alias = {
      ...(cfg.resolve.alias ?? {}),
      'react-native$': 'react-native-web',
      // Native-only module. enableWorklets.ts short-circuits on web before the
      // require runs, but webpack does static resolution so we have to stub it.
      'react-native-webgpu-worklets': false,
    };
    cfg.resolve.extensions = [
      '.web.tsx',
      '.web.ts',
      '.web.jsx',
      '.web.js',
      ...cfg.resolve.extensions,
    ];

    // Run babel-loader (with unplugin-typegpu) ONLY on the workspace package's
    // source. Everything else stays on Next's SWC pipeline so we don't disturb
    // fumadocs's pre-bundled ESM. The TypeGPU plugin is what turns `'use gpu'`
    // function bodies inside shader.ts into real WGSL at build time.
    const packageSrc = resolve(__dirname, '../../packages/react-native-wgpu-components/src');
    cfg.module.rules.unshift({
      test: /\.(t|j)sx?$/,
      include: [packageSrc],
      use: {
        loader: 'babel-loader',
        options: {
          configFile: resolve(__dirname, 'babel.package.config.js'),
          // Prevent babel-loader from looking up additional configs in the
          // workspace tree (which would pick up the example app's babel.config.js).
          babelrc: false,
          rootMode: 'root',
          cacheDirectory: true,
        },
      },
    });

    return cfg;
  },
};

const withMDX = createMDX();
export default withMDX(config);
