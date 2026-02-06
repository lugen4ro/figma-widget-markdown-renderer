export type Token = {
  type: string;
  raw: string;
  text?: string;
  tokens?: Token[];
  depth?: number;
  // table
  header?: TableCell[];
  rows?: TableCell[][];
  align?: (string | null)[];
  // list
  ordered?: boolean;
  start?: number | "";
  items?: ListItem[];
  // code block
  lang?: string;
  // checkbox
  checked?: boolean;
  // link / image
  href?: string;
  title?: string | null;
};

export type TableCell = {
  text: string;
  tokens?: Token[];
  header?: boolean;
  align?: string | null;
};

export type ListItem = {
  type: string;
  raw: string;
  text: string;
  tokens: Token[];
  task: boolean;
  checked?: boolean;
  loose: boolean;
};

export type InlineStyle = {
  bold: boolean;
  italic: boolean;
  code: boolean;
  strikethrough: boolean;
  link?: string;
};

export type FlatSpan = {
  text: string;
  style: InlineStyle;
};

// Block-level token renderer signature (used to break circular deps)
export type TokenRenderer = (
  token: Token,
  key: number,
  baseSize: number,
  contentWidth: number
) => FigmaDeclarativeNode | null;

// ── Constants ────────────────────────────────────────────────

export const HEADING_SCALE: Record<number, number> = {
  1: 2,
  2: 1.5,
  3: 1.25,
  4: 1.125,
  5: 1,
  6: 0.875,
};

export const TABLE_BORDER = "#d0d7de";
export const TABLE_HEADER_BG = "#f6f8fa";
export const CODE_BLOCK_BG = "#1e1e1e";
export const CODE_BLOCK_FG = "#d4d4d4";
export const CODE_INLINE_COLOR = "#e06c75";
export const BLOCKQUOTE_BORDER = "#d1d5db";
export const BLOCKQUOTE_FG = "#656d76";
export const HR_COLOR = "#d1d5db";
export const CODE_FONT = "Source Code Pro";
export const LINK_COLOR = "#0366d6";
export const CHECK_COLOR = "#1a7f37";
export const UNCHECK_COLOR = "#656d76";

export const DEFAULT_STYLE: InlineStyle = {
  bold: false,
  italic: false,
  code: false,
  strikethrough: false,
};
