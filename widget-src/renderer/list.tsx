import {
  Token,
  ListItem,
  FlatSpan,
  DEFAULT_STYLE,
  CHECK_COLOR,
  UNCHECK_COLOR,
} from "./types";
import {
  hasInlineFormatting,
  flattenInlineTokens,
  renderSpan,
} from "./inline";

const { widget } = figma;
const { AutoLayout, Text } = widget;

export function renderList(
  token: Token,
  key: number,
  baseSize: number,
  depth: number
): FigmaDeclarativeNode {
  const items = token.items || [];
  const ordered = token.ordered || false;
  const start = typeof token.start === "number" ? token.start : 1;

  return (
    <AutoLayout
      key={key}
      direction="vertical"
      width="fill-parent"
      spacing={Math.round(baseSize * 0.375)}
      padding={{ left: depth > 0 ? Math.round(baseSize * 1.25) : 0 }}
    >
      {items.map((item, i) =>
        renderListItem(item, i, baseSize, ordered, start + i, depth)
      )}
    </AutoLayout>
  );
}

function renderListItem(
  item: ListItem,
  key: number,
  baseSize: number,
  ordered: boolean,
  index: number,
  depth: number
): FigmaDeclarativeNode {
  const isTask = item.task;
  const checked = item.checked === true;

  let bullet: string;
  let bulletWidth: number;
  if (isTask) {
    bullet = checked ? "\u2611" : "\u2610";
    bulletWidth = Math.round(baseSize * 1.25);
  } else if (ordered) {
    bullet = index + ".";
    bulletWidth = Math.round(baseSize * 1.5);
  } else {
    bullet = "\u2022";
    bulletWidth = Math.round(baseSize * 1);
  }

  const inlineTokens: Token[] = [];
  const blockTokens: Token[] = [];
  for (const t of item.tokens) {
    if (t.type === "list") {
      blockTokens.push(t);
    } else if (t.type === "checkbox") {
      continue;
    } else {
      inlineTokens.push(t);
    }
  }

  const allSpans: FlatSpan[] = [];
  let hasFormatting = false;
  for (const t of inlineTokens) {
    if (t.tokens) {
      if (hasInlineFormatting(t.tokens)) hasFormatting = true;
      allSpans.push(...flattenInlineTokens(t.tokens, DEFAULT_STYLE));
    } else if (t.text) {
      allSpans.push({ text: t.text, style: DEFAULT_STYLE });
    }
  }

  let inlineContent: FigmaDeclarativeNode;
  if (hasFormatting || allSpans.length === 0) {
    inlineContent = (
      <AutoLayout
        direction="horizontal"
        width="fill-parent"
        spacing={0}
        wrap
      >
        {allSpans.map((span, si) => {
          if (isTask && checked) {
            const checkedSpan: FlatSpan = {
              text: span.text,
              style: { ...span.style, strikethrough: true },
            };
            return renderSpan(checkedSpan, si, baseSize, UNCHECK_COLOR);
          }
          return renderSpan(span, si, baseSize);
        })}
      </AutoLayout>
    );
  } else {
    const textContent = allSpans.map((s) => s.text).join("").trim();
    const textProps: Record<string, any> = {
      fontSize: baseSize,
      width: "fill-parent",
    };
    if (isTask && checked) {
      textProps.fill = UNCHECK_COLOR;
      textProps.textDecoration = "strikethrough";
    }
    inlineContent = <Text {...textProps}>{textContent}</Text>;
  }

  const bulletColor = isTask
    ? checked
      ? CHECK_COLOR
      : UNCHECK_COLOR
    : undefined;
  const bulletProps: Record<string, any> = {
    fontSize: baseSize,
    width: bulletWidth,
  };
  if (bulletColor) bulletProps.fill = bulletColor;

  return (
    <AutoLayout key={key} direction="vertical" width="fill-parent" spacing={4}>
      <AutoLayout direction="horizontal" width="fill-parent" spacing={0}>
        <Text {...bulletProps}>{bullet}</Text>
        {inlineContent}
      </AutoLayout>
      {blockTokens.map((t, i) => renderList(t, i, baseSize, depth + 1))}
    </AutoLayout>
  );
}
