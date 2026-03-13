function isScriptLikeElement(node) {
  const name = node?.parent?.name?.name;
  return name === 'script' || name === 'Script';
}

function isSanitizeCall(expr) {
  if (!expr || expr.type !== 'CallExpression') return false;
  if (expr.callee.type === 'Identifier') {
    return expr.callee.name === 'sanitizeHtml';
  }
  return false;
}

function extractHtmlExpression(node) {
  if (!node?.value || node.value.type !== 'JSXExpressionContainer') return null;
  const expr = node.value.expression;
  if (!expr || expr.type !== 'ObjectExpression') return null;

  const htmlProp = expr.properties.find((prop) => {
    if (prop.type !== 'Property') return false;
    const keyName = prop.key.type === 'Identifier' ? prop.key.name : prop.key.value;
    return keyName === '__html';
  });

  if (!htmlProp || htmlProp.type !== 'Property') return null;
  return htmlProp.value;
}

export default {
  rules: {
    'require-sanitized-dangerous-html': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Require sanitizeHtml(...) for dangerouslySetInnerHTML except script/JSON-LD tags.',
        },
        schema: [],
        messages: {
          mustSanitize:
            'dangerouslySetInnerHTML must use sanitizeHtml(...) for __html values.',
        },
      },
      create(context) {
        return {
          JSXAttribute(node) {
            if (node.name?.name !== 'dangerouslySetInnerHTML') return;
            if (isScriptLikeElement(node)) return;

            const htmlExpr = extractHtmlExpression(node);
            if (!htmlExpr) {
              context.report({ node, messageId: 'mustSanitize' });
              return;
            }

            if (!isSanitizeCall(htmlExpr)) {
              context.report({ node, messageId: 'mustSanitize' });
            }
          },
        };
      },
    },
  },
};
