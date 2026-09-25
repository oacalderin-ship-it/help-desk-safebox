/* Optional developer test. Requires Playwright + Chromium, not used by the app. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
  const options={headless:true};
  if(process.env.SAFEBOX_CHROMIUM_PATH){options.executablePath=process.env.SAFEBOX_CHROMIUM_PATH;options.args=['--no-sandbox'];}
  const browser=await chromium.launch(options);
  const page=await browser.newPage({viewport:{width:1440,height:1100}});
  const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  const appURL=process.env.SAFEBOX_TEST_URL || pathToFileURL(path.resolve(__dirname,'../index.html')).href;
  await page.goto(appURL);
  const initialRequests=requests.length;
  assert.equal(await page.locator('#strict').isChecked(),true);
  assert.equal(await page.locator('#copyPrompt').isDisabled(),true);
  await page.click('#demo');await page.click('#scan');
  const demo=await page.locator('#sanitized').inputValue();
  assert.ok(demo.includes('Windows 11 24H2'));assert.ok(demo.includes('0x80070035'));assert.ok(demo.includes('Rebooted workstation'));
  for(const value of ['Jordan','Contoso','904','JAX-WS','CONTOSO-FS'])assert.ok(!demo.includes(value));
  assert.equal(await page.locator('#copyPrompt').isDisabled(),true);
  await page.check('#review');assert.equal(await page.locator('#copyPrompt').isEnabled(),true);
  // Test successful Clipboard API path without relying on host clipboard permissions.
  await page.evaluate(()=>{window.testCopied='';Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.testCopied=text;}}});});
  await page.click('#copyPrompt');assert.equal(await page.locator('#copyPrompt').textContent(),'Copied ✓');
  assert.equal(await page.evaluate(()=>window.testCopied),await page.locator('#prompt').inputValue());
  await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('Denied in test');}}});});
  await page.click('#copyPrompt');assert.equal(await page.locator('#copyPrompt').textContent(),'Copied ✓');
  await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>document.activeElement.tagName==='BUTTON'));
  await page.locator('#sanitized').fill(demo+'\nMore symptoms.');assert.equal(await page.locator('#review').isChecked(),false);assert.equal(await page.locator('#copyPrompt').isDisabled(),true);
  await page.check('#review');await page.locator('#raw').fill('Email: new@example.test');assert.equal(await page.locator('#review').isChecked(),false);assert.equal(await page.locator('#prompt').inputValue(),'');
  await page.locator('.additional summary').click();await page.locator('#notes').fill('Called private@example.test at 904-555-1212');await page.click('#scan');
  const notes=await page.locator('#prompt').inputValue();assert.ok(!notes.includes('private@example.test'));assert.ok(notes.includes('[PHONE]'));
  await page.check('#review');await page.locator('#notes').fill('Changed');assert.equal(await page.locator('#copyPrompt').isDisabled(),true);
  await page.locator('.settings summary').click();await page.uncheck('#strict');assert.equal(await page.locator('#strictWarning').isVisible(),true);
  await page.click('#resetSettings');assert.equal(await page.locator('#strict').isChecked(),true);
  await page.click('#scan');await page.check('#review');
  for(const mode of ['questions','next','escalation','resolution','troubleshoot']){
    await page.locator('label').filter({has:page.locator('[name="mode"][value="'+mode+'"]')}).click();
    assert.ok((await page.locator('#prompt').inputValue()).includes('BEGIN SANITIZED TICKET'));
  }
  const storage=await page.evaluate(()=>({local:{...localStorage},session:{...sessionStorage}}));
  assert.deepEqual(Object.keys(storage.local),['verity.safebox.promptMode.v1']);assert.deepEqual(storage.session,{});
  await page.click('#rescan');assert.equal(await page.locator('#review').isChecked(),false);
  await page.check('#review');await page.click('#clearPrompt');assert.equal(await page.locator('#copyPrompt').isDisabled(),true);await page.click('#regenerate');assert.ok(await page.locator('#prompt').inputValue());
  await page.click('#clearAll');for(const id of ['raw','notes','sanitized','prompt','custom'])assert.equal(await page.locator('#'+id).inputValue(),'');
  await page.locator('#raw').fill('<img src=x onerror="window.bad=true">');await page.click('#scan');assert.equal(await page.evaluate(()=>window.bad),undefined);
  // Missing logo gracefully falls back even after initial load.
  await page.locator('#logo').evaluate(el=>el.dispatchEvent(new Event('error')));assert.equal(await page.locator('#logoFallback').isVisible(),true);
  assert.equal(requests.length,initialRequests,'No requests during interaction');
  for(const width of [1440,1000,768,390,320]){await page.setViewportSize({width,height:950});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No horizontal overflow at '+width);}
  await page.setViewportSize({width:1440,height:1100});await page.reload();await page.click('#demo');await page.click('#scan');
  if(process.env.SAFEBOX_SCREENSHOT)await page.screenshot({path:process.env.SAFEBOX_SCREENSHOT,fullPage:true});
  assert.deepEqual(errors,[]);
  await browser.close();console.log('PASS: browser workflow, review resets, clipboard API, modes, storage, XSS, logo fallback, network inactivity, and five responsive widths.');
})().catch(error=>{console.error(error);process.exit(1);});
