# Help Desk Safebox

Version 1.1 · by Verity IT

A local browser utility for preparing ConnectWise Manage ticket information for manual use with an approved AI assistant. Paste → Scan → Review → choose a prompt → Copy. No backend, API key, build tool, or installation is required.

## Run locally

1. Extract the entire project ZIP into a folder.
2. Open `index.html` in a current desktop browser (Edge, Chrome, Firefox, or Safari).
3. Click **Load Safe Demo**, then **Scan & Sanitize** to try the fictional example.
4. Review and edit the sanitized text. Confirm the review checkbox.
5. Click **Copy Safe Prompt** and paste manually into an approved AI tool.

Keep the `css`, `js`, `vendor`, and `assets` folders next to `index.html`. Opening a lone HTML file without those folders will not work. The application uses ordinary deferred scripts so it can run from `file://` without an HTTP server. Browser clipboard restrictions vary; a local selection/copy fallback is provided. If both clipboard mechanisms are blocked, manually select the reviewed output and press Ctrl/Cmd+C.

## Screenshots (v1.1)

1. Expand **Screenshots** beneath the raw ticket editor.
2. Choose PNG/JPEG/WebP files, drop them into the screenshot area, or paste a screenshot with Ctrl/Cmd+V while focused in the raw ticket area. Up to four images, 10 MB each, 16 megapixels each.
3. Text recognition runs **on your device**, using the bundled English Tesseract engine. No image or extracted text is uploaded. The app remains usable by opening index.html directly, without network access.
4. Each screenshot gets editable **Context to include**. The app suggests lines containing technical clues and adjacent lines, removing exact duplicate lines. This is deterministic filtering, not AI summarization or image understanding. If it finds no technical cues, it keeps the full text for you to trim.
5. Compare the context against **View original screenshot** and **Compare full extracted text**. Correct OCR errors, especially error codes, IPs, and usernames. **Use full extraction** restores all OCR text; **Suggest technical context** reapplies the filter. Both replace your edits in that screenshot's context editor.
6. Click **Scan & Sanitize**. Selected screenshot context is combined with the ticket and additional notes, then passed through the same sanitizer. Screenshot filenames are never inserted into output.
7. Review the sanitized text and confirm before copying. Only text is copied into the prompt. **Original images remain raw and are never included in the copied prompt.** This feature does not create a redacted image for sharing.

Adding, editing, restoring, removing, or completing extraction invalidates previous sanitized output and review. Scanning and copying stay disabled while OCR is pending. Remove an image to cancel its processing. Clear All terminates active recognition and clears the queue, images, extracted text, and output; late results are discarded. An unsuccessful image is visibly marked and contributes no text. A blank context editor excludes that screenshot from the next scan.

OCR needs readable upright text. Crop around the relevant error/window for best results. Recognition does not understand charts, icons, photographs, screenshots without text, or all visual relationships. Non-English text, tiny/blurry text, unusual layouts, and low-contrast images may be inaccurate. Context filtering can omit useful lines, so compare with the original/full text before scanning. There is a 30,000-character extraction limit per screenshot and a two-minute recognition timeout. Large images may be slow on mobile devices.

The included `vendor/ocr-assets.js` is approximately 11 MB uncompressed and contains the engine and language model. It loads with the other static files; it never fetches a model from a CDN. Keep the entire vendor folder when deploying. End users do not need npm or a build step. Licenses and provenance are in `THIRD-PARTY-NOTICES.md` and `vendor/licenses/`.

## Privacy model

- Scanning and prompt generation run entirely in the browser.
- No AI API, ConnectWise API, backend, telemetry, analytics, remote fonts, or external scripts.
- Raw tickets, screenshots, OCR text, sanitized tickets, additional notes, custom terms, findings, and generated prompts are not intentionally persisted by this app.
- Only the selected prompt mode is saved in localStorage, under `verity.safebox.promptMode.v1`. Storage failure does not stop the app.
- Strict mode starts **on** on each page load. Custom terms are session-only; there is no persistence opt-in in v1.
- Content Security Policy blocks network connections, forms, and external resources. Bundled OCR runs in a blob worker with WebAssembly permission; there is no JavaScript eval permission. Only trusted bundled code is used to create the worker. OCR uses an in-memory filesystem, with no IndexedDB cache or persisted images. On a hosted site, the browser still downloads the static app files normally. Processing after load makes no network requests. A local copy works offline.
- Copy actions require a completed scan, nonempty sanitized output, and human review confirmation. Both copy buttons use this gate.
- Source, notes, settings, or custom-term edits invalidate generated output. Sanitized-text edits reset review and regenerate the prompt. A re-scan also resets review.
- Clearing drops current content and references. It does not securely erase physical browser memory or clear OS clipboard history. Browser extensions, session restoration, device software, and manual copy/paste are outside the app's control.

## Features

Local layered pattern detection; strict and relaxed modes; count-only expandable findings; exact repeated-identity mapping; session custom terms; editable sanitized output; sanitized additional notes; five prompt modes; review gates; copy feedback; character and line counters; Ctrl/Cmd+Enter scan shortcut; Clear All; reset preferences; responsive layout; native keyboard controls and live status announcements.

Prompt modes: Troubleshoot, Questions to ask, Next steps, Escalation summary, Resolution notes. Prompts explicitly avoid invented facts, repeated completed troubleshooting, and instructions embedded within ticket data. No prompt is sent automatically.

## Project structure

