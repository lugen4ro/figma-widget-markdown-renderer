import { Token, HEADING_SCALE, DEFAULT_STYLE, HR_COLOR } from "./types";
import { renderInlineParagraph } from "./inline";
import { renderCodeBlock } from "./code";
import { renderBlockquote } from "./blockquote";
import { renderList } from "./list";
import { renderTable } from "./table";

const { widget } = figma;
const { Text, Rectangle } = widget;

/** Top-level entry point: converts an array of marked tokens into Figma nodes. */
export function renderTokens(
  tokens: Token[],
  baseSize: number,
  contentWidth: number
): (FigmaDeclarativeNode | null)[] {
  return tokens.map((token, i) => renderToken(token, i, baseSize, contentWidth));
}

/**
 * Renders a single block-level token into a Figma widget node.
 * Dispatches to specialized renderers based on token type.
 */
function renderToken(
  token: Token,
  key: number,
  baseSize: number,
  contentWidth: number
): FigmaDeclarativeNode | null {
  switch (token.type) {
    case "heading": {
      const scale = HEADING_SCALE[token.depth || 1] || 1;
      const size = Math.round(baseSize * scale);
      return renderInlineParagraph(
        token.tokens || [],
        key,
        size,
        { ...DEFAULT_STYLE, bold: true },
        undefined
      );
    }

    case "paragraph":
      return renderInlineParagraph(
        token.tokens || [],
        key,
        baseSize,
        DEFAULT_STYLE,
        undefined
      );

    case "code":
      return renderCodeBlock(token, key, baseSize);

    case "blockquote":
      return renderBlockquote(token, key, baseSize, renderToken, contentWidth);

    case "list":
      return renderList(token, key, baseSize, 0);

    case "hr":
      return (
        <Rectangle
          key={key}
          height={1}
          width="fill-parent"
          fill={HR_COLOR}
        />
      );

    case "table":
      return renderTable(token, key, baseSize, contentWidth);

    case "space":
      return null;

    default:
      return (
        <Text key={key} fontSize={baseSize} fill="#999" width="fill-parent">
          {token.raw}
        </Text>
      );
  }
}
