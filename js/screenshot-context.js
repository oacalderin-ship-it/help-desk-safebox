(function(root){
  'use strict';
  // Conservative line suggestions, not semantic summarization. Full OCR stays available for comparison.
  const technical=/\b(?:error|failed|failure|unable|cannot|can't|could not|denied|blocked|exception|warning|unavailable|timeout|timed out|disconnect|connect|connection|network|drive|mapped|server|workstation|computer|device|printer|scanner|scan|printing|vpn|mfa|authenticat\w*|password|sign.?in|log.?in|account|permission|access|certificate|expired|sync|outlook|teams|onedrive|sharepoint|office|microsoft|windows|chrome|edge|adobe|forticlient|bitlocker|intune|entra|dns|dhcp|smb|rdp|http|https|tcp|udp|port|version|build|event|status|code|reboot\w*|restart\w*|tried|attempted|resolved|unresolved|works|working|affected|unaffected|user|users|started|since|after|before|yesterday|today|minutes|hours|disk|storage|memory|cpu|service|stopped|running|install\w*|update\w*|crash\w*|slow|performance|offline|online|dialog)\b|\b(?:0x[0-9a-f]+|AADSTS\d+)\b|\b\d{3,5}\b|\\\\/i;
  function suggestContext(text){
    const lines=String(text).replace(/\r\n?/g,'\n').split('\n').map(s=>s.trim()).filter(Boolean);
    const selected=new Set();
    lines.forEach((line,i)=>{if(technical.test(line)){selected.add(i);if(i>0)selected.add(i-1);if(i+1<lines.length)selected.add(i+1);}});
    const fallback=!selected.size;
    const keep=fallback?lines:lines.filter((_,i)=>selected.has(i));
    // Deduplicate exact OCR lines without rewriting claims or error codes.
    const unique=[...new Set(keep)];
    return {text:unique.join('\n'),kept:unique.length,total:lines.length,fallback};
  }
  root.SafeboxContext={suggestContext};
})(typeof window!=='undefined'?window:globalThis);
