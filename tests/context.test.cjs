const assert=require('node:assert/strict');require('../js/screenshot-context.js');
const suggest=SafeboxContext.suggestContext;
assert.equal(suggest('Error 0x80070035\nThe network path was not found.\nAlready tried: rebooted workstation.').text,'Error 0x80070035\nThe network path was not found.\nAlready tried: rebooted workstation.');
assert.equal(suggest('Only a generic caption').fallback,true);
assert.equal(suggest('Repeated line\nRepeated line').text,'Repeated line');
assert.ok(!suggest('Bookmarks\nFavorites\nHome\nMenu\nError 1603\nInstall failed\nExit').text.includes('Bookmarks'));
assert.ok(suggest('Windows 11 24H2\nError 0x80070035\nOther users unaffected').text.includes('Other users unaffected'));
assert.equal(suggest('').text,'');
console.log('PASS: 6 context-selection checks');
