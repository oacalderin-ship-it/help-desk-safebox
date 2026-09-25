(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const raw=$('raw'), notes=$('notes'), sanitized=$('sanitized'), prompt=$('prompt'), review=$('review');
  let scanned=false, revision=0, copyTimer, screenshotBusy=false;
  const screenshots=SafeboxScreenshots.init({onChange:invalidateSource,onBusyChange:busy=>{screenshotBusy=busy;syncControls();}});
  const categories={user:'Identity',username:'Identity',secret:'Identity',email:'Contact information',phone:'Contact information',ip:'Network information',ipv6:'Network information',mac:'Network information',url:'Network information',networkPath:'Network information',domain:'Network information',hostname:'System identifiers',workstation:'System identifiers',server:'System identifiers',ticket:'System identifiers',company:'Customer / organization',location:'Customer / organization',custom:'Custom redactions',possibleSensitive:'Possible sensitive text'};
  const names={user:'User identifiers',username:'Usernames',secret:'Labeled credentials',email:'Email addresses',phone:'Phone numbers',ip:'IPv4 addresses',ipv6:'IPv6 addresses',mac:'MAC addresses',url:'URLs',networkPath:'Network paths',domain:'Domains',hostname:'Hostnames / domains',workstation:'Workstations',server:'Servers',ticket:'Ticket identifiers',company:'Organizations',location:'Locations',custom:'Custom terms',possibleSensitive:'Phrases to review'};
  const demo=String.raw`Contact: Jordan Example
Company: Contoso Test Services
Phone: (904) 555-0199
Email: jordan@example.test
Computer: JAX-WS-042
Server: CONTOSO-FS01

User reports that a mapped drive at
\\CONTOSO-FS01\Accounting
stopped working after a password change.

Windows 11 24H2.
Error 0x80070035.

Already attempted:
- Rebooted workstation
- Disconnected and reconnected VPN
- Verified internet connectivity

Other users are currently unaffected.`;
  function announce(message){$('status').textContent=message;}
  function selectedMode(){return document.querySelector('input[name="mode"]:checked').value;}
  function syncControls(){
    const hasText=scanned && !screenshotBusy && !!sanitized.value.trim();
    $('scan').disabled=screenshotBusy;
    review.disabled=!hasText;
    $('rescan').disabled=!hasText;
    $('regenerate').disabled=!hasText;
    $('copyTicket').disabled=!(hasText && review.checked);
    $('copyPrompt').disabled=!(hasText && review.checked && prompt.value);
    $('safeBadge').textContent=review.checked?'REVIEWED FOR COPYING':'SANITIZED — REVIEW REQUIRED';
    $('safeBadge').className='badge '+(review.checked?'success':'amber');
    sanitized.classList.toggle('reviewed',review.checked);
    $('promptState').textContent=!hasText?'Awaiting sanitized text':review.checked?'Reviewed for copying':'Review required';
  }
  function resetReviewState(){
    revision++; review.checked=false;
    clearTimeout(copyTimer); $('copyPrompt').textContent='Copy Safe Prompt';$('copyTicket').textContent='Copy Sanitized Ticket';
    syncControls();
  }
  function build(){prompt.value=scanned?SafeboxPrompts.buildPrompt(sanitized.value,selectedMode()):'';syncControls();}
  function emptyFindings(){const p=document.createElement('p');p.className='empty';p.textContent='Scan a ticket to see what was generalized.';$('findings').replaceChildren(p);$('scanBadge').textContent='AWAITING SCAN';}
  function invalidateSource(){
    scanned=false; sanitized.value='';sanitized.disabled=true;prompt.value='';resetReviewState();emptyFindings();updateCounter();
    announce('Source changed. Scan again before reviewing or copying.');
  }
  function updateCounter(){const length=raw.value.length;$('counter').textContent=length.toLocaleString()+' characters · '+(length?raw.value.split('\n').length:0)+' lines';}
  function displayFindings(result){
    const grouped={};
    Object.entries(result.findings).forEach(([key,items])=>{const category=categories[key]||'Other identifiers';(grouped[category] ||= []).push({label:names[key]||key,count:items.length});});
    $('findings').replaceChildren();
    for(const [category,items] of Object.entries(grouped)){
      const details=document.createElement('details'), summary=document.createElement('summary'), name=document.createElement('span'), count=document.createElement('b'), list=document.createElement('ul');
      name.textContent=category;count.textContent=items.reduce((sum,item)=>sum+item.count,0);summary.append(name,count);
      items.forEach(item=>{const li=document.createElement('li');li.textContent=item.count+' '+item.label.toLowerCase()+(category==='Possible sensitive text'?' flagged for manual review':' generalized');list.append(li);});
      details.append(summary,list);$('findings').append(details);
    }
    if(!Object.keys(grouped).length){const p=document.createElement('p');p.className='empty';p.textContent='No known patterns detected. This does not mean the text is free of identifying information.';$('findings').append(p);}
    $('scanBadge').textContent=result.total+' SANITIZED · '+result.reviewCount+' TO REVIEW';
  }
  function scan(edited=false){
    if(screenshotBusy){announce('Wait for screenshot text recognition, or remove the pending screenshot.');return;}
    const imageContext=screenshots.getContext();
    const source=edited?sanitized.value:raw.value+(notes.value.trim()?'\n\nALREADY TRIED / ADDITIONAL TECH NOTES:\n'+notes.value:'')+(imageContext?'\n\n'+imageContext:'');
    if(!source.trim()){announce('Paste ticket notes before scanning.');return;}
    if(source.length>220000){announce('Text is too long. Please split it into smaller tickets.');return;}
    const result=SafeboxSanitizer.sanitizeTicket(source.trim(),{strict:$('strict').checked,custom:$('custom').value});
    scanned=true;sanitized.disabled=false;sanitized.value=result.text;resetReviewState();displayFindings(result);build();if(!edited)screenshots.markScanned();
    announce(result.total+' items sanitized. '+result.reviewCount+' possible identifying phrases require review. Review the full sanitized text before copying.');
  }
  function clearOutputs(){scanned=false;sanitized.value='';sanitized.disabled=true;prompt.value='';resetReviewState();emptyFindings();}
  function clearAll(){screenshots.clear();raw.value='';notes.value='';$('custom').value='';clearOutputs();updateCounter();announce('Ticket, screenshots, extracted text, notes, custom terms, findings, and prompt cleared. System clipboard is unchanged.');}
  async function copySafeText(kind){
    const isPrompt=kind==='prompt', button=$(isPrompt?'copyPrompt':'copyTicket');
    if(button.disabled || !scanned || !review.checked) return;
    const text=isPrompt?prompt.value:sanitized.value, startedRevision=revision;
    let success=false;
    try{if(navigator.clipboard && window.isSecureContext){await navigator.clipboard.writeText(text);success=true;}}catch{/* Use a local selection fallback when clipboard permissions are unavailable. */}
    if(!success && revision===startedRevision && review.checked){
      const target=isPrompt?prompt:sanitized;const focused=document.activeElement;const start=target.selectionStart,end=target.selectionEnd;
      target.focus();target.select();
      try{success=document.execCommand('copy');}catch{success=false;}
      target.setSelectionRange(start,end);focused?.focus();
    }
    if(revision!==startedRevision){announce('Content changed during copying. Review again; the clipboard may contain the previous reviewed version.');return;}
    if(success){button.textContent='Copied ✓';announce('Copied reviewed '+(isPrompt?'prompt':'ticket')+'. Paste manually into an approved AI tool.');clearTimeout(copyTimer);copyTimer=setTimeout(()=>{ $('copyPrompt').textContent='Copy Safe Prompt';$('copyTicket').textContent='Copy Sanitized Ticket';},2000);}
    else{announce('Clipboard access was blocked. Select the reviewed output and use Ctrl/Cmd + C.');(isPrompt?prompt:sanitized).focus();(isPrompt?prompt:sanitized).select();}
  }
  $('scan').addEventListener('click',()=>scan());$('rescan').addEventListener('click',()=>scan(true));
  [raw,notes,$('custom')].forEach(el=>el.addEventListener('input',invalidateSource));
  sanitized.addEventListener('input',()=>{resetReviewState();build();$('scanBadge').textContent='EDITED · RE-SCAN AVAILABLE';announce('Sanitized text changed. Review confirmation reset.');});
  review.addEventListener('change',()=>{revision++;syncControls();announce(review.checked?'Reviewed. Copying is now enabled.':'Review confirmation removed. Copying is disabled.');});
  $('strict').addEventListener('change',()=>{$('strictWarning').hidden=$('strict').checked;invalidateSource();});
  document.querySelectorAll('input[name="mode"]').forEach(input=>input.addEventListener('change',()=>{revision++;SafeboxStorage.setMode(selectedMode());build();}));
  $('copyPrompt').addEventListener('click',()=>copySafeText('prompt'));$('copyTicket').addEventListener('click',()=>copySafeText('ticket'));
  $('regenerate').addEventListener('click',()=>{build();announce('Prompt regenerated from the current sanitized text.');});
  $('clearPrompt').addEventListener('click',()=>{prompt.value='';resetReviewState();announce('Prompt cleared. Regenerate and confirm review to copy again.');});
  $('clearSafe').addEventListener('click',()=>{clearOutputs();announce('Sanitized output cleared. Scan the source again to continue.');});
  $('clearRaw').addEventListener('click',clearAll);$('clearAll').addEventListener('click',clearAll);
  $('demo').addEventListener('click',()=>{clearAll();raw.value=demo;invalidateSource();announce('Fictional demo loaded. Click Scan & Sanitize.');});
  $('resetSettings').addEventListener('click',()=>{SafeboxStorage.reset();$('strict').checked=true;$('strictWarning').hidden=true;$('custom').value='';document.querySelector('[name="mode"][value="troubleshoot"]').checked=true;invalidateSource();announce('Settings reset. Strict mode is on. Scan again to continue.');});
  document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();scan(document.activeElement===sanitized);}});
  // Do not leave ticket values available through back/forward cache restoration.
  window.addEventListener('pagehide',clearAll);window.addEventListener('pageshow',event=>{if(event.persisted)clearAll();});
  const logo=$('logo');function fallback(){logo.hidden=true;$('logoFallback').hidden=false;}
  logo.addEventListener('error',fallback);if(logo.complete && !logo.naturalWidth)fallback();
  document.querySelector('[name="mode"][value="'+SafeboxStorage.getMode()+'"]').checked=true;
  updateCounter();syncControls();
})();
