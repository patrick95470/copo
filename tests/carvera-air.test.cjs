const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function engine() {
  const context = {
    I18N_EN: {}, tr: s => s, S: { meta: { name: 'Test' } },
    originOf: s => s.origin || [0, 0], rpmClamp: Math.round,
  };
  vm.createContext(context);
  // Load the shipped parser, built-in library and public generator dispatch.
  const start = html.indexOf('const VP_BLOCKS =');
  const end = html.indexOf('function makeGcode(tps, tools, stock, M, faceMode)');
  const dispatchEnd = html.indexOf('  const RT =', end);
  vm.runInContext(html.slice(start, end) + html.slice(end, dispatchEnd) + '\n}', context);
  return context;
}
const tool = { id: 'one', num: 1, name: 'Tool 1', feed: 300, plunge: 100, rpm: 10000 };
const nextTool = { ...tool, id: 'two', num: 2, rpm: 12000 };
const moves = [
  { g: 0, x: 0, y: 0, z: 10 },
  { g: 0, x: 10, y: 0, z: 2 },
  { g: 1, x: 10, y: 0, z: -1, f: 100 },
  { g: 1, x: 20, y: Math.PI * 10, z: -1, f: 300 },
  { g: 4, p: 0.2 },
  { g: 0, x: 20, y: Math.PI * 10, z: 10 },
];
const stock = { w: 100, h: Math.PI * 40, t: 40, originZ: 'top', rotary: { on: false } };
const rotary = { ...stock, rotary: { on: true, axis: 'x', z0: 'axis' } };
const tps = [{ name: 'First', toolId: 'one', moves }, { name: 'Second', toolId: 'one', moves }, { name: 'Third', toolId: 'two', moves }];
function generate(e, axes, st = axes === 4 ? rotary : stock, paths = tps) {
  return e.makeGcode(paths, [tool, nextTool], st, { post: `vp_carvera_air_${axes}axis`, safeZ: 10, rapid: 3000, arcs: false });
}
test('inline JavaScript syntax is valid', () => {
  for (const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) if (m[1].trim()) new vm.Script(m[1]);
});
for (const axes of [3, 4]) test(`${axes}-axis built-in: complete output, tools and safe rapid positioning`, () => {
  const e = engine(), gc = generate(e, axes);
  assert.match(gc, /G21\r?\nG90\r?\nG17\r?\nG94\r?\nG54/);
  assert.match(gc, /T1 M6/); assert.match(gc, /T2 M6/);
  assert.match(gc, /S12000 M3/); assert.match(gc, /G4P0\.200/);
  assert.doesNotMatch(gc, /\[[^\]]+\]|NaN|undefined|Infinity/);
  assert.doesNotMatch(gc, /\bG(?:28|53|93|91\.1)\b/);
  assert.doesNotMatch(gc, /G0[^\r\n]*X[^\r\n]*Z/);
  assert.match(gc, new RegExp(`G0Z${axes === 4 ? '30' : '10'}\\.000\\r?\\nM5\\r?\\nM30`));
  const d = e.vpParse(vm.runInContext(`POSTS.vp_carvera_air_${axes}axis.vp`, e));
  assert.ok(d.ok); assert.equal(d.ignored.length, 0);
  if (axes === 4) {
    assert.match(gc, /G0Y0/); assert.match(gc, /A-90\.000Z19\.000F300\.0/);
    assert.doesNotMatch(gc.replace(/\([^)]*\)/g, '').replace('G0Y0', ''), /Y[-\d]/);
  } else { assert.match(gc, /Z-1\.000/); assert.doesNotMatch(gc, /A[-\d]/); }
});
test('4-axis conversion uses actual diameter, center-origin offset and signed angles', () => {
  const e = engine();
  const st = { ...rotary, t: 80, origin: [0, 10] };
  const gc = generate(e, 4, st, [{ name: 'Wrap', toolId: 'one', moves: [{ g: 0, x: 0, y: 10, z: 10 }, { g: 1, x: 0, y: 10 + Math.PI * 40, z: -2, f: 50 }] }]);
  assert.match(gc, /A-180\.000Z38\.000F50\.0/);
  assert.match(gc, /G0Z50\.000/);
});
test('incompatible Carvera setups produce a stop with no motion or spindle start', () => {
  const e = engine();
  const cases = [[3, rotary], [4, stock], [4, { ...rotary, t: 0 }], [4, { ...rotary, rotary: { ...rotary.rotary, axis: 'y' } }], [4, { ...rotary, rotary: { ...rotary.rotary, z0: 'surface' } }], [4, { ...rotary, originZ: 'bottom' }]];
  for (const [axes, st] of cases) {
    const gc = generate(e, axes, st);
    assert.match(gc, /Carvera Air/); assert.match(gc, /\nM30\n$/);
    assert.doesNotMatch(gc.replace(/\([^\n]*\)/g, ''), /G[0123]|M3\b|M6/);
  }
});
test('empty toolpaths emit no machining program', () => {
  assert.equal(generate(engine(), 3, stock, []), '');
  assert.equal(generate(engine(), 4, rotary, []), '');
});
test('existing built-in posts remain selectable', () => {
  assert.equal(vm.runInContext('POSTS.mach3.m6', engine()), 'T{T} M6');
  assert.equal(vm.runInContext('POSTS.grbl.ext', engine()), 'nc');
});
