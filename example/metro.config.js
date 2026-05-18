const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

config.resolver.disableHierarchicalLookup = true;

// Resolve the workspace package to its source so the example app picks up live changes.
config.resolver.extraNodeModules = {
  'react-native-wgpu-components': path.resolve(
    workspaceRoot,
    'packages/react-native-wgpu-components',
  ),
};

module.exports = config;
