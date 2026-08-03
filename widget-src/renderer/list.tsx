import {
  Token,
  ListItem,
  FlatSpan,
  TaskToggleHandler,
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
const { AutoLayout, SVG, Text } = widget;

export function renderList(
  token: Token,
  key: number,
  baseSize: number,
  depth: number,
  onToggleTask?: TaskToggleHandler
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
        renderListItem(
          item,
          i,
          baseSize,
          ordered,
          start + i,
          depth,
          onToggleTask
        )
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
  depth: number,
  onToggleTask?: TaskToggleHandler
): FigmaDeclarativeNode {
  const isTask = item.task;
  const checked = item.checked === true;

  let bulletWidth: number;
  if (isTask) {
    bulletWidth = Math.round(baseSize * 1.5);
  } else if (ordered) {
    bulletWidth = Math.round(baseSize * 1.5);
  } else {
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

  const bullet = ordered ? index + "." : "\u2022";
  const checkboxSize = Math.max(14, Math.round(baseSize));
  const bulletNode = isTask ? (
    <AutoLayout
      width={bulletWidth}
      height={Math.round(baseSize * 1.5)}
      verticalAlignItems="center"
      hoverStyle={{ opacity: 0.75 }}
      tooltip={checked ? "Mark as incomplete" : "Mark as complete"}
      onClick={() => {
        if (item.taskIndex !== undefined) onToggleTask?.(item.taskIndex);
      }}
    >
      <AutoLayout
        width={checkboxSize}
        height={checkboxSize}
        horizontalAlignItems="center"
        verticalAlignItems="center"
        fill={checked ? CHECK_COLOR : "#FFFFFF"}
        stroke={checked ? CHECK_COLOR : UNCHECK_COLOR}
        strokeWidth={1.5}
        cornerRadius={3}
      >
        {checked && (
          <SVG
            width={Math.round(checkboxSize * 0.7)}
            height={Math.round(checkboxSize * 0.7)}
            src={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12"><path d="M2.2 6.2 4.8 8.6 9.8 3.5" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`}
          />
        )}
      </AutoLayout>
    </AutoLayout>
  ) : (
    <Text fontSize={baseSize} width={bulletWidth}>
      {bullet}
    </Text>
  );

  return (
    <AutoLayout key={key} direction="vertical" width="fill-parent" spacing={4}>
      <AutoLayout direction="horizontal" width="fill-parent" spacing={0}>
        {bulletNode}
        {inlineContent}
      </AutoLayout>
      {blockTokens.map((t, i) =>
        renderList(t, i, baseSize, depth + 1, onToggleTask)
      )}
    </AutoLayout>
  );
}
