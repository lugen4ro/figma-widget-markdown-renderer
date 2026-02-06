# FigJam Markdown Widget (with Table Support)

A FigJam widget that renders Markdown content directly on the canvas, including full table support — something no existing community widget provides.

---

## Part 1: Building FigJam Widgets — General Guide

### What Is a FigJam Widget?

A widget is a small interactive application that lives directly on a Figma/FigJam canvas. Unlike plugins (which run transiently for one user), widgets are persistent objects that everyone in the file can see and interact with simultaneously.

Technically, a widget is a TypeScript/JSX function — very similar to a React functional component — that returns a tree of Figma-specific UI components. The Figma runtime renders that tree as native canvas objects.

### Available UI Components

The Widget API provides these primitives to build with:

- `AutoLayout` — a flex-like container (horizontal or vertical), the primary layout tool
- `Frame` — a fixed-size container supporting absolute positioning of children
- `Text` — renders text with configurable font, size, weight, color, etc.
- `Input` — an editable text field (wraps `Text` with edit capability)
- `Rectangle`, `Ellipse`, `Line` — shape primitives
- `SVG` — renders inline SVG markup
- `Image` — displays an image from a URL or bytes

There is no HTML rendering, no CSS, no `<div>`, no `<table>`. Everything must be composed from these building blocks.

### State and Hooks

Widgets manage state through hooks, mirroring React conventions:

- `useSyncedState(key, defaultValue)` — persisted, multiplayer-safe state (like `useState` but synced across all users)
- `useSyncedMap(key)` — a key-value map where individual entries are updated independently (useful for per-user data)
- `usePropertyMenu(items, onChange)` — defines the toolbar menu shown when the widget is selected
- `useEffect(callback)` — runs side effects when state changes
- `useWidgetId()` — returns the current widget node's ID

### The iFrame Bridge

The widget sandbox is limited — no DOM, no `fetch`, no browser APIs. If you need any of that (e.g., a rich text editor, network requests, or `measureText`), you open an iFrame via `figma.showUI(html)`. The iFrame is a full browser context.

Communication between the widget and iFrame uses message passing:

```
Widget  →  figma.ui.postMessage(data)  →  iFrame
iFrame  →  parent.postMessage({ pluginMessage: data }, '*')  →  Widget
```

### Prerequisites

