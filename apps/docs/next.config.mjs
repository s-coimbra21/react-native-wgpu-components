import { createMDX } from 'fumadocs-mdx/next';

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
};

const withMDX = createMDX();
export default withMDX(config);