```text
help-desk-safebox/
├── index.html
├── README.md
├── css/styles.css
├── js/
│   ├── app.js
│   ├── sanitizer.js
│   ├── prompt-builder.js
│   ├── storage.js
│   ├── ocr.js
│   ├── screenshot-context.js
│   └── screenshots.js
├── assets/verity-it-logo.svg
├── vendor/
│   ├── ocr-assets.js
│   └── licenses/
├── THIRD-PARTY-NOTICES.md
├── tests/
│   ├── test-cases.md
│   ├── sanitizer.test.cjs
│   ├── browser.test.cjs
│   ├── context.test.cjs
│   ├── screenshots.test.cjs
│   └── fixtures/fictional-error.png
├── .gitignore
├── .nojekyll
└── LICENSE-PLACEHOLDER.txt
```

Application code is vanilla HTML/CSS/JavaScript, with a bundled WebAssembly OCR engine. Optional developer tests are not runtime dependencies.

## Official Verity IT logo

The included SVG container embeds the supplied official PNG unchanged; the artwork has not been traced or redrawn. Replace `assets/verity-it-logo.svg` with the official vector logo if desired. The header tries that exact relative path and falls back to **VERITY IT** text if loading fails. Do not hotlink a remote logo. Keep replacement SVGs self-contained and free of scripts or remote references.

## Deploy to GitHub Pages

1. Sign in to GitHub and create a repository named `help-desk-safebox`, using the repository visibility approved by your organization. GitHub Pages availability depends on your account plan and repository visibility. This app does not provide authentication, and a private source repository alone does not guarantee a private website.
2. Open the repository and choose **Add file → Upload files**. Upload the *contents* of the extracted project folder so `index.html` is at the repository root, alongside `css`, `js`, and `assets`. Do not upload only the ZIP or put the whole app one folder below the root.
3. Commit the files to `main`. Include `.nojekyll` when using git; the app also works without it because it uses plain static files.
4. Open **Settings → Pages**.
5. Under **Build and deployment → Source**, select **Deploy from a branch**.
6. Under **Branch**, select **main**, choose **/(root)**, then click **Save**.
7. Wait for the Pages deployment to finish. GitHub may show the deployment under **Actions**; you do not need to author a workflow.
8. Return to **Settings → Pages** and open the generated site URL, normally `https://YOUR-USERNAME.github.io/help-desk-safebox/`.
9. Run the fictional demo and verify review/copy behavior before use. Do not commit ticket information or real test fixtures to the repository.

Source: [GitHub: Configuring a publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site). Settings checked September 24, 2026. No deployment was performed as part of this package.

## Update the app

Edit the relevant local files, run the supplied tests, then upload/commit the changed files to `main`. Pages redeploys from that branch. Refresh the site after deployment; use a hard refresh if old files remain cached. There is no service worker or application cache layer. Preserve the script order in `index.html`. Adjust theme variables in `css/styles.css`; detection patterns live in `js/sanitizer.js`; prompt wording lives in `js/prompt-builder.js`.

## Tests and QA

See `tests/test-cases.md` for the full manual test matrix and acceptance evidence.

Optional sanitizer tests (Node only for development):

```sh
node tests/sanitizer.test.cjs
```

Optional browser regression suite (requires developer-installed Playwright and Chromium):

```sh
node tests/browser.test.cjs
node tests/context.test.cjs
node tests/screenshots.test.cjs
```

The app itself never requires Node, npm, or Playwright. Developer tests use only synthetic data.

## Known limitations

Pattern matching is not reliable named-entity recognition. Arbitrary people, organizations, addresses, locations, secrets, account numbers, unusual domains, serial numbers, and contextual clues may remain. Labeled names and organizations are generalized; likely title-cased phrases are flagged only as review prompts. Flags are not probabilities and can include harmless product names. Review the entire output even when the scan reports zero items.

Exact labeled identities reuse numbered placeholders within one scan. First-name aliases are not inferred because they can be ambiguous. A re-scan preserves existing placeholders and allocates new numbers after them; new source scans start fresh. Generic email/IP/path tokens do not preserve relationships between different values. Custom terms are literal, case-insensitive substring replacements, so short terms may remove parts of technical words.

Strict mode generalizes recognized infrastructure. Relaxed mode keeps IPs, MACs, network paths, domains, and hostnames, while still removing recognized contact information, labeled people/organizations/locations/credentials, URLs, custom terms, and ticket IDs. Review infrastructure exposure carefully in relaxed mode.

Single-line labeled values are conservatively replaced in full; put subsequent symptoms on a new line to preserve them. Network paths with spaces may leave trailing components for manual review. Hostnames outside supported naming conventions and domains outside the recognized suffix list may remain. Four-part numeric software builds can resemble IPv4 addresses and may be generalized; verify and restore a nonidentifying build if needed. Phone recognition targets common US formats. Not every international number is detected. The app handles plain text and PNG/JPEG/WebP screenshots. PDFs, SVGs, HEIC, animated images, and other attachment formats are not supported. Screenshot extraction and context filtering add their own inaccuracies; they do not guarantee that all identifying information is detected.

The editor caps raw input at 150,000 characters, additional notes at 50,000, custom terms at 20,000, and sanitized input at 220,000. Large inputs and large custom lists can take longer to process. Split unusually large tickets.

## Privacy disclaimer

This utility assists a technician; it does not certify that content is safe, compliant, or authorized for an external AI system. Automatic detection is imperfect. Human review and company policy take precedence. There is no claim of guaranteed PII removal, HIPAA/GDPR compliance, or secure memory erasure. No formal external security audit has been performed.

## Future ideas — not implemented

Approved ConnectWise and enterprise AI integrations, local knowledge base, playbooks, encrypted history, browser extension, team knowledge base, and Entra/SSO authentication. Each would require a separate privacy and security design review.
