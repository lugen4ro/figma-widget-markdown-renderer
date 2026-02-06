# Markdown Widget for FigJam

A FigJam widget that renders Markdown directly on the canvas, including GFM tables.

## Getting started

```bash
npm run dev
```

1. Log in to your account and open the Figma desktop app
2. Open any FigJam document (or create a new one)
3. Go to Menu > Widgets > Development > "Import widget from manifest..."
4. Select the `manifest.json` in this folder

## Commands

- `npm run dev` — start full dev environment (tsc watch + esbuild watch + vite dev server)
- `npm run build` — production build with minification
- `npm run test` — type-check both contexts then build
- `npm run format` — prettier

## Markdown Feature Support

### Supported

- [x] Headings (h1–h6), scaled proportionally
- [x] Paragraphs
- [x] **Bold** / _Italic_ / ~~Strikethrough~~
- [x] Bold+italic combined (`***text***`)
- [x] `Inline code`
- [x] Fenced code blocks (dark theme)
- [x] Unordered lists (with nesting)
- [x] Ordered lists (with nesting)
- [x] Task lists (checkboxes, with checked styling)
- [x] Blockquotes (with nested blockquotes)
- [x] Inline formatting inside blockquotes
- [x] Horizontal rules
- [x] GFM Tables (with column alignment)
- [x] Inline formatting inside table cells
- [x] Images (from URL, with alt text caption)
- [x] Links (colored, clickable)
- [x] Configurable widget width (property menu)
- [x] Configurable text size with proportional scaling (property menu)
- [x] iFrame editor with toggleable HTML preview

### Not yet supported

- [ ] Syntax highlighting in code blocks
- [ ] Light/dark theme toggle
- [ ] Mermaid rendering

## Other To Dos

- [ ] Confirm on close with non-saved changes
- [ ] Editor improvements
  - [ ] tab does not jump to preview, but indents
  - [ ] simple shortcuts (like cmd+b for making selection bold)
- [ ] Syntax highlighting for code blocks
- [ ] Widget shows text, so you can select & copy (Move trigger for editor elsewhere)

## Architecture

See [docs/architecture.md](docs/architecture.md) for the dual-context model.
