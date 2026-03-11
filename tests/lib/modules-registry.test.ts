import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

import {
  getDashboardModuleCards,
  getMarketingModuleCards,
  moduleRegistry,
} from '../../lib/modules/registry';

const ROOT = process.cwd();

const routeExists = (route: string): boolean => {
  const clean = route.replace(/\?.*$/, '').replace(/\/$/, '');
  if (clean === '' || clean === '/') return true;

  const normalized = clean.replace(/^\//, '');
  const candidates = [
    path.join(ROOT, 'pages', `${normalized}.tsx`),
    path.join(ROOT, 'pages', normalized, 'index.tsx'),
  ];

  return candidates.some((file) => fs.existsSync(file));
};

const allCards = [...getMarketingModuleCards(), ...getDashboardModuleCards()];

assert.ok(allCards.length > 0, 'Expected module cards to be rendered from registry-backed helpers.');

for (const card of allCards) {
  const entry = moduleRegistry[card.id];
  assert.ok(entry, `Module card "${card.id}" is missing from moduleRegistry.`);
  assert.equal(card.title, entry.label, `Module card "${card.id}" title should come from registry.`);
  assert.equal(card.icon, entry.icon, `Module card "${card.id}" icon should come from registry.`);
  assert.equal(card.href, entry.baseRoute, `Module card "${card.id}" href should map to baseRoute.`);
  assert.equal(routeExists(card.href), true, `Route "${card.href}" for "${card.id}" does not exist in pages/.`);
}

console.log('module registry cards map cleanly to registry entries and existing routes');
