import { strict as assert } from 'node:assert';

import { isGuestOnlyRoute, isPublicRoute } from '../../lib/routeAccess';

assert.equal(isPublicRoute('/roadmap'), true);
assert.equal(isPublicRoute('/roadmap/'), true);
assert.equal(isPublicRoute('/pricing?ref=homepage'), true);

assert.equal(isGuestOnlyRoute('/login'), true);
assert.equal(isGuestOnlyRoute('/login/reset'), true);
assert.equal(isGuestOnlyRoute('/signup/teacher'), true);
assert.equal(isGuestOnlyRoute('/forgot-password'), true);

assert.equal(isPublicRoute('/dashboard'), false);
assert.equal(isGuestOnlyRoute('/dashboard'), false);

console.log('routeAccess guards handle marketing and auth routes correctly');
