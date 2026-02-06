# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A FigJam widget that renders Markdown (including GFM tables) directly on the canvas. Built on Figma's Widget API using the `@figma/create-widget` scaffold with the iFrame template. See `PROJECT.md` for the full technical spec and implementation plan.

## Commands

- `npm run dev` — start full dev environment (tsc watch + esbuild watch + vite dev server)
- `npm run build` — production build with minification
- `npm run test` — type-check both contexts then build
- `npm run tsc` — type-check only (no build)
- `npm run format` — prettier

## Architecture

### Dual-context model

The codebase has two isolated execution contexts with separate tsconfig files:

1. **Widget sandbox** (`widget-src/`) — runs in Figma's restricted JS runtime. No DOM, no `fetch`, no browser APIs. JSX uses `figma.widget.h` (not React). Components: `AutoLayout`, `Frame`, `Text`, `Rectangle`, `SVG`, `Image`, etc.
2. **iFrame UI** (`ui-src/`) — full browser context running React 17. Used for rich interactions (text editor, `measureText`, network calls).

Communication between them is via `postMessage`:

- Widget → iFrame: `figma.ui.postMessage(data)`
- iFrame → Widget: `parent.postMessage({ pluginMessage: data }, '*')`

### Build pipeline

- **Widget code**: esbuild bundles `widget-src/code.tsx` → `dist/code.js` (single file)
- **UI code**: Vite + `vite-plugin-singlefile` bundles `ui-src/` → `dist/index.html` (all JS/CSS inlined into one HTML file)
- Both outputs must be self-contained single files for Figma's plugin system

### Key constraints

- Widget `<Text>` does not support mixed inline formatting — use horizontal `<AutoLayout>` with multiple `<Text>` children
- No `measureText()` in widget sandbox — must use iFrame canvas API and send results back
- No `fetch` in widget sandbox — network calls go through iFrame
- State is managed via `useSyncedState` (multiplayer-safe, persisted) not React `useState`

## Development Workflow

1. Run `npm run dev`
2. Open FigJam in **Figma Desktop app** (browser won't load local dev widgets)
3. Load widget via development section in the widgets panel
4. After code changes: right-click widget → "Re-render widget"
5. To clear persisted state: right-click → "Reset widget state"

## IMPORTANT

- Use a lot of TSDoc comments to explain at a high level what each function / component is doing
