// ESLint custom rule to enforce design system consistency
// Add this to your .eslintrc.js rules configuration

module.exports = {
  'design-system-consistency': {
    meta: {
      type: 'suggestion',
      docs: {
        description: 'Enforce Gramor_X design system consistency',
        category: 'Stylistic Issues',
        recommended: true,
      },
      fixable: 'code',
      schema: [],
      messages: {
        hardCodedColor: 'Use design system color token instead of hard-coded Tailwind color "{{ color }}". Use "{{ suggestion }}" instead.',
        arbitraryColor: 'Avoid arbitrary color values "{{ color }}". Use design system tokens instead.',
        rawTypography: 'Use semantic typography token instead of raw Tailwind size "{{ size }}". Use "{{ suggestion }}" instead.',
        inconsistentSpacing: 'Use standardized spacing values. Avoid "{{ spacing }}".',
        missingDarkMode: 'Component should support dark mode using design system tokens.',
      },
    },
    
    create(context) {
      const hardCodedColors = {
        'bg-red-500': 'bg-danger',
        'bg-red-600': 'bg-danger', 
        'text-red-500': 'text-danger',
        'text-red-600': 'text-danger',
        'bg-emerald-500': 'bg-success',
        'bg-emerald-600': 'bg-success',
        'bg-green-500': 'bg-success',
        'bg-green-600': 'bg-success',
        'text-emerald-500': 'text-success',
        'text-emerald-600': 'text-success',
        'text-green-500': 'text-success',
        'text-green-600': 'text-success',
        'bg-blue-500': 'bg-electricBlue',
        'bg-blue-600': 'bg-electricBlue',
        'text-blue-500': 'text-electricBlue',
        'text-blue-600': 'text-electricBlue',
        'bg-amber-500': 'bg-warning',
        'text-amber-500': 'text-warning',
        'bg-gray-500': 'bg-grayish',
        'bg-gray-600': 'bg-grayish',
        'text-gray-500': 'text-grayish',
        'text-gray-600': 'text-grayish',
      };

      const typographyMapping = {
        'text-xs': 'text-caption',
        'text-sm': 'text-small', 
        'text-base': 'text-body',
        'text-lg': 'text-h4',
        'text-xl': 'text-h3',
        'text-2xl': 'text-h2',
        'text-3xl': 'text-h1',
        'text-4xl': 'text-display',
        'text-5xl': 'text-displayLg',
      };

      const invalidSpacing = [
        'px-5', 'py-5', 'p-5', 'm-5', 'mx-5', 'my-5',
        'px-7', 'py-7', 'p-7', 'm-7', 'mx-7', 'my-7', 
        'px-9', 'py-9', 'p-9', 'm-9', 'mx-9', 'my-9',
        'gap-5', 'gap-7', 'gap-9', 'space-x-5', 'space-y-5',
      ];

      function checkClassName(node, classNameValue) {
        if (!classNameValue || typeof classNameValue !== 'string') return;

        const classes = classNameValue.split(/\\s+/);

        classes.forEach(className => {
          // Check for hard-coded colors
          if (hardCodedColors[className]) {
            context.report({
              node,
              messageId: 'hardCodedColor',
              data: {
                color: className,
                suggestion: hardCodedColors[className],
              },
              fix(fixer) {
                return fixer.replaceText(
                  node,
                  node.raw.replace(className, hardCodedColors[className])
                );
              },
            });
          }

          // Check for arbitrary colors
          if (/^(?:bg|text|border)-\\[#[0-9a-fA-F]{6}\\]$/.test(className)) {
            context.report({
              node,
              messageId: 'arbitraryColor',
              data: { color: className },
            });
          }

          // Check for raw typography
          if (typographyMapping[className]) {
            context.report({
              node,
              messageId: 'rawTypography',
              data: {
                size: className,
                suggestion: typographyMapping[className],
              },
              fix(fixer) {
                return fixer.replaceText(
                  node,
                  node.raw.replace(className, typographyMapping[className])
                );
              },
            });
          }

          // Check for inconsistent spacing
          if (invalidSpacing.includes(className)) {
            context.report({
              node,
              messageId: 'inconsistentSpacing',
              data: { spacing: className },
            });
          }
        });
      }

      return {
        JSXAttribute(node) {
          if (node.name.name === 'className' && node.value) {
            if (node.value.type === 'Literal') {
              checkClassName(node.value, node.value.value);
            } else if (
              node.value.type === 'JSXExpressionContainer' &&
              node.value.expression.type === 'Literal'
            ) {
              checkClassName(node.value.expression, node.value.expression.value);
            } else if (
              node.value.type === 'JSXExpressionContainer' &&
              node.value.expression.type === 'TemplateLiteral'
            ) {
              // Handle template literals with className={`...`}
              node.value.expression.quasis.forEach(quasi => {
                checkClassName(quasi, quasi.value.raw);
              });
            }
          }
        },

        CallExpression(node) {
          // Check cx() calls and similar utility functions
          if (
            node.callee.name === 'cx' ||
            node.callee.name === 'cn' ||
            node.callee.name === 'clsx'
          ) {
            node.arguments.forEach(arg => {
              if (arg.type === 'Literal' && typeof arg.value === 'string') {
                checkClassName(arg, arg.value);
              }
            });
          }
        },
      };
    },
  },
};