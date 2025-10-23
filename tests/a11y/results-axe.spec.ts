import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';

import ExportButton from '@/components/writing/ExportButton';

test('export button is labelled for accessibility', () => {
  const markup = renderToStaticMarkup(<ExportButton attemptId="attempt-1" />);
  assert.ok(/export pdf/i.test(markup));
});
