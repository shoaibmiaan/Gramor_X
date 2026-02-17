const createRule = (context, options) => {
  const allow = new Set(options?.allowElements ?? []);

  return {
    JSXAttribute(node) {
      if (node.name.name !== 'style') {
        return;
      }

      const parentName = node.parent?.name?.name;
      if (typeof parentName === 'string' && allow.has(parentName)) {
        return;
      }

      context.report({
        node,
        messageId: 'noInlineStyle',
      });
    },
  };
};

export default {
  rules: {
    'no-inline-style': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Disallow inline style props to enforce design system tokens.',
        },
        schema: [
          {
            type: 'object',
            properties: {
              allowElements: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            additionalProperties: false,
          },
        ],
        messages: {
          noInlineStyle: 'Inline style props are not allowed. Use design-system utilities or tokens.',
        },
      },
      create(context) {
        const options = context.options?.[0];
        return createRule(context, options);
      },
    },
  },
};
