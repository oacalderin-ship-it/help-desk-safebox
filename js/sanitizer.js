/* Local-only detection. Originals and mappings live only during one scan. */
(function (root) {
  'use strict';
  const patterns = {
    token: /\[[A-Z][A-Z0-9_]*\]/g,
    label: /^(\s*(?:User|Name|Contact|Caller|Company|Client|Organization|Customer|Site|Computer|Workstation|Server|Hostname|Username|Domain|Address|Location|Password|Passcode|API key|Token)\s*:\s*)([^\r\n]+)/gim,
    email: /\b[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9.-]*[A-Z0-9])?\.[A-Z]{2,}\b/gi,
    phone: /(?<![\w.])(?:\+?1[ .-]?)?(?:\(\d{3}\)|\d{3})[ .-]?\d{3}[ .-]\d{4}(?:\s*(?:ext\.?|x)\s*\d{1,6})?(?!\w)/gi,
    mac: /\b(?:[a-f0-9]{2}:){5}[a-f0-9]{2}\b|\b(?:[a-f0-9]{2}-){5}[a-f0-9]{2}\b/gi,
    url: /\b(?:https?|ftp):\/\/[^\s<>"']+|\bwww\.[^\s<>"']+/gi,
    unc: /\\\\[^\s\\]+\\[^\s,;"<>]+/g,
    domainUser: /\b[A-Z0-9][A-Z0-9._-]*\\[A-Z0-9][A-Z0-9._-]*\b/gi,
    ipv4: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    ipv6: /(?<![\w:])(?:[a-f0-9]{0,4}:){2,}[a-f0-9:.]*(?:%[a-z0-9_.-]+)?(?![\w:])/gi,
    ticket: /\b(?:Ticket\s*#?\s*\d{3,}|SR\s*#?\s*\d{3,}|Incident\s*#?\s*\d{3,})\b/gi,
    fqdn: /\b(?:[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?\.)+(?:local|lan|internal|home|arpa|test|com|net|org|edu|gov|io|co|us|uk|biz|info|cloud|dev|app)\b/gi,
    host: /\b(?:[A-Z0-9]+[-_])*(?:WS|PC|LAPTOP|DESKTOP|SRV|SERVER|FS|DC)[-_]?\d+[A-Z0-9-]*\b/gi,
    strictHost: /\b[A-Z][A-Z0-9]{1,15}(?:-[A-Z0-9]{2,15})+-\d{1,6}\b/g,
    possible: /\b(?:Mr\.?|Mrs\.?|Ms\.?|Dr\.?)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?|\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g
  };
  const safePhrases = new Set(['active directory','windows server','adobe acrobat','microsoft office','microsoft entra','microsoft teams','microsoft windows','microsoft outlook','microsoft defender','microsoft intune','entra id','event id','already attempted','user reports','other users','office apps','microsoft apps']);
  const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function isIPv6(value) {
    let v = value.split('%')[0];
    if (v.includes('.')) {
      const tail = v.slice(v.lastIndexOf(':') + 1);
      if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(tail) || tail.split('.').some(n => +n > 255)) return false;
      v = v.slice(0, v.lastIndexOf(':') + 1) + 'a:a';
    }
    if (!/^[a-f0-9:]+$/i.test(v) || (v.match(/::/g)||[]).length > 1) return false;
    const parts = v.split(':').filter(Boolean);
    if (parts.some(p => p.length > 4)) return false;
    return v.includes('::') ? parts.length < 8 : parts.length === 8;
  }
  function sanitizeTicket(input, options = {}) {
    const strict = options.strict !== false;
    const findings = {};
    const mappings = new Map();
    const counters = {};
    let text = String(input).replace(/\r\n?/g, '\n');
    const record = (kind, token) => { (findings[kind] ||= []).push({ replacement: token }); return token; };
    const tokenFor = (kind, original) => {
      const key = kind + ':' + original.toLowerCase();
      if (!mappings.has(key)) {
        const numbered = ['USER','SERVER','WORKSTATION','HOSTNAME','COMPANY','DOMAIN','USERNAME'].includes(kind);
        mappings.set(key, '[' + kind + (numbered ? '_' + (counters[kind] = (counters[kind] || 0) + 1) : '') + ']');
      }
      return mappings.get(key);
    };
    // Every pass skips existing placeholders; rescanning is idempotent.
    const replace = (regex, callback) => {
      text = text.split(/(\[[A-Z][A-Z0-9_]*\])/g).map(part => /^\[[A-Z][A-Z0-9_]*\]$/.test(part) ? part : part.replace(regex, callback)).join('');
    };
    // Reserve numbering from manually edited or previously scanned placeholders.
    for (const match of text.matchAll(/\[([A-Z]+)_(\d+)\]/g)) counters[match[1]] = Math.max(counters[match[1]] || 0, +match[2]);
    const terms = [...new Set(String(options.custom || '').split(/\r?\n/).map(t => t.trim()).filter(Boolean))].sort((a,b) => b.length-a.length);
    for (const term of terms) replace(new RegExp(escapeRegex(term),'gi'), () => record('custom','[CUSTOM_REDACTED]'));
    const identities = [];
    replace(patterns.label, (whole, prefix, value) => {
      if (!value.trim()) return whole;
      const label = prefix.trim().split(':')[0].toLowerCase();
      let kind = /^(user|name|contact|caller)$/.test(label) ? 'USER' : /^(company|client|organization|customer)$/.test(label) ? 'COMPANY' : /^(computer|workstation)$/.test(label) ? 'WORKSTATION' : label === 'server' ? 'SERVER' : label === 'hostname' ? 'HOSTNAME' : label === 'domain' ? 'DOMAIN' : label === 'username' ? 'USERNAME' : /password|passcode|api key|token/.test(label) ? 'SECRET' : 'LOCATION';
      if (!strict && ['WORKSTATION','SERVER','HOSTNAME','DOMAIN'].includes(kind)) return whole;
      const original = value.trim();
      const token = tokenFor(kind,original);
      identities.push({original,kind,token});
      return prefix + record(kind.toLowerCase(),token);
    });
    // Reuse exact labeled identities in narrative text. Do not infer ambiguous first-name aliases.
    for (const identity of identities.sort((a,b)=>b.original.length-a.original.length)) {
      replace(new RegExp('(?<![\\p{L}\\p{N}_])'+escapeRegex(identity.original)+'(?![\\p{L}\\p{N}_])','giu'),()=>record(identity.kind.toLowerCase(),identity.token));
    }
    replace(patterns.url, value => {
      const tail = (value.match(/[).,;!?]+$/)||[''])[0];
      return record('url','[URL]') + tail;
    });
    replace(patterns.email, () => record('email','[EMAIL]'));
    replace(patterns.phone, () => record('phone','[PHONE]'));
    if (strict) {
      // UNC is handled even if a server token was inserted by labeled-identity mapping.
      text = text.replace(patterns.unc, () => record('networkPath','[NETWORK_SHARE]'));
      replace(patterns.mac, () => record('mac','[MAC_ADDRESS]'));
      replace(patterns.ipv6, value => {
        const trimmed=value.replace(/\.+$/, '');
        return isIPv6(trimmed) ? record('ipv6','[IPV6]') + value.slice(trimmed.length) : value;
      });
      replace(patterns.ipv4, (value, offset, source) => {
        if (/\b(?:version|build|v|Chrome|Edge|FortiClient|Office)\s*[:=]?\s*$/i.test(source.slice(Math.max(0, offset-30),offset))) return value;
        const [a,b] = value.split('.').map(Number);
        if (value.split('.').some(n=>+n>255)) return value;
        const privateIP = a===10 || (a===172 && b>=16 && b<=31) || (a===192 && b===168) || a===127 || (a===169 && b===254);
        return record('ip',privateIP ? '[PRIVATE_IP]' : '[PUBLIC_IP]');
      });
      replace(patterns.domainUser, () => record('username','[DOMAIN]\\[USERNAME]'));
      replace(patterns.fqdn, value => record('hostname',tokenFor(/\b(?:fs|dc|srv)/i.test(value)?'SERVER':'DOMAIN',value)));
      replace(patterns.host, value => record('hostname',tokenFor(/(?:WS|PC|LAPTOP|DESKTOP)/i.test(value)?'WORKSTATION': 'SERVER',value)));
      replace(patterns.strictHost, value => record('hostname',tokenFor('HOSTNAME',value)));
    }
    replace(patterns.ticket, () => record('ticket','[TICKET_ID]'));
    const possible = [...text.matchAll(patterns.possible)].filter(m=>!safePhrases.has(m[0].toLowerCase()));
    if(possible.length) findings.possibleSensitive = possible.map(()=>({reason:'Possible name or organization; inspect the full sanitized text.'}));
    const total = Object.entries(findings).reduce((sum,[key,items])=>sum+(key==='possibleSensitive'?0:items.length),0);
    return {text,findings,total,reviewCount:possible.length};
  }
  root.SafeboxSanitizer = {sanitizeTicket};
})(typeof window !== 'undefined' ? window : globalThis);
