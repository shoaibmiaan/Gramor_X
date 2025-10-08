module.exports = {
  rules: {
    'color-no-hex': true,
    'unit-disallowed-list': [
      'px',
      {
        ignoreFunctions: ['url'],
      },
    ],
  },
};
