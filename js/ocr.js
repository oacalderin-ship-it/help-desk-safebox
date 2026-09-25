(function(root){
  'use strict';
  // The worker is built only from bundled, trusted code. No image content becomes JavaScript.
  const workerCode=`
self.onmessage=async function(event){
  let module, api;
  try {
    self.postMessage({type:'progress',value:0.05});
    module=await TesseractCore({print:function(){},printErr:function(){},TesseractProgress:function(value){self.postMessage({type:'progress',value:0.25+Math.max(0,Math.min(1,(value-30)/70))*0.7});}});
    module.FS.writeFile('/eng.traineddata',event.data.language);
    api=new module.TessBaseAPI();
    if(api.Init(null,'eng',1)!==0)throw new Error('initialization');
    api.SetVariable('tessedit_pageseg_mode','11');
    api.SetVariable('preserve_interword_spaces','1');
    module.FS.writeFile('/input',event.data.image);
    if(api.SetImageFile(1,0)!==0)throw new Error('image');
    self.postMessage({type:'progress',value:0.25});
    api.Recognize(null);
    self.postMessage({type:'result',text:api.GetUTF8Text()});
  }catch(error){self.postMessage({type:'error'});}
  finally {if(api){try{api.End();module.destroy(api);}catch(error){}}self.close();}
};`;
  function recognize(image,onProgress){
    let worker, workerURL, rejectJob, settled=false, timer;
    function cleanup(){clearTimeout(timer);worker?.terminate();worker=null;if(workerURL)URL.revokeObjectURL(workerURL);workerURL=null;}
    const promise=new Promise((resolve,reject)=>{
      rejectJob=reject;
      try{
        if(!root.SafeboxOCRAssets || typeof WebAssembly!=='object')throw new Error('unavailable');
        workerURL=URL.createObjectURL(new Blob([root.SafeboxOCRAssets.core,'\n',workerCode],{type:'text/javascript'}));
        worker=new Worker(workerURL);
        worker.onmessage=event=>{
          if(settled)return;
          if(event.data.type==='progress'){onProgress(Math.max(0,Math.min(1,event.data.value)));return;}
          settled=true;cleanup();
          if(event.data.type==='result')resolve(String(event.data.text||''));else reject(new Error('recognition'));
        };
        worker.onerror=event=>{event.preventDefault();if(!settled){settled=true;cleanup();reject(new Error('recognition'));}};
        const binary=atob(root.SafeboxOCRAssets.language),language=new Uint8Array(binary.length);
        for(let i=0;i<binary.length;i++)language[i]=binary.charCodeAt(i);
        worker.postMessage({image,language},[image.buffer,language.buffer]);
        timer=setTimeout(()=>{if(!settled){settled=true;cleanup();reject(new Error('timeout'));}},120000);
      }catch(error){settled=true;cleanup();reject(new Error('unavailable'));}
    });
    return {promise,cancel(){if(!settled){settled=true;cleanup();rejectJob(new Error('cancelled'));}else cleanup();}};
  }
  root.SafeboxOCR={recognize};
})(window);
