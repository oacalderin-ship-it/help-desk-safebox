(function(root){
  'use strict';
  const key='verity.safebox.promptMode.v1';
  root.SafeboxStorage={
    getMode(){try {const mode=localStorage.getItem(key);return SafeboxPrompts.modes.includes(mode)?mode:'troubleshoot';}catch{return 'troubleshoot';}},
    setMode(mode){if(SafeboxPrompts.modes.includes(mode)){try{localStorage.setItem(key,mode);}catch{/* Preferences are optional when storage is unavailable. */}}},
    reset(){try{localStorage.removeItem(key);}catch{/* The application also works without storage. */}}
  };
})(window);
