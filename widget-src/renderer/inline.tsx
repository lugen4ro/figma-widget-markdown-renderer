import {
  Token,
  InlineStyle,
  FlatSpan,
  CODE_FONT,
  CODE_INLINE_COLOR,
  LINK_COLOR,
} from "./types";

const { widget } = figma;
const { AutoLayout, Text, Rectangle } = widget;

const IMAGE_MAX_HEIGHT = 300;

export function hasInlineFormatting(tokens: Token[]): boolean {
  return tokens.some(
    (t) =>
      t.type === "strong" ||
      t.type === "em" ||
      t.type === "codespan" ||
      t.type === "del" ||
      t.type === "link" ||
      t.type === "image"
  );
}

export function flattenInlineTokens(
  tokens: Token[],
  style: InlineStyle
): FlatSpan[] {
  const spans: FlatSpan[] = [];
  for (const token of tokens) {
    switch (token.type) {
      case "text":
        if (token.tokens && token.tokens.length > 0) {
          spans.push(...flattenInlineTokens(token.tokens, style));
        } else {
          spans.push({ text: token.text || token.raw, style });
        }
        break;
      case "strong":
        spans.push(
          ...flattenInlineTokens(token.tokens || [], { ...style, bold: true })
        );
        break;
      case "em":
        spans.push(
          ...flattenInlineTokens(token.tokens || [], { ...style, italic: true })
        );
        break;
      case "codespan":
        spans.push({
          text: token.text || token.raw,
          style: { ...style, code: true },
        });
        break;
      case "del":
        spans.push(
          ...flattenInlineTokens(token.tokens || [], {
            ...style,
            strikethrough: true,
          })
        );
        break;
      case "link":
        spans.push(
          ...flattenInlineTokens(token.tokens || [], {
            ...style,
            link: token.href,
          })
        );
        break;
      case "image":
        // Handled separately — skip in flat spans
        break;
      case "br":
        spans.push({ text: "\n", style });
        break;
      case "escape":
        spans.push({ text: token.text || token.raw, style });
        break;
      case "checkbox":
        break;
      default:
        spans.push({ text: token.raw, style });
        break;
    }
  }
  return spans;
}

export function renderSpan(
  span: FlatSpan,
  key: number,
  fontSize: number,
  fillOverride?: string
): FigmaDeclarativeNode {
  const { text, style } = span;
  const props: Record<string, any> = { key, fontSize };

  if (fillOverride && !style.code && !style.link) {
    props.fill = fillOverride;
  }
  if (style.code) {
    props.fontFamily = CODE_FONT;
    props.fill = CODE_INLINE_COLOR;
  } else if (style.link) {
    props.fill = LINK_COLOR;
    props.href = style.link;
  }
  if (style.bold) props.fontWeight = "bold";
  if (style.italic) props.italic = true;
  if (style.strikethrough) props.textDecoration = "strikethrough";

  return <Text {...props}>{text}</Text>;
}

function hasImages(tokens: Token[]): boolean {
  return tokens.some((t) => t.type === "image");
}

export function renderInlineParagraph(
  tokens: Token[],
  key: number,
  fontSize: number,
  baseStyle: InlineStyle,
  fillOverride: string | undefined
): FigmaDeclarativeNode {
  if (tokens.length === 0) {
    return (
      <Text key={key} fontSize={fontSize} width="fill-parent">
        {""}
      </Text>
    );
  }

  // Paragraph with images: render as vertical layout with mixed text/image blocks
  if (hasImages(tokens)) {
    return renderMixedParagraph(tokens, key, fontSize, baseStyle, fillOverride);
  }

  if (hasInlineFormatting(tokens)) {
    return (
      <AutoLayout
        key={key}
        direction="horizontal"
        width="fill-parent"
        spacing={0}
        wrap
      >
        {flattenInlineTokens(tokens, baseStyle).map((span, si) =>
          renderSpan(span, si, fontSize, fillOverride)
        )}
      </AutoLayout>
    );
  }

  const text = tokens.map((t) => t.text || t.raw).join("");
  const props: Record<string, any> = { key, fontSize, width: "fill-parent" };
  if (baseStyle.bold) props.fontWeight = "bold";
  if (baseStyle.italic) props.italic = true;
  if (fillOverride) props.fill = fillOverride;
  return <Text {...props}>{text}</Text>;
}

/**
 * Renders a paragraph that contains images mixed with text.
 * Groups consecutive non-image tokens into text runs, and renders
 * image tokens as Image components between them.
 */
function renderMixedParagraph(
  tokens: Token[],
  key: number,
  fontSize: number,
  baseStyle: InlineStyle,
  fillOverride: string | undefined
): FigmaDeclarativeNode {
  // Group tokens into segments: runs of text tokens, then image tokens
  type Segment =
    | { kind: "text"; tokens: Token[] }
    | { kind: "image"; token: Token };

  const segments: Segment[] = [];
  let currentText: Token[] = [];

  for (const t of tokens) {
    if (t.type === "image") {
      if (currentText.length > 0) {
        segments.push({ kind: "text", tokens: currentText });
        currentText = [];
      }
      segments.push({ kind: "image", token: t });
    } else {
      currentText.push(t);
    }
  }
  if (currentText.length > 0) {
    segments.push({ kind: "text", tokens: currentText });
  }

  return (
    <AutoLayout
      key={key}
      direction="vertical"
      width="fill-parent"
      spacing={8}
    >
      {segments.map((seg, si) => {
        if (seg.kind === "image") {
          return renderImage(seg.token, si);
        }
        // Text run
        const hasFormatting = hasInlineFormatting(seg.tokens);
        if (hasFormatting) {
          return (
            <AutoLayout
              key={si}
              direction="horizontal"
              width="fill-parent"
              spacing={0}
              wrap
            >
              {flattenInlineTokens(seg.tokens, baseStyle).map((span, ssi) =>
                renderSpan(span, ssi, fontSize, fillOverride)
              )}
            </AutoLayout>
          );
        }
        const text = seg.tokens.map((t) => t.text || t.raw).join("");
        if (!text.trim()) return null;
        const props: Record<string, any> = {
          key: si,
          fontSize,
          width: "fill-parent",
        };
        if (baseStyle.bold) props.fontWeight = "bold";
        if (fillOverride) props.fill = fillOverride;
        return <Text {...props}>{text}</Text>;
      })}
    </AutoLayout>
  );
}

function renderImage(token: Token, key: number): FigmaDeclarativeNode {
  const src = token.href || "";
  const alt = token.text || "";

  if (!src) {
    return (
      <Text key={key} fontSize={14} fill="#999">
        {"[image: " + alt + "]"}
      </Text>
    );
  }

  return (
    <AutoLayout key={key} width="fill-parent" overflow="hidden" cornerRadius={4}>
      <Rectangle
        width="fill-parent"
        height={IMAGE_MAX_HEIGHT}
        fill={{ type: "image", src, scaleMode: "fit" }}
      />
    </AutoLayout>
  );
}
