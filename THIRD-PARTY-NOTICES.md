# Third-party OCR components

Help Desk Safebox v1.1 bundles a local text-recognition engine. The application uses the core directly, without the Tesseract.js frontend, remote model downloads, or cache adapters.

| Component | Version / source | License |
|---|---|---|
| Tesseract.js-core | 7.0.0, `tesseract-core-lstm.wasm.js` | Apache-2.0 |
| English trained data | `@tesseract.js-data/eng` 1.0.0, `4.0.0_best_int/eng.traineddata.gz` | Model originates from Tesseract tessdata_best (Apache-2.0); npm packaging declares MIT |

Sources:
- https://github.com/naptha/tesseract.js-core/tree/v7.0.0
- https://github.com/naptha/tessdata/tree/gh-pages
- https://github.com/tesseract-ocr/tessdata_best

The core JavaScript/WebAssembly bytes are unmodified, embedded as a string in `vendor/ocr-assets.js`. The traineddata is decompressed and base64-encoded in the same file. The application's worker wrapper, image handling, context selection, and UI are separate in `js/`.

The non-SIMD LSTM core is intentionally bundled for broad compatibility and to support opening index.html directly without remote imports. This may be slower than a device-specific SIMD build. All bundled code and language data are static application assets, not ticket content. Recognition filesystem contents exist only in the worker's memory.

Upstream license texts are included under `vendor/licenses/`. See the linked source repositories for build source and attribution details.

## Source integrity

SHA-256 of the original npm assets before wrapping/decompression:

- Core: `eef5f8b2f8e20e150680b20adaec4a60babafee3adbe8a94583c81fee46e8680`
- English traineddata gzip: `45b4cb346724ac1774f1c36f42f182b887bcdb28ebe63e6fff90ac41f3fcff91`

## Upstream embedded-library notices

License texts from the core v7.0.0 submodule snapshots are included for giflib, Leptonica, libjpeg, libpng, libtiff, libwebp, openlibm, Tesseract, and zlib. The notices retain their original wording. This listing records upstream dependencies; it does not imply that every codec is exercised by Safebox.