- **Figma Desktop app** — required; browser Figma cannot load local dev widgets
- **Node.js** (v16+) — [nodejs.org](https://nodejs.org)
- **A terminal and editor** — Neovim + terminal works perfectly; no IDE-specific tooling needed

### Creating the Project

From your terminal:

```bash
npm init @figma/widget
```

You'll be prompted for:

1. **Widget name** — e.g., `figma-widget-md`
2. **Editor type** — select `FigJam` (or `Figma Design + FigJam` for both)
3. **Template** — select **With iFrame** (needed for the markdown editor popup)

This scaffolds the project into a directory matching your widget name.

### Project Structure

```
figma-widget-md/
├── manifest.json          # Widget metadata: name, id, editorType, ui entry point
├── package.json
├── tsconfig.json
├── widget-src/
│   └── code.tsx           # Widget code — the React-like component
└── ui-src/
    └── index.html         # iFrame UI — the popup editor (full browser context)
```

### Install Dependencies

```bash
cd figma-widget-md
npm install
```

### Build and Watch

```bash
npm run dev
```

This starts esbuild (or TypeScript compiler, depending on the template) in watch mode. It compiles `widget-src/code.tsx` → `dist/code.js` on every save. Keep this running in a terminal pane.

### Loading the Widget in FigJam

1. Open any FigJam file in the **Figma Desktop app**
2. Click the **more tools** button (`...`) in the bottom toolbar
3. Go to the **Widgets** tab
4. Scroll to the **Development** section — your widget should appear by name
5. Click it to drop it onto the canvas

> **Troubleshooting:** If it doesn't appear, confirm `npm run dev` compiled without errors and that you're in the desktop app (not browser).

### The Development Loop

1. Edit `widget-src/code.tsx` in Neovim
2. Save — esbuild recompiles automatically
3. In FigJam: right-click the widget → **Widgets → Re-render widget**
4. If the widget is selected, it may hot-reload automatically

To fully reset state (clear `useSyncedState` values): right-click → **Widgets → Reset widget state**.

### Publishing (When Ready)

1. Run `npm run build` (production build with minification)
2. In FigJam: **Menu → Widgets → Manage widgets**
3. Select your widget → **Publish to Community**
4. Fill in the listing details (name, description, icon, screenshots)
5. Submit for review

---

## Part 2: The Markdown Renderer with Table Support

This section covers the specific architecture for building a Markdown widget that parses and renders Markdown — including GFM tables — using Figma's widget components.

### Why Tables Are Missing from Existing Widgets

Every existing community Markdown widget (there are a handful, all 3+ years old) skips table support. This is not a platform limitation. The Widget API's `AutoLayout` and `Frame` components are fully capable of rendering grid layouts. The reasons are:

- Tables are the most complex Markdown element to render — they require a 2D grid with coordinated column widths, header styling, borders, and cell padding
- There's no `measureText()` in the widget sandbox, making dynamic column sizing non-trivial
- Tables aren't part of the original Markdown spec — they're a GFM (GitHub Flavored Markdown) extension, so basic parsers don't recognize them
- The existing widgets were quick side projects that were never updated

### Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   Widget (code.tsx)              │
│                                                  │
│  ┌──────────┐    ┌──────────┐    ┌────────────┐ │
│  │ Synced   │───→│ Markdown │───→│  Renderer  │ │
│  │ State    │    │ Parser   │    │ (AST → JSX)│ │
│  │ (raw md) │    │ (marked) │    │            │ │
│  └──────────┘    └──────────┘    └────────────┘ │
│       ↑                                          │
│       │ postMessage                              │
│  ┌────┴─────────────────────────────────────────┐│
│  │           iFrame (index.html)                ││
│  │  ┌────────────────────────────────────┐      ││
│  │  │  Textarea / CodeMirror editor      │      ││
│  │  │  (user types markdown here)        │      ││
│  │  └────────────────────────────────────┘      ││
│  └──────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

The flow:

1. User clicks the widget → iFrame opens with a text editor
2. User types/pastes Markdown and clicks "Save"
3. iFrame sends the raw Markdown string to the widget via `postMessage`
4. Widget stores it in `useSyncedState`
5. Widget passes the string through `marked.lexer()` to get an AST (array of tokens)
6. A renderer function walks the AST and returns Figma widget JSX

### Install the Parser

```bash
npm install marked
npm install --save-dev @types/marked
```

Enable GFM (which includes table support) — it's on by default in `marked`, but be explicit:

```typescript
import { marked } from "marked";

const tokens = marked.lexer(markdownString, { gfm: true });
```

### Token-to-Component Mapping

Each token type from the `marked` lexer maps to widget components:

| Markdown Element | Token Type           | Widget Component(s)                                               |
| ---------------- | -------------------- | ----------------------------------------------------------------- |
| `# Heading`      | `heading`            | `<Text fontSize={...} fontWeight="bold">`                         |
| Paragraph        | `paragraph`          | `<Text>`                                                          |
| `**bold**`       | inline `strong`      | `<Text fontWeight="bold">`                                        |
| `*italic*`       | inline `em`          | `<Text italic>`                                                   |
| `` `code` ``     | inline `codespan`    | `<Text fontFamily="Source Code Pro" fill="#e06c75">`              |
| Code block       | `code`               | `<AutoLayout fill="#1e1e1e"><Text fontFamily="Source Code Pro">`  |
| `> quote`        | `blockquote`         | `<AutoLayout>` with left-border `<Rectangle>` + indented content  |
| `- item`         | `list` / `list_item` | `<AutoLayout direction="vertical">` with bullet-prefixed `<Text>` |
| `---`            | `hr`                 | `<Rectangle height={1} width="fill-parent">`                      |
| Table            | `table`              | Nested `<AutoLayout>` grid (see below)                            |

### Rendering Tables

This is the core addition. A GFM table like:

```markdown
| Name  | Role     | Status |
| ----- | -------- | ------ |
| Alice | Engineer | Active |
| Bob   | Designer | Away   |
```

Produces a `table` token with `header` (array of cells) and `rows` (array of arrays of cells).

#### Basic Approach: Fixed-Width Columns

The simplest viable approach — each column gets equal width:

```tsx
function renderTable(token: marked.Tokens.Table): FigmaDeclarativeNode {
  const colCount = token.header.length;
  const colWidth = 180; // fixed width per column
  const borderColor = "#D1D5DB";

  return (
    <AutoLayout
      direction="vertical"
      stroke={borderColor}
      strokeWidth={1}
      cornerRadius={4}
      overflow="visible"
    >
      {/* Header row */}
      <AutoLayout direction="horizontal">
        {token.header.map((cell, i) => (
          <AutoLayout
            key={`h-${i}`}
            width={colWidth}
            padding={{ vertical: 8, horizontal: 12 }}
            fill="#F3F4F6"
            stroke={borderColor}
            strokeWidth={1}
          >
            <Text fontWeight="bold" fontSize={14}>
              {cell.text}
            </Text>
          </AutoLayout>
        ))}
      </AutoLayout>

      {/* Data rows */}
      {token.rows.map((row, rowIdx) => (
        <AutoLayout key={`r-${rowIdx}`} direction="horizontal">
          {row.map((cell, colIdx) => (
            <AutoLayout
              key={`c-${rowIdx}-${colIdx}`}
              width={colWidth}
              padding={{ vertical: 8, horizontal: 12 }}
              fill="#FFFFFF"
              stroke={borderColor}
              strokeWidth={1}
            >
              <Text fontSize={14}>{cell.text}</Text>
            </AutoLayout>
          ))}
        </AutoLayout>
      ))}
    </AutoLayout>
  );
}
```

#### Better Approach: Proportional Column Widths

Estimate column widths based on the longest content in each column:

```tsx
function calculateColumnWidths(
  token: marked.Tokens.Table,
  maxTableWidth = 800
): number[] {
  const colCount = token.header.length;
  const minColWidth = 80;
  const charWidth = 8; // approximate pixels per character
  const padding = 24; // horizontal padding per cell

  // Find the max content length in each column (header + all rows)
  const maxLengths = Array.from({ length: colCount }, (_, i) => {
    const headerLen = token.header[i].text.length;
    const maxRowLen = Math.max(...token.rows.map((row) => row[i].text.length));
    return Math.max(headerLen, maxRowLen);
  });

  // Convert to pixel widths
  const rawWidths = maxLengths.map((len) =>
    Math.max(len * charWidth + padding, minColWidth)
  );
  const totalRaw = rawWidths.reduce((sum, w) => sum + w, 0);

  // Scale to fit maxTableWidth if needed
  if (totalRaw > maxTableWidth) {
    const scale = maxTableWidth / totalRaw;
    return rawWidths.map((w) => Math.max(Math.floor(w * scale), minColWidth));
  }

  return rawWidths;
}
```

#### Advanced Approach: Measure Text via iFrame

For pixel-perfect column sizing, use the iFrame's canvas API:

```javascript
// In ui-src/index.html
function measureTextWidths(tableData, fontFamily, fontSize) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx.font = `${fontSize}px ${fontFamily}`;

  const widths = tableData.columns.map((_, colIdx) => {
    const allTexts = [
      tableData.header[colIdx],
      ...tableData.rows.map((row) => row[colIdx]),
    ];
    return Math.max(...allTexts.map((text) => ctx.measureText(text).width));
  });

  parent.postMessage(
    {
      pluginMessage: { type: "column-widths", widths },
    },
    "*"
  );
}
```

Then in the widget, receive the measurements and store them in synced state for rendering.

### Handling Inline Formatting

A paragraph like `"Hello **world** and *friends*"` needs to be split into styled segments. The `marked` lexer provides inline tokens via `marked.lexer()` → token.tokens (child tokens on paragraph/heading nodes).

```tsx
function renderInlineTokens(tokens: marked.Token[]): FigmaDeclarativeNode[] {
  return tokens.map((token, i) => {
    switch (token.type) {
      case "text":
        return <Text key={i}>{token.text}</Text>;
      case "strong":
        return (
          <Text key={i} fontWeight="bold">
            {token.text}
          </Text>
        );
      case "em":
        return (
          <Text key={i} italic>
            {token.text}
          </Text>
        );
      case "codespan":
        return (
          <Text
            key={i}
            fontFamily="Source Code Pro"
            fill="#E06C75"
            fontSize={13}
          >
            {token.text}
          </Text>
        );
      default:
        return <Text key={i}>{token.raw}</Text>;
    }
  });
}
```

> **Important limitation:** Figma's `<Text>` component does not support mixed formatting within a single text node (no equivalent of HTML `<span>` inside a `<p>`). You'll need to place multiple `<Text>` components inside a horizontal `<AutoLayout>` to simulate inline formatting. This is the trickiest part of the entire widget.

### Widget Entry Point (Skeleton)

```tsx
const { widget } = figma;
const {
  AutoLayout,
  Frame,
  Text,
  Input,
  Rectangle,
  SVG,
  useSyncedState,
  usePropertyMenu,
  useEffect,
  useWidgetId,
  register,
  waitForTask,
} = widget;

import { marked } from "marked";

function MarkdownWidget() {
  const [markdown, setMarkdown] = useSyncedState(
    "markdown",
    "# Hello\n\nStart typing..."
  );
  const [theme, setTheme] = useSyncedState("theme", "light");

  usePropertyMenu(
    [
      { itemType: "action", propertyName: "edit", tooltip: "Edit Markdown" },
      {
        itemType: "dropdown",
        propertyName: "theme",
        tooltip: "Theme",
        selectedOption: theme,
        options: [
          { option: "light", label: "Light" },
          { option: "dark", label: "Dark" },
        ],
      },
    ],
    ({ propertyName, propertyValue }) => {
      if (propertyName === "edit") {
        return new Promise(() => {
          figma.showUI(__html__, { width: 600, height: 400 });
          figma.ui.postMessage({ type: "load", markdown });
          figma.ui.onmessage = (msg) => {
            if (msg.type === "save") {
              setMarkdown(msg.markdown);
              figma.closePlugin();
            }
          };
        });
      }
      if (propertyName === "theme") {
        setTheme(propertyValue as string);
      }
    }
  );

  const tokens = marked.lexer(markdown, { gfm: true });
  const rendered = tokens.map((token, i) => renderToken(token, i, theme));

  return (
    <AutoLayout
      direction="vertical"
      spacing={12}
      padding={24}
      fill={theme === "dark" ? "#1E1E1E" : "#FFFFFF"}
      cornerRadius={8}
      stroke={theme === "dark" ? "#333333" : "#E5E7EB"}
      strokeWidth={1}
      width={600}
    >
      {rendered}
    </AutoLayout>
  );
}

widget.register(MarkdownWidget);
```

### Property Menu Options Worth Adding

Beyond the basics:

- **Theme** — light/dark toggle (swap fills and text colors)
- **Font size** — small/medium/large presets
- **Width** — narrow/medium/wide presets for the container
- **Accent color** — for code blocks, blockquote borders, link text

### Known Constraints and Workarounds

| Constraint                                      | Workaround                                                                             |
| ----------------------------------------------- | -------------------------------------------------------------------------------------- |
| No `measureText()` in widget sandbox            | Use the iFrame canvas API to measure, send results back via postMessage                |
| No mixed inline formatting in a single `<Text>` | Use horizontal `<AutoLayout>` with multiple `<Text>` children                          |
| No clickable links                              | Use `onClick` handler to open URLs via `figma.openExternal(url)`                       |
| No image loading from URLs                      | Use `Image` component with `figma.createImageAsync()` in a `useEffect` + `waitForTask` |
| Large documents render slowly                   | Consider pagination or a max-height with scrollable overflow                           |
| No `fetch` in widget code                       | Move all network calls to the iFrame                                                   |

### Suggested Build Order

If you're implementing this from scratch, this order minimizes blocked dependencies:

1. **Scaffold + hello world** — get the dev loop working (edit → save → re-render)
2. **iFrame editor** — basic textarea that sends markdown to the widget on save
3. **Headings + paragraphs** — simplest token types, validates your renderer architecture
4. **Code blocks** — introduces styled `<AutoLayout>` containers
5. **Bold/italic inline formatting** — the hardest foundational piece; get this right early
6. **Lists** (ordered + unordered, nested)
7. **Blockquotes**
8. **Horizontal rules**
9. **Tables** — with fixed-width columns first, then proportional
10. **Theme support** — light/dark toggle
11. **Polish** — property menu options, edge cases, error handling

### Useful References

- [Widget API Docs](https://developers.figma.com/docs/widgets/)
- [Widget API Reference](https://developers.figma.com/docs/widgets/api/api-reference/)
- [Widget Samples (GitHub)](https://github.com/figma/widget-samples)
- [Create Widget CLI](https://github.com/figma/create-widget)
- [marked.js Documentation](https://marked.js.org/)
- [`<SVG>` Component Docs](https://www.figma.com/widget-docs/api/component-SVG/)
