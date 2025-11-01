module.exports = {
  extends: [
    require.resolve('stylelint-config-standard'),
    require.resolve('stylelint-config-css-modules'),
  ],
  rules: {
    'color-named': 'never',
    'color-no-hex': true,
    'alpha-value-notation': 'number',
    'selector-class-pattern': null,
  },
};
