# QA test matrix

Use fictional data only. Start with Strict Privacy Mode ON unless stated otherwise. For sanitizer cases, paste the input and click Scan & Sanitize. Token numbering depends on occurrence order. Every result still requires manual review.

| Test | Input / action | Expected behavior |
|---|---|---|
| Email | `john@example.test` | `[EMAIL]` |
| UPN | `jsmith@example.local` | `[EMAIL]` |
| Phone | `904-555-1212`, `(904) 555-1212`, `904.555.1212`, `+1 904 555 1212` | Each becomes `[PHONE]` |
| Private IPv4 | `10.10.5.12`, `172.16.0.2`, `192.168.1.20` | `[PRIVATE_IP]` |
| Public IPv4 | `8.8.8.8` | `[PUBLIC_IP]` |
| Invalid IPv4 | `999.999.999.999` | Preserved |
| IPv6 | `fe80::1`, `2001:db8::2`, `::1`, `::ffff:192.0.2.1` | `[IPV6]` |
| IPv6 punctuation | `Try fe80::1.` | `Try [IPV6].` |
| MAC | `AA:BB:CC:DD:EE:FF`, `AA-BB-CC-DD-EE-FF` | `[MAC_ADDRESS]` |
| URL | `https://example.test/path?q=private.` | `[URL].`; generic HTTPS, HTTP, SMB, RDP survive |
| UNC | `\\ACME-FS01\Accounting stopped working.` | `[NETWORK_SHARE] stopped working.` |
| Domain username | `DOMAIN\jsmith` | `[DOMAIN]\[USERNAME]` |
| Hostnames | `JAX-WS-042 ACME-SRV-01 DC01 FS01.company.local` | Numbered workstation/server/domain tokens; original names absent |
| Company field | `Company: Contoso Test Services` | `Company: [COMPANY_1]` |
| Contact field | `Contact: Jordan Example` | `Contact: [USER_1]` |
| Repeated identity | `Contact: Jordan Example` then `Jordan Example called.` on a new line | Same `[USER_1]` both times |
| Multiple users | `User: Jordan Example` and `Caller: Taylor Example` on separate lines | `[USER_1]` and `[USER_2]` |
| Multiple servers | `DC01 DC02 DC01` | `[SERVER_1] [SERVER_2] [SERVER_1]` |
| Custom redaction | Add `A+B Clinic` and `A+B` on separate custom-term lines; scan both | Literal escaped replacements; longer term handled first |
| Custom reset | Edit custom terms after reviewing | Output cleared; must scan and review again |
| Possible names | `Jordan Example called from Contoso Test Services.` | Possible-phrase flags; no false assurance of automatic removal |
| Ticket IDs | `Ticket #123456 SR123456 Incident 123456` | Three `[TICKET_ID]` tokens |
| Error preservation | `0x80070035 0x80004005 AADSTS50076 Event ID 4625 HTTP 401 HTTP 403 HTTP 500 Error 1603` | Unchanged |
| Version preservation | `Windows 11 24H2 Office 365 Microsoft 365 Apps Chrome 140 FortiClient 7.4 Adobe Acrobat 2025` | Unchanged |
| Explicit build | `version 1.2.3.4 Chrome 140.0.1.2` | Unchanged |
| Technical names | `Windows Server 2022 Entra ID Active Directory DNS DHCP SMB RDP TCP UDP Port 443 Port 445 BitLocker Intune OneDrive SharePoint Outlook Teams Adobe Acrobat FortiClient` | Unchanged |
| Re-scan | Re-scan existing sanitized placeholders | Tokens preserved, counts reflect this scan, review reset |
| New token on re-scan | `[SERVER_1] DC02` | `[SERVER_1] [SERVER_2]` |
| Editing sanitized text | Confirm review; type in sanitized editor | Review unchecked, copy disabled, prompt regenerated |
| New raw ticket | Confirm review; change raw text | Sanitized text, findings, and prompt cleared; new scan required |
| Additional notes | Add `Called private@example.test at 904-555-1212` | Notes included only after sanitization; email and phone absent from prompt |
| Additional-note edit | Edit notes after review | Old output invalidated, copy disabled |
| Copy before review | Scan but do not check review | Both copy buttons disabled |
| Copy after review | Scan, inspect, check review, click Copy Safe Prompt | Current prompt copied, `Copied ✓` appears for about two seconds |
| Clipboard denied | Deny Clipboard API access and click Copy | Selection-based copy attempted; manual-copy guidance if unavailable |
| Prompt modes | Select each of five modes | Appropriate distinct instructions, same sanitized ticket |
| Regenerate | Clear prompt, then Regenerate | Current sanitized text used; review remains required |
| Strict ON | Scan contact data, IP, MAC, URL, UNC, user, hostname, domain, ID | Recognized direct and infrastructure identifiers removed |
| Strict OFF | Toggle off; scan same text | Warning visible; recognized contact/identity data removed; infrastructure can remain |
| Strict setting edit | Toggle mode after review | Prior output invalidated |
| Demo | Load Safe Demo, then scan | Fictional identifiers removed; Windows version, error, and completed steps preserved |
| Raw Clear | Click Clear below raw input | Raw, additional notes, custom terms, output, findings, and review reset |
| Sanitized Clear | Click Clear below sanitized editor | Sanitized text and prompt cleared; raw remains; scan required |
| Prompt Clear | Click Clear below prompt | Prompt cleared and copying disabled; Regenerate available |
| Clear All | Click Clear All | All ticket/notes/terms/output/findings cleared; review reset; clipboard explicitly unchanged |
| Reset settings | Change mode, strict, custom terms; reset | Troubleshoot, strict ON, empty custom terms; saved mode removed |
| Storage | Scan/review/copy; inspect browser storage | Only prompt mode may be in localStorage; no ticket values in local/session storage |
| Reload | Reload after using a ticket | Ticket content not restored by application; prompt preference restored; strict ON |
| Mobile layout | View at widths 1000, 768, 390, 320 px | Ordered stacked sections, touch-friendly controls, no horizontal overflow |
| Keyboard | Tab through controls; use Space/Enter; Ctrl/Cmd+Enter | Visible focus, native controls, shortcut scans; copy stays gated |
| Screen reader | Read labels, scan, copy | Labeled textareas, descriptive controls, live scan/copy status |
| Missing logo | Rename or remove local SVG | `VERITY IT` text fallback; app remains usable |
| XSS | Paste `<img src=x onerror="alert(1)">` | Literal text only; no element created or code executed |
| Network | After initial static files load, use all controls with network panel open | No requests made by scanning, generation, copying, or settings |
| Offline | Open extracted index.html with network disconnected | Entire workflow works; clipboard behavior depends on browser permissions |
| Pages hosting | Deploy files to repository root and open the Pages URL | Relative CSS/JS/logo load, same workflow as local file |

