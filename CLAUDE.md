# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Print Console is a Tauri 2 desktop app for driving a CUPS printer: pick a PDF, preview a page, set copies / color mode / odd-even, submit to the queue, and watch job status. Linux/macOS only — the entire backend shells out to CUPS utilities (`lp`, `lpstat`) plus `pdftoppm` (poppler-utils) and `xdg-open`, so none of it works on Windows.

## Commands

```bash
pnpm install
pnpm tauri dev        # runs the app; spawns `pnpm dev` (Vite on :5173) via beforeDevCommand
pnpm tauri build      # production bundle
pnpm dev              # frontend only — no Tauri, so all invoke() calls reject
pnpm lint             # eslint
```

There is no test suite and no Rust-side lint script; use `cargo check --manifest-path src-tauri/Cargo.toml` when touching Rust.

Vite uses `strictPort: true` and Tauri's `devUrl` is hardcoded to `http://localhost:5173`; if 5173 is occupied, dev startup fails rather than shifting ports.

## Architecture

All Rust logic lives in `src-tauri/src/lib.rs` (the Tauri commands); `src-tauri/src/main.rs` just calls `app_lib::run()`.

The frontend is routed with `HashRouter` (hash routing because the production build loads over Tauri's custom protocol):

- `App.jsx` — owns the state shared across routes and declares `<Routes>`. Nothing renders UI here.
- `components/Layout.jsx` — the shell; passes shared state down through `<Outlet context={shared}>`, which route views read via `useOutletContext()`.
- `routes/` — one file per route: `PrintRoute` (the original print UI), plus `ImageToPdfRoute`, `MergeRoute`, `PagesRoute`.
- `components/` — UI pieces only (`FilePicker`, `PdfPreview`, `PrintSettings`, `PrintQueue`, `JobRow`, `Icon`, …).
- `lib/ui.js` — shared Tailwind class tokens; `lib/document.js` — turning files or pdf-lib bytes into a saved temp document; `lib/layout.js` — the A4 constant and image-placement maths; `lib/image.js` — decoding picked images; `lib/pdf.js` — all pdf-lib work.

**PDF editing happens in JS, printing in Rust.** `pdf-lib` builds every document (image→PDF, merge, page removal/rotation); Rust only shells out to CUPS and poppler. Deliberate split — it means no new system packages beyond the existing `cups` and `poppler-utils`.

**A4 is the only paper size** — the shop prints nothing else, so there's no selector. `lib/layout.js` exports a single `A4` constant, `pageDimensions(orientation, aspect)` only decides portrait vs landscape, and `PrintRoute` always sends `paper: A4.media` so `lp` gets an explicit `-o media=A4` rather than trusting the queue default. The Rust `print_pdf` still takes `paper` as a parameter, so adding sizes back later means restoring a picker, not reworking the command.

`lib/layout.js` is the single source of image placement: `PagePreview` and `buildImagesPdf` both call `pageDimensions` + `layoutImage`, which is why the on-screen preview matches the printed page. Change the maths in one place only. Note PDF y-origin is bottom-left while CSS is top-left — `PagePreview` flips it.

**The `doc` object** (`{ path, name, size }`) in `App.jsx` is the handoff mechanism: a tool route builds a PDF, saves it via `saveBytesAsDocument`, sets `doc`, and navigates to `/`. Printing needs no knowledge of where the PDF came from.

**Avoid `setState` in effect bodies** — `eslint-plugin-react-hooks` errors on it and the repo is currently clean. Two patterns are used instead: derive "loading" by comparing what was requested against what completed (`PdfPreview`, `PrintQueue`), and remount via `key` to reset state (`<PdfPreview key={`${doc.path}:${pages}`}>`) rather than resetting it in an effect.

The frontend never touches the filesystem or a PDF library. Flow for a selected file:

1. `FileReader.readAsDataURL` → base64 → `save_temp_file` writes it into the OS temp dir and returns the path.
2. That path (`tempFilePath`) is the handle used by every later command — `preview_page`, `open_pdf`, `print_pdf`. Nothing else is persisted; `selectedFile` is only kept for its name/size.
3. `preview_page` renders one page with `pdftoppm -singlefile -scale-to 600 -png` and returns a `data:image/png;base64,…` string, so previews are Rust-rendered images, not client-side PDF rendering. (`react-pdf` is in package.json but unused — don't assume it's wired up.)

Queue state is polled: `list_print_jobs` on a 3s `setInterval`, and each job in `lpstat -o` triggers a second `lpstat -l -o <job_ref>` call in `get_job_status` to get the human-readable status line. Job status strings come straight from CUPS, so the frontend matches them by substring (`includes("printing")`, `includes("complete")`) rather than by enum.

**Job identity:** `PrintJob.job_ref` holds the CUPS token verbatim (`"PrinterName-123"`) and is what `get_job_status` and `cancel_job` pass through — never reassemble it from `printer` + `id`, which exist for display only. `split_job_ref` derives them by splitting on the **last** hyphen, since queue names commonly contain hyphens (`HP_Smart_Tank_580-590`) while only the job id is guaranteed numeric. Splitting on the first hyphen, as an earlier version did, yields a wrong reference and would cancel the wrong thing.

All CUPS output parsing is positional text scraping of `lpstat` lines (see the comments above each parser) — it is sensitive to `lpstat` output format, not to a stable API.

**Temp files:** everything is written to one per-run folder, `$TMPDIR/print-console-<pid>/`, which is deleted on `RunEvent::Exit`. `save_temp_file` sanitizes the name (dropping path separators) and prefixes a counter so same-named files can't overwrite each other. A crash leaves the folder behind — there's no stale-folder sweep at startup.

Preview paging uses `pdf_page_count` (`pdfinfo`) to bound the pager; a failure there sets the count to 0, which hides the pager while still previewing page 1. In odd/even mode the pager steps two pages at a time to match what will physically print. `preview_page` names its temp PNG with pid + an atomic `PREVIEW_SEQ` counter so fast page switching can't have two renders clobber one output file.

## Print options gotcha

`print_pdf` sets exactly one color option: `ColorModel=KGray` for B&W, `ColorModel=RGB` for color. An earlier version passed several variants at once (`print-color-mode=monochrome`, `ColorModel=Gray`, …) hoping CUPS would pick the one the driver understood; that produced wrong results on the HP Smart Tank 580-590 and was narrowed deliberately (commit 241dadb — the commented-out block in `lib.rs` is that history). Changing these keywords is a driver-compatibility change, not a cleanup; verify against a real printer before touching them.

## Tauri specifics

- Command args cross the bridge in camelCase from JS (`filePath`, `fileData`) and arrive as snake_case Rust params.
- `src-tauri/capabilities/default.json` grants only `core:default`. No filesystem/shell/dialog plugins are enabled — file I/O and process spawning happen inside custom commands, which is why new capabilities are rarely needed.
- New commands must be added to both the `#[tauri::command]` fn and the `generate_handler!` list at the bottom of `lib.rs`.
- CSP is disabled (`security.csp: null`), which is what allows the base64 `data:` preview images.
