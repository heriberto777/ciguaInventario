const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// 1. Find the project and workspace root
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 2. Monorepo / pnpm configuration
config.projectRoot = projectRoot;
config.watchFolders = [workspaceRoot];

// 3. Let Metro know where to resolve packages and following symlinks
config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
];

// 4. Force Metro to resolve React Native/Browser versions of packages
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// 5. Disable Package Exports to avoid incorrect entry point selection in some libraries
config.resolver.unstable_enablePackageExports = false;

// 6. Polyfill or empty-out node-specific modules if requested by packages
const emptyModulePath = path.resolve(__dirname, 'empty-module.js');
config.resolver.extraNodeModules = {
    crypto: emptyModulePath,
    fs: emptyModulePath,
    path: require.resolve('path-browserify'),
    stream: require.resolve('stream-browserify'),
    url: require.resolve('url'),
    http: emptyModulePath,
    https: emptyModulePath,
    zlib: emptyModulePath,
    os: emptyModulePath,
};

module.exports = config;
