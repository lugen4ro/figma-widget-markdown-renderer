import {
  Token,
  TokenRenderer,
  BLOCKQUOTE_BORDER,
  BLOCKQUOTE_FG,
  DEFAULT_STYLE,
} from "./types";
import { renderInlineParagraph } from "./inline";

const { widget } = figma;
const { AutoLayout, Rectangle } = widget;

/**
 * Renders a blockquote with a left border bar.
 * Recursively handles nested blockquotes.
 */
export function renderBlockquote(
  token: Token,
  key: number,
  baseSize: number,
  renderToken: TokenRenderer,
  contentWidth: number
): FigmaDeclarativeNode {
  const innerTokens = token.tokens || [];
  return (
    <AutoLayout
      key={key}
      direction="horizontal"
      width="fill-parent"
      spacing={12}
    >
      <Rectangle
        width={3}
        height="fill-parent"
        fill={BLOCKQUOTE_BORDER}
        cornerRadius={2}
      />
      <AutoLayout
        direction="vertical"
        width="fill-parent"
        spacing={Math.round(baseSize * 0.5)}
      >
        {innerTokens.map((t, i) => {
          if (t.type === "space") return null;

          if (t.type === "blockquote") {
            return renderBlockquote(t, i, baseSize, renderToken, contentWidth);
          }

          if (t.type === "paragraph") {
            return renderInlineParagraph(
              t.tokens || [],
              i,
              baseSize,
              DEFAULT_STYLE,
              BLOCKQUOTE_FG
            );
          }

          return renderToken(t, i, baseSize, contentWidth);
        })}
      </AutoLayout>
    </AutoLayout>
  );
}
