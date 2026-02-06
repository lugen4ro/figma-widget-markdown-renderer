import {
  Token,
  TableCell,
  InlineStyle,
  DEFAULT_STYLE,
  TABLE_BORDER,
  TABLE_HEADER_BG,
} from "./types";
import {
  hasInlineFormatting,
  flattenInlineTokens,
  renderSpan,
} from "./inline";

const { widget } = figma;
const { AutoLayout, Text } = widget;

function getTextAlign(
  align: string | null | undefined
): "left" | "center" | "right" {
  if (align === "center") return "center";
  if (align === "right") return "right";
  return "left";
}

/** Renders a single table cell with the given column width. */
function renderTableCell(
  cell: TableCell,
  ci: number,
  aligns: (string | null)[],
  tableSize: number,
  cellPadV: number,
  cellPadH: number,
  isHeader: boolean,
  colWidth: number
): FigmaDeclarativeNode {
  const cellTokens = cell.tokens || [];
  const textAlign = getTextAlign(aligns[ci]);
  const hasFormatting =
    cellTokens.length > 0 && hasInlineFormatting(cellTokens);

  let content: FigmaDeclarativeNode;
  if (hasFormatting) {
    const baseStyle: InlineStyle = isHeader
      ? { ...DEFAULT_STYLE, bold: true }
      : DEFAULT_STYLE;
    content = (
      <AutoLayout direction="horizontal" width="fill-parent" spacing={0} wrap>
        {flattenInlineTokens(cellTokens, baseStyle).map((span, si) =>
          renderSpan(span, si, tableSize)
        )}
      </AutoLayout>
    );
  } else {
    content = (
      <Text
        fontSize={tableSize}
        fontWeight={isHeader ? "bold" : "normal"}
        width="fill-parent"
        horizontalAlignText={textAlign}
      >
        {cell.text}
      </Text>
    );
  }

  return (
    <AutoLayout
      key={ci}
      direction="vertical"
      width={colWidth}
      height="fill-parent"
      verticalAlignItems="center"
      padding={{ vertical: cellPadV, horizontal: cellPadH }}
      stroke={TABLE_BORDER}
      strokeWidth={1}
    >
      {content}
    </AutoLayout>
  );
}

/**
 * Computes proportional column widths based on the maximum text length
 * in each column (across header + all body rows). Ensures each column
 * gets at least a minimum width so short columns remain readable.
 */
function computeColumnWidths(
  headerCells: TableCell[],
  rows: TableCell[][],
  totalWidth: number,
  minColWidth: number
): number[] {
  const numCols = headerCells.length;
  if (numCols === 0) return [];

  const maxLengths = headerCells.map((cell, ci) => {
    let max = cell.text.length;
    for (const row of rows) {
      if (row[ci]) {
        max = Math.max(max, row[ci].text.length);
      }
    }
    return Math.max(max, 1);
  });

  const totalLength = maxLengths.reduce((sum, l) => sum + l, 0);
  const distributable = Math.max(0, totalWidth - numCols * minColWidth);

  return maxLengths.map((l) =>
    Math.round(minColWidth + distributable * (l / totalLength))
  );
}

export function renderTable(
  token: Token,
  key: number,
  baseSize: number,
  contentWidth: number
): FigmaDeclarativeNode {
  const headerCells = token.header || [];
  const rows = token.rows || [];
  const aligns = token.align || [];
  const tableSize = Math.round(baseSize * 0.875);
  const cellPadV = Math.max(4, Math.round(baseSize * 0.5));
  const cellPadH = Math.max(6, Math.round(baseSize * 0.75));

  const minColWidth = cellPadH * 2 + tableSize * 3;
  const colWidths = computeColumnWidths(
    headerCells,
    rows,
    contentWidth,
    minColWidth
  );

  return (
    <AutoLayout
      key={key}
      direction="vertical"
      width="fill-parent"
      stroke={TABLE_BORDER}
      strokeWidth={1}
      cornerRadius={4}
      overflow="hidden"
    >
      <AutoLayout
        direction="horizontal"
        width="fill-parent"
        fill={TABLE_HEADER_BG}
      >
        {headerCells.map((cell, ci) =>
          renderTableCell(
            cell, ci, aligns, tableSize, cellPadV, cellPadH, true,
            colWidths[ci] || minColWidth
          )
        )}
      </AutoLayout>

      {rows.map((row, ri) => (
        <AutoLayout key={ri + 1} direction="horizontal" width="fill-parent">
          {row.map((cell, ci) =>
            renderTableCell(
              cell, ci, aligns, tableSize, cellPadV, cellPadH, false,
              colWidths[ci] || minColWidth
            )
          )}
        </AutoLayout>
      ))}
    </AutoLayout>
  );
}
