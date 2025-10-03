import { strict as assert } from 'node:assert';

import { toSupportedLocale } from '../../components/common/LocaleSwitcher';

assert.equal(toSupportedLocale('en'), 'en');
assert.equal(toSupportedLocale('ur'), 'ur');

// Unsupported locales should fall back to the default supported locale.
assert.equal(toSupportedLocale('ar'), 'en');
assert.equal(toSupportedLocale('fr'), 'en');

console.log('Locale switcher helper validates supported locales');
