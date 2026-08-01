import { strict as assert } from 'node:assert';

import { isGateSatisfied, normalizeSubscriptionTier } from '../../lib/navigation/utils';

assert.equal(normalizeSubscriptionTier('starter'), 'seedling');
assert.equal(normalizeSubscriptionTier('booster'), 'rocket');
assert.equal(normalizeSubscriptionTier('master'), 'owl');
assert.equal(normalizeSubscriptionTier('premium'), 'owl');

assert.equal(
  isGateSatisfied({ requiresAuth: true, minTier: 'rocket' }, { isAuthenticated: true, tier: 'booster' }),
  true,
);
assert.equal(
  isGateSatisfied({ requiresAuth: true, minTier: 'rocket' }, { isAuthenticated: true, tier: 'starter' }),
  false,
);
assert.equal(
  isGateSatisfied({ requiresAuth: true, minTier: 'seedling' }, { isAuthenticated: true, tier: 'starter' }),
  true,
);
assert.equal(
  isGateSatisfied({ requiresAuth: true, minTier: 'owl' }, { isAuthenticated: true, tier: 'master' }),
  true,
);

console.log('navigation plan gates normalize canonical plan ids and subscription tier aliases correctly');
