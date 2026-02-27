const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// 1. Find the project and workspace root
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 2. Watch all files within the monorepo
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
config.resolver.extraNodeModules = {
    crypto: require.resolve('empty-module'),
    fs: require.resolve('empty-module'),
    path: require.resolve('path-browserify'),
    stream: require.resolve('stream-browserify'),
    url: require.resolve('url'),
    http: require.resolve('empty-module'),
    https: require.resolve('empty-module'),
    zlib: require.resolve('empty-module'),
    os: require.resolve('empty-module'),
};

module.exports = config;
