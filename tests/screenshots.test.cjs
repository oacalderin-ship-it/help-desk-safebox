/* Optional developer test: Playwright/Chromium required only for this suite. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {pathToFileURL}=require('node:url');
(async()=>{
  const options={headless:true};if(process.env.SAFEBOX_CHROMIUM_PATH){options.executablePath=process.env.SAFEBOX_CHROMIUM_PATH;options.args=['--no-sandbox'];}
  const browser=await chromium.launch(options),page=await browser.newPage({viewport:{width:1440,height:1100}});
  const errors=[],network=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
  await page.goto(process.env.SAFEBOX_TEST_URL||pathToFileURL(path.resolve(__dirname,'../index.html')).href);
  const initial=network.length;
  const fixture=fs.readFileSync(path.join(__dirname,'fixtures/fictional-error.png'));
  await page.setInputFiles('#imageFiles',{name:'customer-identity-must-not-leak.png',mimeType:'image/png',buffer:fixture});
  assert.equal(await page.locator('#scan').isDisabled(),true);
  await page.waitForFunction(()=>document.querySelector('.screenshot-card textarea')?.value.includes('0x80070035'),{},{timeout:120000});
  assert.equal(await page.locator('#scan').isEnabled(),true);
  assert.ok((await page.locator('.screenshot-card textarea').inputValue()).includes('Windows 11 24H2'));
  await page.click('#scan');const sanitized=await page.locator('#sanitized').inputValue(),prompt=await page.locator('#prompt').inputValue();
  for(const v of ['jordan@example.test','JAX-WS-042','customer-identity-must-not-leak'])assert.ok(!prompt.includes(v));
  assert.ok(sanitized.includes('[EMAIL]'));assert.ok(sanitized.includes('0x80070035'));assert.ok(sanitized.includes('rebooted workstation'));
  await page.check('#review');assert.equal(await page.locator('#copyPrompt').isEnabled(),true);
  await page.locator('.screenshot-card textarea').fill('Error 1603 for private@example.test');assert.equal(await page.locator('#review').isChecked(),false);assert.equal(await page.locator('#prompt').inputValue(),'');
  await page.click('#scan');assert.ok(!(await page.locator('#prompt').inputValue()).includes('private@example.test'));
  await page.check('#review');await page.getByRole('button',{name:'Use full extraction',exact:true}).click();assert.equal(await page.locator('#copyPrompt').isDisabled(),true);
  await page.getByRole('button',{name:'Suggest technical context',exact:true}).click();await page.click('#scan');
  assert.equal(network.length,initial,'No HTTP requests during screenshot use, including worker recognition');
  assert.deepEqual(await page.evaluate(()=>({...sessionStorage})),{});
  assert.deepEqual(await page.evaluate(()=>({...localStorage})),{});
  assert.deepEqual(await page.evaluate(async()=>await indexedDB.databases()),[]);
  if(process.env.SAFEBOX_SCREENSHOT)await page.screenshot({path:process.env.SAFEBOX_SCREENSHOT,fullPage:true});
  for(const width of [1440,768,390,320]){await page.setViewportSize({width,height:950});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Screenshot layout at '+width);}
  await page.getByRole('button',{name:'Remove screenshot 1',exact:true}).click();assert.equal(await page.locator('.screenshot-card').count(),0);assert.equal(await page.locator('#prompt').inputValue(),'');
  // Hold recognition open to deterministically test Clear All against an active job.
  await page.evaluate(()=>{window.ocrCancelled=false;window.SafeboxOCR.recognize=()=>{let fail;return {promise:new Promise((resolve,reject)=>{fail=reject;window.finishOCR=resolve;}),cancel(){window.ocrCancelled=true;fail(new Error('cancelled'));}};};});
  await page.setInputFiles('#imageFiles',{name:'test.png',mimeType:'image/png',buffer:fixture});
  await page.waitForFunction(()=>typeof window.finishOCR==='function');await page.click('#clearAll');
  assert.equal(await page.evaluate(()=>window.ocrCancelled),true);
  await page.evaluate(()=>window.finishOCR('Late secret@example.test'));
  assert.equal(await page.locator('.screenshot-card').count(),0);assert.equal(await page.locator('#prompt').inputValue(),'');assert.equal(await page.locator('#scan').isEnabled(),true);
  // Image clipboard paste queues a screenshot; text paste behavior is not intercepted.
  await page.locator('#raw').evaluate((el,bytes)=>{const file=new File([new Uint8Array(bytes)],'clipboard.png',{type:'image/png'});const data=new DataTransfer();data.items.add(file);el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));},[...fixture]);
  assert.equal(await page.locator('.screenshot-card').count(),1);await page.click('#clearAll');
  await page.setInputFiles('#imageFiles',{name:'bad.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')});assert.equal(await page.locator('.screenshot-card').count(),0);
  await page.setInputFiles('#imageFiles',{name:'huge.png',mimeType:'image/png',buffer:Buffer.alloc(10*1024*1024+1)});assert.equal(await page.locator('.screenshot-card').count(),0);
  const files=Array.from({length:5},(_,i)=>({name:'image'+i+'.png',mimeType:'image/png',buffer:fixture}));await page.setInputFiles('#imageFiles',files);assert.equal(await page.locator('.screenshot-card').count(),4);await page.click('#clearAll');
  assert.deepEqual(errors,[]);await browser.close();console.log('PASS: real local OCR, useful context, sanitization, review resets, image removal, clipboard paste, cancellation, limits, no network/persistence, responsive screenshot cards.');
})().catch(error=>{console.error(error);process.exit(1);});
