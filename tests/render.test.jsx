// Server-renders the whole app in Node to catch render-time crashes (e.g. a
// temporal-dead-zone ReferenceError) that esbuild cannot see.
// Run: npm test
import React from 'react';
import { renderToString } from 'react-dom/server';
import App from '../src/App.jsx';

const html = renderToString(React.createElement(App));
const groups = [...html.matchAll(/<optgroup label="([^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
let fails = 0;
const t = (n, c, d = '') => { if (!c) { fails++; console.log('  FAIL', n, d); } else console.log('  ok  ', n); };
t('app renders', html.length > 5000, html.length);
t('Naturalness group in dropdown on first paint', groups.some((g) => g.startsWith('Naturalness')), groups.join(','));
t('Business group in dropdown on first paint', groups.some((g) => g.startsWith('Business')), groups.join(','));
console.log(fails ? `\n${fails} FAILURE(S)\n` : '\nRender checks passed.\n');
process.exit(fails ? 1 : 0);
