const path = require('path');

const PROJECT_ROOT = __dirname;
const ABS_APP_ROOT = path.resolve(PROJECT_ROOT, 'src/app');

// In this monorepo `babel-preset-expo` is hoisted to the workspace root while
// `expo-router` stays under apps/mobile/node_modules. babel-preset-expo gates its
// expo-router transform behind `require.resolve('expo-router')`, which fails from
// the root, so `process.env.EXPO_ROUTER_APP_ROOT` is never inlined and the
// `require.context` call in expo-router/_ctx breaks. We inline the same values the
// native plugin would emit (app root is per-file relative, like the native one).
function inlineExpoRouterEnv({ types: t }) {
  const literals = {
    EXPO_PROJECT_ROOT: PROJECT_ROOT,
    EXPO_ROUTER_ABS_APP_ROOT: ABS_APP_ROOT,
    EXPO_ROUTER_IMPORT_MODE: 'sync',
  };

  return {
    name: 'inline-expo-router-env',
    visitor: {
      MemberExpression(nodePath, state) {
        const object = nodePath.node.object;
        if (
          !t.isMemberExpression(object) ||
          !t.isIdentifier(object.object, { name: 'process' }) ||
          !t.isIdentifier(object.property, { name: 'env' }) ||
          !t.isIdentifier(nodePath.node.property)
        ) {
          return;
        }

        const key = nodePath.node.property.name;
        if (key === 'EXPO_ROUTER_APP_ROOT') {
          const filename = state.filename || state.file.opts.filename;
          const relative = path
            .relative(path.dirname(filename), ABS_APP_ROOT)
            .split(path.sep)
            .join('/');
          nodePath.replaceWith(t.stringLiteral(relative));
        } else if (key in literals) {
          nodePath.replaceWith(t.stringLiteral(literals[key]));
        }
      },
    },
  };
}

// Some node_modules ship code that uses `import.meta` directly. When Metro
// emits the web bundle as a regular script (Expo Router single output), the
// browser refuses with "Cannot use 'import.meta' outside a module". Replace
// every `import.meta` expression with `{}` so accessors like `import.meta.url`
// quietly become `undefined` instead of a parse error.
function stripImportMeta({ types: t }) {
  return {
    name: 'strip-import-meta',
    visitor: {
      MetaProperty(nodePath) {
        const node = nodePath.node;
        if (
          t.isIdentifier(node.meta, { name: 'import' }) &&
          t.isIdentifier(node.property, { name: 'meta' })
        ) {
          nodePath.replaceWith(t.objectExpression([]));
        }
      },
    },
  };
}

module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: [inlineExpoRouterEnv, stripImportMeta],
  };
};
