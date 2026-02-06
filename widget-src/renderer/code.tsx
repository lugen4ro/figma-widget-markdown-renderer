/**
 * Renders fenced code blocks with optional syntax highlighting.
 *
 * - If a recognized language is specified, uses highlight.js to tokenize the
 *   code and renders each token as a colored `<Text>` node (VS Code Dark+
 *   inspired theme).
 * - Falls back to plain monochrome rendering for unrecognized/missing languages.
 */
import { Token, CODE_BLOCK_BG, CODE_BLOCK_FG, CODE_FONT } from "./types";
import hljs from "./hljs-setup";
import {
  parseHighlightHtml,
  splitSpansByLine,
  scopeToColor,
} from "./highlight";

const { widget } = figma;
const { AutoLayout, Text } = widget;

/**
 * Renders a fenced code block. Dispatches to syntax-highlighted rendering
 * or plain monochrome based on the language tag.
 */
export function renderCodeBlock(
  token: Token,
  key: number,
  baseSize: number
): FigmaDeclarativeNode {
  const code = token.text || "";
  const lang = (token.lang || "").trim().toLowerCase();
  const codeSize = Math.round(baseSize * 0.8125);

  // Syntax highlighting — only for recognized languages
  if (lang && hljs.getLanguage(lang)) {
    return renderHighlightedCodeBlock(code, lang, codeSize, key);
  }

  // Fallback: plain monochrome
  return renderPlainCodeBlock(code, codeSize, key);
}

/**
 * Renders a code block with syntax highlighting.
 * Each line becomes a horizontal `<AutoLayout>` containing colored `<Text>` spans.
 */
function renderHighlightedCodeBlock(
  code: string,
  lang: string,
  codeSize: number,
  key: number
): FigmaDeclarativeNode {
  var result = hljs.highlight(code, { language: lang, ignoreIllegals: true });
  var spans = parseHighlightHtml(result.value);
  var lines = splitSpansByLine(spans);

  return (
    <AutoLayout
      key={key}
      direction="vertical"
      width="fill-parent"
      fill={CODE_BLOCK_BG}
      padding={16}
      cornerRadius={6}
      spacing={0}
    >
      {lines.map(function (lineSpans, lineIdx) {
        if (lineSpans.length === 0) {
          // Empty line — render a space to preserve line height
          return (
            <Text
              key={lineIdx}
              fontSize={codeSize}
              fontFamily={CODE_FONT}
              fill={CODE_BLOCK_FG}
            >
              {" "}
            </Text>
          );
        }

        if (lineSpans.length === 1) {
          // Single span — no need for wrapping AutoLayout
          return (
            <Text
              key={lineIdx}
              fontSize={codeSize}
              fontFamily={CODE_FONT}
              fill={scopeToColor(lineSpans[0].scope)}
              width="fill-parent"
            >
              {lineSpans[0].text}
            </Text>
          );
        }

        // Multiple spans — wrap in horizontal AutoLayout
        return (
          <AutoLayout
            key={lineIdx}
            direction="horizontal"
            width="fill-parent"
            spacing={0}
          >
            {lineSpans.map(function (span, spanIdx) {
              return (
                <Text
                  key={spanIdx}
                  fontSize={codeSize}
                  fontFamily={CODE_FONT}
                  fill={scopeToColor(span.scope)}
                >
                  {span.text}
                </Text>
              );
            })}
          </AutoLayout>
        );
      })}
    </AutoLayout>
  );
}

/**
 * Renders a plain monochrome code block (no syntax highlighting).
 * Used as fallback when no language is specified or the language is unrecognized.
 */
function renderPlainCodeBlock(
  code: string,
  codeSize: number,
  key: number
): FigmaDeclarativeNode {
  return (
    <AutoLayout
      key={key}
      direction="vertical"
      width="fill-parent"
      fill={CODE_BLOCK_BG}
      padding={16}
      cornerRadius={6}
    >
      <Text
        fontSize={codeSize}
        fontFamily={CODE_FONT}
        fill={CODE_BLOCK_FG}
        width="fill-parent"
      >
        {code}
      </Text>
    </AutoLayout>
  );
}