## Evidence and acceptance status

- Sanitizer/prompt regression suite: **32 automated checks passed** in Node, covering the supplied patterns, false positives, relationships, custom terms, and prompt modes.
- Runtime uses only HTML/CSS/vanilla JavaScript and local assets. No build or backend dependency.
- Content is assigned through `.value` or `.textContent`. No `innerHTML`, `eval`, network client, or ticket persistence is used.
- Chromium browser regression suite: **passed** from both a local file and a local static HTTP server. Verified demo, copy gate, clipboard API (mocked success), selection-copy fallback, review resets on sanitized/raw/notes edits, re-scan, strict settings, five prompt modes, clear/regenerate, storage contents, XSS treatment, missing-logo fallback, and no requests after initial load. Checked overflow at 1440, 1000, 768, 390, and 320 pixels. Desktop screenshot visually inspected.
- Keyboard tab movement checked; a full screen-reader audit and cross-browser testing were not performed.
- GitHub Pages is structurally supported with relative paths and root index.html; no remote deployment was performed.
- Manual human review is always required. These tests are not a formal security or compliance certification.


## v1.1 screenshot verification

Added six context-filter regression checks and a real OCR browser suite, passed in Chromium from both file:// and static HTTP hosting. These tests use a fictional screenshot fixture only. The original v1 sanitizer (32 cases) and browser workflow also pass.

| Test | Input / action | Expected / verified behavior |
|---|---|---|
| Actual local OCR | Add `tests/fixtures/fictional-error.png` | Reads Windows version, 0x80070035, symptoms, and attempted steps |
| Context filtering | Error text surrounded by navigation clutter | Suggests technical lines with adjacent context; full text remains available |
| No technical match | Generic caption only | All extracted lines retained for user selection |
| Identifiers | Fixture email and workstation | Removed from final prompt by sanitizer |
| Filename privacy | Image named with customer-identifying text | Filename never enters extracted context or output |
| Copy gate | Add a screenshot after prior review | Prior output invalidated; scanning/copying disabled while OCR is pending |
| Editable context | Edit extracted text after review | Review resets and output clears; scan required |
| Full extraction | Click Use full extraction | Restores all OCR text into context, invalidates output |
| Reapply suggestions | Click Suggest technical context | Replaces context edits with suggested lines; scan required |
| Remove image | Remove an extracted image | Its context is excluded; prior output invalidated |
| Clipboard image | Paste an image into raw source area | Queues screenshot; no remote upload |
| Active cancellation | Clear All during a held recognition job | Worker cancelled; image/card/context/output cleared; late result ignored |
| Unsupported file | SVG upload | Rejected; no execution |
| Oversized upload | Image above 10 MB | Rejected |
| Count limit | Add five images | At most four accepted |
| Decode/pixel/text limits | Invalid bitmap, above 16 MP, or above 30,000 OCR characters | Visible failure, no text contributed; narrower crop suggested (guard code inspected) |
| Persistence | Inspect localStorage, sessionStorage, IndexedDB | No image/OCR data persisted; no IndexedDB database created |
| Network | Run actual OCR after assets load | No HTTP requests, including from the OCR worker; blob resources are in-memory |
| Responsive cards | 1440, 768, 390, 320 px | No horizontal overflow |
| Visual inspection | Expanded screenshot workflow | Desktop layout inspected, image/context marked raw, prompt stays beside sanitized editor |

Limitations: one controlled readable English OCR fixture is not an accuracy benchmark. Cross-browser/mobile-device performance and a formal accessibility/security audit were not performed. Original image pixels are not redacted or certified safe. Model assets add about 11 MB to the static app.
