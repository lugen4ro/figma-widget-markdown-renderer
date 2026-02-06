# Dual-Context Architecture

Figma widgets run in two isolated execution contexts with separate capabilities.

## `widget-src/` — Widget Sandbox

The widget itself, rendered directly on the Figma canvas.

- **Restricted JS runtime** — no DOM, no `fetch`, no browser APIs
- JSX uses `figma.widget.h` (not React)
- Available components: `AutoLayout`, `Text`, `Rectangle`, `SVG`, `Image`, etc.
- State via `useSyncedState` (multiplayer-safe, persisted across sessions)
- Builds with esbuild into a single `dist/code.js`

## `ui-src/` — iFrame UI

A floating panel that opens on user interaction (e.g. clicking the widget).

- **Full browser environment** — React, DOM, `fetch`, canvas API, etc.
- Used for rich interactions: text editing, live preview, network calls, `measureText`
- Builds with Vite into a single `dist/index.html` (all JS/CSS inlined)

## Communication

The two contexts talk via `postMessage`:

```
Widget → iFrame:  figma.ui.postMessage(data)
iFrame → Widget:  parent.postMessage({ pluginMessage: data }, '*')
```

## Key Constraints

- Widget `<Text>` does not support mixed inline formatting — use horizontal `<AutoLayout>` with multiple `<Text>` children
- No `measureText()` in the widget sandbox — delegate to iFrame canvas API
- No `fetch` in the widget sandbox — network calls go through iFrame
- Both build outputs must be self-contained single files (Figma requirement)
