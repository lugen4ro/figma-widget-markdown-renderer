/**
 * Converts highlight.js HTML output into flat colored spans suitable for
 * rendering as multiple Figma `<Text>` nodes.
 *
 * hljs produces HTML like:
 *   `<span class="hljs-keyword">const</span> x = <span class="hljs-number">42</span>`
 *
 * We parse that into `HighlightSpan[]` (text + scope pairs), split by line,
 * and map scopes to VS Code Dark+ inspired colors.
 */

/** A single text fragment with an optional hljs scope (e.g. "hljs-keyword"). */
export type HighlightSpan = {
  text: string;
  scope: string | null;
};

// ── VS Code Dark+ inspired color theme ──────────────────────

/** Maps hljs CSS class names to hex colors for rendering on a dark background. */
const DARK_THEME: Record<string, string> = {
  // Keywords & control flow
  "hljs-keyword": "#569cd6",
  "hljs-built_in": "#4ec9b0",
  "hljs-type": "#4ec9b0",
  "hljs-literal": "#569cd6",
  "hljs-symbol": "#569cd6",

  // Strings & values
  "hljs-string": "#ce9178",
  "hljs-number": "#b5cea8",
  "hljs-regexp": "#d16969",

  // Comments & meta
  "hljs-comment": "#6a9955",
  "hljs-doctag": "#608b4e",
  "hljs-meta": "#569cd6",

  // Functions & classes
  "hljs-title": "#dcdcaa",
  "hljs-title.function_": "#dcdcaa",
  "hljs-title.class_": "#4ec9b0",

  // Variables & params
  "hljs-variable": "#9cdcfe",
  "hljs-params": "#9cdcfe",
  "hljs-attr": "#9cdcfe",
  "hljs-property": "#9cdcfe",

  // Punctuation & operators
  "hljs-punctuation": "#d4d4d4",
  "hljs-operator": "#d4d4d4",

  // HTML/XML specific
  "hljs-tag": "#569cd6",
  "hljs-name": "#569cd6",
  "hljs-attribute": "#9cdcfe",

  // Diff
  "hljs-addition": "#b5cea8",
  "hljs-deletion": "#ce9178",

  // Section headers
  "hljs-section": "#569cd6",

  // Template interpolation
  "hljs-subst": "#d4d4d4",
  "hljs-template-variable": "#9cdcfe",
  "hljs-template-tag": "#569cd6",
};

/** Default foreground for tokens with no matching scope. */
const DEFAULT_FG = "#d4d4d4";

/**
 * Looks up a hex color for a given hljs scope string.
 * Falls back to the default foreground if no match is found.
 */
export function scopeToColor(scope: string | null): string {
  if (!scope) return DEFAULT_FG;
  return DARK_THEME[scope] || DEFAULT_FG;
}

/**
 * Simple state-machine parser that converts hljs HTML output into flat spans.
 *
 * Handles nested `<span>` tags by maintaining a scope stack — the innermost
 * (most specific) scope wins for any given character range.
 */
export function parseHighlightHtml(html: string): HighlightSpan[] {
  const spans: HighlightSpan[] = [];
  const scopeStack: (string | null)[] = [null];
  let buffer = "";
  let i = 0;

  /** Flushes the current text buffer as a span with the current scope. */
  function flush(): void {
    if (buffer.length > 0) {
      spans.push({ text: buffer, scope: scopeStack[scopeStack.length - 1] });
      buffer = "";
    }
  }

  while (i < html.length) {
    if (html[i] === "<") {
      // Find the end of the tag
      const tagEnd = html.indexOf(">", i);
      if (tagEnd === -1) {
        // Malformed HTML — treat rest as text
        buffer += html.slice(i);
        break;
      }

      const tag = html.slice(i, tagEnd + 1);

      if (tag.startsWith("</")) {
        // Closing tag — pop scope
        flush();
        if (scopeStack.length > 1) {
          scopeStack.pop();
        }
      } else if (tag.startsWith("<span")) {
        // Opening span — extract class and push scope
        flush();
        const classMatch = tag.match(/class="([^"]+)"/);
        const scope = classMatch ? classMatch[1] : null;
        scopeStack.push(scope);
      }
      // Skip other tags (shouldn't appear in hljs output)

      i = tagEnd + 1;
    } else if (html[i] === "&") {
      // Decode HTML entities that hljs escapes
      if (html.startsWith("&amp;", i)) {
        buffer += "&";
        i += 5;
      } else if (html.startsWith("&lt;", i)) {
        buffer += "<";
        i += 4;
      } else if (html.startsWith("&gt;", i)) {
        buffer += ">";
        i += 4;
      } else if (html.startsWith("&quot;", i)) {
        buffer += '"';
        i += 6;
      } else if (html.startsWith("&#x27;", i)) {
        buffer += "'";
        i += 6;
      } else if (html.startsWith("&#39;", i)) {
        buffer += "'";
        i += 5;
      } else {
        buffer += html[i];
        i++;
      }
    } else {
      buffer += html[i];
      i++;
    }
  }

  flush();
  return spans;
}

/**
 * Splits a flat list of spans into lines (arrays of spans), breaking at `\n`.
 * Each inner array represents one visual line of highlighted code.
 */
export function splitSpansByLine(spans: HighlightSpan[]): HighlightSpan[][] {
  const lines: HighlightSpan[][] = [[]];

  for (var si = 0; si < spans.length; si++) {
    var span = spans[si];
    var parts = span.text.split("\n");

    for (var pi = 0; pi < parts.length; pi++) {
      if (pi > 0) {
        // Start a new line
        lines.push([]);
      }
      if (parts[pi].length > 0) {
        lines[lines.length - 1].push({ text: parts[pi], scope: span.scope });
      }
    }
  }

  return lines;
}
