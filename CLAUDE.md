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

Two files hold essentially all the logic: `src/App.jsx` (single component, all state, all UI) and `src-tauri/src/lib.rs` (all eight Tauri commands). `src-tauri/src/main.rs` just calls `app_lib::run()`.

The frontend never touches the filesystem or a PDF library. Flow for a selected file:

1. `FileReader.readAsDataURL` → base64 → `save_temp_file` writes it into the OS temp dir and returns the path.
2. That path (`tempFilePath`) is the handle used by every later command — `preview_page`, `open_pdf`, `print_pdf`. Nothing else is persisted; `selectedFile` is only kept for its name/size.
3. `preview_page` renders one page with `pdftoppm -singlefile -scale-to 600 -png` and returns a `data:image/png;base64,…` string, so previews are Rust-rendered images, not client-side PDF rendering. (`react-pdf` is in package.json but unused — don't assume it's wired up.)

Queue state is polled: `list_print_jobs` on a 3s `setInterval`, and each job in `lpstat -o` triggers a second `lpstat -l -o <job_ref>` call in `get_job_status` to get the human-readable status line. Job status strings come straight from CUPS, so the frontend matches them by substring (`includes("printing")`, `includes("complete")`) rather than by enum.

**Job identity:** `PrintJob.job_ref` holds the CUPS token verbatim (`"PrinterName-123"`) and is what `get_job_status` and `cancel_job` pass through — never reassemble it from `printer` + `id`, which exist for display only. `split_job_ref` derives them by splitting on the **last** hyphen, since queue names commonly contain hyphens (`HP_Smart_Tank_580-590`) while only the job id is guaranteed numeric. Splitting on the first hyphen, as an earlier version did, yields a wrong reference and would cancel the wrong thing.

All CUPS output parsing is positional text scraping of `lpstat` lines (see the comments above each parser) — it is sensitive to `lpstat` output format, not to a stable API.

Preview paging uses `pdf_page_count` (`pdfinfo`) to bound the pager; a failure there sets the count to 0, which hides the pager while still previewing page 1. In odd/even mode the pager steps two pages at a time to match what will physically print. `preview_page` names its temp PNG with pid + an atomic `PREVIEW_SEQ` counter so fast page switching can't have two renders clobber one output file.

## Print options gotcha

`print_pdf` sets exactly one color option: `ColorModel=KGray` for B&W, `ColorModel=RGB` for color. An earlier version passed several variants at once (`print-color-mode=monochrome`, `ColorModel=Gray`, …) hoping CUPS would pick the one the driver understood; that produced wrong results on the HP Smart Tank 580-590 and was narrowed deliberately (commit 241dadb — the commented-out block in `lib.rs` is that history). Changing these keywords is a driver-compatibility change, not a cleanup; verify against a real printer before touching them.

## Tauri specifics

- Command args cross the bridge in camelCase from JS (`filePath`, `fileData`) and arrive as snake_case Rust params.
- `src-tauri/capabilities/default.json` grants only `core:default`. No filesystem/shell/dialog plugins are enabled — file I/O and process spawning happen inside custom commands, which is why new capabilities are rarely needed.
- New commands must be added to both the `#[tauri::command]` fn and the `generate_handler!` list at the bottom of `lib.rs`.
- CSP is disabled (`security.csp: null`), which is what allows the base64 `data:` preview images.
