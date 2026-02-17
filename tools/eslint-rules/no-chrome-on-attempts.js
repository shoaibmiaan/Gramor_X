import path from 'node:path';

const ATTEMPT_FILE_PATTERNS = [
  /\/pages\/premium\/listening\/\[[^\]]+\]\.tsx$/,
  /\/pages\/premium\/reading\/\[[^\]]+\]\.tsx$/,
  /\/pages\/writing\/mock\/\[[^\]]+\]\/workspace\.tsx$/,
  /\/pages\/mock\/reading\/\[[^\]]+\]\.tsx$/,
  /\/pages\/mock\/listening\/\[[^\]]+\]\.tsx$/,
  /\/pages\/reading\/\[[^\]]+\]\.tsx$/,
  /\/pages\/listening\/\[[^\]]+\]\.tsx$/,
  /\/pages\/speaking\/simulator\/.*\.tsx$/,
  /\/pages\/speaking\/attempts\/\[[^\]]+\](\/.*)?\.tsx$/
];

const FORBIDDEN_IMPORTS = [
  '@/components/Header',
  '@/components/Footer',
  '@/components/Layout',
  /^@\/components\/layouts\//
];

function isAttemptFile(filename) {
  const normalized = filename.split(path.sep).join('/');
  return ATTEMPT_FILE_PATTERNS.some((re) => re.test(normalized));
}

function isForbidden(source) {
  return FORBIDDEN_IMPORTS.some((rule) =>
    rule instanceof RegExp ? rule.test(source) : rule === source
  );
}

export default {
  rules: {
    'no-chrome-on-attempts': {
      meta: {
        type: 'problem',
        docs: { description: 'No global chrome on live attempt pages' },
        schema: [],
        messages: {
          noChrome: 'Live attempt pages must not import global chrome: "{{name}}".'
        },
      },
      create(context) {
        const filename = context.getFilename();
        if (!isAttemptFile(filename)) return {};
        return {
          ImportDeclaration(node) {
            const source = node.source.value;
            if (typeof source === 'string' && isForbidden(source)) {
              context.report({ node, messageId: 'noChrome', data: { name: source } });
            }
          },
        };
      },
    },
  },
};
