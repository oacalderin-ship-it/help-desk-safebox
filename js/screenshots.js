(function(root){
  'use strict';
  const MAX_IMAGES=4, MAX_BYTES=10*1024*1024, MAX_PIXELS=16000000;
  function init({onChange,onBusyChange}){
    const $=id=>document.getElementById(id), list=$('screenshotList'), picker=$('imageFiles'), drop=$('imageDrop');
    let items=[], sequence=0, queue=Promise.resolve();
    const live=message=>{$('ocrStatus').textContent=message;};
    function update(){
      $('screenshotCount').textContent=items.length?'· '+items.length+' image'+(items.length===1?'':'s'):'· optional';
      const busy=items.some(item=>['queued','reading'].includes(item.state));
      onBusyChange(busy);
    }
    function contextChanged(){onChange();update();}
    function make(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;}
    function remove(item){
      item.removed=true;item.job?.cancel();URL.revokeObjectURL(item.url);item.url='';item.file=null;item.full='';item.editor.value='';item.fullText.textContent='';item.card.remove();items=items.filter(x=>x!==item);contextChanged();live('Screenshot removed. Scan again to refresh the sanitized output.');
    }
    function cardFor(item){
      const card=make('article','screenshot-card'), header=make('header'), heading=make('div');
      const title=make('h3','', 'Screenshot '+item.id), badge=make('span','badge danger','RAW IMAGE · NOT FOR AI');heading.append(title,badge);
      const removeButton=make('button','quiet','Remove');removeButton.type='button';removeButton.setAttribute('aria-label','Remove screenshot '+item.id);removeButton.addEventListener('click',()=>remove(item));header.append(heading,removeButton);
      const status=make('p','helper','Queued for local text recognition…'), progress=make('progress');progress.max=1;progress.value=0;progress.setAttribute('aria-label','Screenshot '+item.id+' recognition progress');
      const imageDetails=make('details'), imageSummary=make('summary','','View original screenshot — raw'), image=make('img');image.src=item.url;image.alt='Original screenshot '+item.id+' — may contain sensitive information';imageDetails.append(imageSummary,image);
      const body=make('div');body.hidden=true;
      const label=make('label','eyebrow','CONTEXT TO INCLUDE · RAW');label.htmlFor='image-context-'+item.id;
      const editor=make('textarea');editor.id=label.htmlFor;editor.rows=6;editor.maxLength=30000;editor.spellcheck=false;editor.autocomplete='off';editor.placeholder='Correct OCR errors and retain only useful troubleshooting details.';
      editor.addEventListener('input',()=>{contextChanged();live('Screenshot context changed. Scan again before reviewing or copying.');});
      const note=make('p','helper'), actions=make('div','actions context-controls'), suggest=make('button','','Suggest technical context'), all=make('button','','Use full extraction');
      suggest.addEventListener('click',()=>{applySuggestion(item);contextChanged();});
      all.addEventListener('click',()=>{editor.value=item.full;note.textContent='Full extracted text selected. Trim irrelevant or identifying details, then scan.';contextChanged();});actions.append(suggest,all);
      const fullDetails=make('details'), fullSummary=make('summary','','Compare full extracted text — raw'), fullText=make('pre');fullDetails.append(fullSummary,fullText);
      body.append(label,editor,note,actions,fullDetails);card.append(header,status,progress,imageDetails,body);
      Object.assign(item,{card,status,progress,editor,body,note,fullText});return card;
    }
    function applySuggestion(item){
      const suggestion=SafeboxContext.suggestContext(item.full);item.editor.value=suggestion.text;
      item.note.textContent=suggestion.fallback?'No clear technical lines found. All extracted text retained; choose the relevant details yourself.':'Suggested '+suggestion.kept+' of '+suggestion.total+' nonempty lines, including nearby context. Compare with the full extraction before scanning.';
    }
    async function prepareImage(file){
      const bitmap=await createImageBitmap(file);
      try{
        if(bitmap.width*bitmap.height>MAX_PIXELS)throw new Error('dimensions');
        // Opaque PNG pixels discard filenames/metadata and keep all processing in memory.
        const scale=Math.min(2,Math.max(1,1800/bitmap.width),Math.sqrt(MAX_PIXELS/(bitmap.width*bitmap.height)));
        const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
        const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
        const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));canvas.width=canvas.height=0;
        if(!blob)throw new Error('decode');return new Uint8Array(await blob.arrayBuffer());
      }finally{bitmap.close();}
    }
    async function process(item){
      if(item.removed)return;
      item.state='reading';item.status.textContent='Reading screenshot text on this device…';update();
      try{
        const pixels=await prepareImage(item.file);item.file=null;if(item.removed)return;
        item.job=SafeboxOCR.recognize(pixels,progress=>{if(!item.removed){item.progress.value=progress;item.status.textContent='Reading screenshot text… '+Math.round(progress*100)+'%';}});
        const result=await item.job.promise;
        if(item.removed)return;
        item.full=result.trim();
        if(item.full.length>30000){item.full='';throw new Error('text-limit');}
        if(!item.full){item.state='failed';item.status.textContent='No readable text found. Try a tighter, higher-resolution crop or type the relevant details into the ticket.';live('No screenshot text found.');}
        else{item.state='ready';item.fullText.textContent=item.full;item.body.hidden=false;applySuggestion(item);item.status.textContent='Text extracted locally. Verify error codes and identifying details against the original.';live('Screenshot '+item.id+' extracted. Review the suggested context, then Scan & Sanitize.');}
        contextChanged();
      }catch(error){
        if(!item.removed){item.state='failed';item.status.textContent=error.message==='dimensions'?'Image exceeds 16 megapixels. Crop or resize it before adding.':error.message==='text-limit'?'Too much extracted text. Crop the screenshot to the relevant error or window.':'Could not read this image locally. Try a clear PNG/JPEG crop, or type the relevant details. No image was uploaded.';live('Screenshot recognition did not complete.');contextChanged();}
      }finally{item.job?.cancel();item.job=null;item.progress.hidden=true;update();}
    }
    function addFiles(files){
      const accepted=[];let skipped=0;
      for(const file of files){
        if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>MAX_BYTES||!file.size||items.length>=MAX_IMAGES){skipped++;continue;}
        const item={id:++sequence,file,url:URL.createObjectURL(file),full:'',state:'queued',removed:false};items.push(item);accepted.push(item);list.append(cardFor(item));
      }
      picker.value='';
      if(accepted.length){$('screenshotSection').open=true;contextChanged();accepted.forEach(item=>{queue=queue.catch(()=>{}).then(()=>process(item));});}
      live(skipped?'Some files were skipped. Choose PNG, JPEG, or WebP up to 10 MB each; maximum 4 screenshots.':accepted.length?'Screenshots queued. Text recognition stays on this device.':'No supported screenshot selected.');
    }
    picker.addEventListener('change',()=>addFiles([...picker.files]));drop.addEventListener('click',()=>picker.click());drop.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();picker.click();}});
    ['dragenter','dragover'].forEach(name=>drop.addEventListener(name,event=>{event.preventDefault();drop.classList.add('dragging');}));
    ['dragleave','drop'].forEach(name=>drop.addEventListener(name,event=>{event.preventDefault();drop.classList.remove('dragging');}));
    drop.addEventListener('drop',event=>addFiles([...event.dataTransfer.files]));
    // Only explicit image pastes in the raw/source area are intercepted. Plain text pastes remain normal.
    document.addEventListener('paste',event=>{
      if(!event.target.closest('.raw-section'))return;
      const files=[...(event.clipboardData?.items||[])].filter(item=>item.kind==='file' && item.type.startsWith('image/')).map(item=>item.getAsFile()).filter(Boolean);
      if(files.length){event.preventDefault();addFiles(files);}
    });
    function clear(){
      items.forEach(item=>{item.removed=true;item.job?.cancel();URL.revokeObjectURL(item.url);item.url='';item.file=null;item.full='';item.editor.value='';item.fullText.textContent='';});
      items=[];list.replaceChildren();picker.value='';sequence=0;update();live('English text recognition · local processing');
    }
    return {clear,markScanned(){if(items.some(item=>item.state==='ready'))live('Screenshot context included in this scan. Review the sanitized output before copying.');},isBusy:()=>items.some(item=>['queued','reading'].includes(item.state)),getContext:()=>items.filter(item=>item.state==='ready'&&item.editor.value.trim()).map((item,i)=>'SCREENSHOT '+(i+1)+' — EXTRACTED TEXT (verify OCR accuracy):\n'+item.editor.value.trim()).join('\n\n')};
  }
  root.SafeboxScreenshots={init};
})(window);
