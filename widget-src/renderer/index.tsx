import {
  Token,
  TaskToggleHandler,
  HEADING_SCALE,
  DEFAULT_STYLE,
  HR_COLOR,
  LINK_COLOR,
} from "./types";
import { renderInlineParagraph } from "./inline";
import { renderCodeBlock } from "./code";
import { renderBlockquote } from "./blockquote";
import { renderList } from "./list";
import { renderTable } from "./table";

const { widget } = figma;
const { AutoLayout, Text, Rectangle } = widget;

/** Top-level entry point: converts an array of marked tokens into Figma nodes. */
export function renderTokens(
  tokens: Token[],
  baseSize: number,
  contentWidth: number,
  onToggleTask?: TaskToggleHandler
): (FigmaDeclarativeNode | null)[] {
  assignTaskIndexes(tokens);
  const firstContentIndex = tokens.findIndex((token) => token.type !== "space");

  return tokens.map((token, i) =>
    renderToken(
      token,
      i,
      baseSize,
      contentWidth,
      i !== firstContentIndex,
      onToggleTask
    )
  );
}

/** Assigns task items their position in Markdown source order. */
function assignTaskIndexes(tokens: Token[]): void {
  let nextIndex = 0;

  const visit = (nestedTokens: Token[]) => {
    for (const token of nestedTokens) {
      if (token.type === "list") {
        for (const item of token.items || []) {
          if (item.task) item.taskIndex = nextIndex++;
          visit(item.tokens);
        }
      } else if (token.tokens) {
        visit(token.tokens);
      }
    }
  };

  visit(tokens);
}

/**
 * Renders a single block-level token into a Figma widget node.
 * Dispatches to specialized renderers based on token type.
 */
function renderToken(
  token: Token,
  key: number,
  baseSize: number,
  contentWidth: number,
  addHeadingSpacing = true,
  onToggleTask?: TaskToggleHandler
): FigmaDeclarativeNode | null {
  switch (token.type) {
    case "heading": {
      const depth = token.depth || 1;
      const scale = HEADING_SCALE[depth] || 1;
      const size = Math.round(baseSize * scale);
      const topPadding = addHeadingSpacing
        ? Math.round(baseSize * (depth === 1 ? 1.25 : depth === 2 ? 0.75 : 0))
        : 0;
      const underlineSpacing = Math.round(
        baseSize * (depth === 1 ? 0.375 : depth === 2 ? 0.25 : 0)
      );

      return (
        <AutoLayout
          key={key}
          direction="vertical"
          width="fill-parent"
          padding={{ top: topPadding }}
          spacing={underlineSpacing}
        >
          {renderInlineParagraph(
            token.tokens || [],
            key,
            size,
            { ...DEFAULT_STYLE, bold: true },
            undefined
          )}
          {depth === 1 && (
            <Rectangle height={2} width="fill-parent" fill={HR_COLOR} />
          )}
          {depth === 2 && (
            <Rectangle
              height={3}
              width={Math.round(baseSize * 2.5)}
              fill={LINK_COLOR}
              cornerRadius={2}
            />
          )}
        </AutoLayout>
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
      return renderBlockquote(
        token,
        key,
        baseSize,
        (nestedToken, nestedKey, nestedBaseSize, nestedContentWidth) =>
          renderToken(
            nestedToken,
            nestedKey,
            nestedBaseSize,
            nestedContentWidth,
            true,
            onToggleTask
          ),
        contentWidth
      );

    case "list":
      return renderList(token, key, baseSize, 0, onToggleTask);

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
