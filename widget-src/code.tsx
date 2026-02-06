import { Lexer } from "marked";
import { renderTokens } from "./renderer/index";

const { widget } = figma;
const { AutoLayout, useSyncedState, usePropertyMenu } = widget;

const DEFAULT_MARKDOWN = `# Markdown Renderer Demo

## Text Formatting

This is a paragraph with **bold**, *italic*, and ~~strikethrough~~ text. You can also use \`inline code\` for technical terms.

Combine them: **bold and *nested italic*** or ~~strikethrough with **bold**~~.

## Links

Visit [Figma](https://www.figma.com) or check the [Widget API docs](https://www.figma.com/widget-docs/).

## Lists

### Unordered
- First item
- Second item with **bold**
  - Nested item
  - Another nested item
- Third item

### Ordered
1. Step one
2. Step two
3. Step three

### Task list

- [ ] Task list item (unchecked)
- [x] Task list item (checked)

## Blockquote

> This is a blockquote. It can contain **formatted** text and multiple paragraphs.

## Code Block

\`\`\`js
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

## Table

| Feature | Status | Notes |
|---------|:------:|-------|
| Headings | Done | h1–h6 scaled |
| Bold / Italic | Done | Nested supported |
| Tables | Done | GFM with alignment |
| Images | Planned | Not yet rendered |

## Horizontal Rule

---

## Image

![Image alt text]()
`;

const WIDTH_OPTIONS = [
    { option: "400", label: "W: 400" },
    { option: "600", label: "W: 600" },
    { option: "800", label: "W: 800" },
    { option: "1000", label: "W: 1000" },
    { option: "1200", label: "W: 1200" },
];

const TEXT_SIZE_OPTIONS = [
    { option: "12", label: "Aa: 12" },
    { option: "14", label: "Aa: 14" },
    { option: "16", label: "Aa: 16" },
    { option: "20", label: "Aa: 20" },
    { option: "24", label: "Aa: 24" },
];

function Widget() {
    const [markdown, setMarkdown] = useSyncedState(
        "markdown",
        DEFAULT_MARKDOWN,
    );
    const [widthStr, setWidthStr] = useSyncedState("width", "600");
    const [textSizeStr, setTextSizeStr] = useSyncedState("textSize", "16");

    usePropertyMenu(
        [
            {
                itemType: "dropdown",
                propertyName: "width",
                tooltip: "Width",
                options: WIDTH_OPTIONS,
                selectedOption: widthStr,
            },
            {
                itemType: "dropdown",
                propertyName: "textSize",
                tooltip: "Text Size",
                options: TEXT_SIZE_OPTIONS,
                selectedOption: textSizeStr,
            },
            { itemType: "separator" },
            { itemType: "action", propertyName: "edit", tooltip: "Edit" },
        ],
        ({ propertyName, propertyValue }) => {
            if (propertyName === "width" && propertyValue) {
                setWidthStr(propertyValue);
            }
            if (propertyName === "textSize" && propertyValue) {
                setTextSizeStr(propertyValue);
            }
            if (propertyName === "edit") {
                return openEditor(markdown);
            }
        },
    );

    const tokens = Lexer.lex(markdown, { gfm: true }) as unknown as Parameters<
        typeof renderTokens
    >[0];
    const baseSize = parseInt(textSizeStr, 10);
    const widgetWidth = parseInt(widthStr, 10);
    const contentWidth = widgetWidth - 48; // subtract horizontal padding (24 * 2)

    return (
        <AutoLayout
            direction="vertical"
            horizontalAlignItems="start"
            verticalAlignItems="start"
            height="hug-contents"
            width={widgetWidth}
            padding={24}
            fill="#FFFFFF"
            cornerRadius={8}
            spacing={Math.round(baseSize * 0.75)}
            stroke="#E5E5E5"
            strokeWidth={1}
        >
            {renderTokens(tokens, baseSize, contentWidth)}
        </AutoLayout>
    );

    function openEditor(md: string) {
        return new Promise<void>((resolve) => {
            figma.showUI(__html__, { width: 800, height: 500 });
            figma.ui.postMessage({ type: "load", markdown: md });
            figma.ui.onmessage = (msg) => {
                if (msg.type === "save") {
                    setMarkdown(msg.markdown);
                }
                if (msg.type === "close") {
                    figma.closePlugin();
                    resolve();
                }
            };
        });
    }
}

widget.register(Widget);
