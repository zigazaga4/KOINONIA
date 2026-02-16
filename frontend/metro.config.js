const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// Set the workspace root so Metro can resolve files outside frontend/
config.projectRoot = projectRoot;
config.watchFolders = [workspaceRoot];

// Resolve node_modules from both frontend and server
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "server", "node_modules"),
];

// Prevent Metro from looking at server's node_modules for duplicate React etc.
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
