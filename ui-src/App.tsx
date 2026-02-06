import React, { useEffect, useState, useCallback } from "react";
import { marked } from "marked";
import "./App.css";

marked.setOptions({ gfm: true, breaks: true });

function App() {
  const [markdown, setMarkdown] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data.pluginMessage;
      if (msg && msg.type === "load") {
        setMarkdown(msg.markdown);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const handleSave = useCallback(() => {
    parent.postMessage({ pluginMessage: { type: "save", markdown } }, "*");
  }, [markdown]);

  const handleClose = useCallback(() => {
    parent.postMessage({ pluginMessage: { type: "save", markdown } }, "*");
    parent.postMessage({ pluginMessage: { type: "close" } }, "*");
  }, [markdown]);

  const html = marked.parse(markdown) as string;

  return (
    <div className="editor-container">
      <div className="toolbar">
        <span className="toolbar-title">Markdown Editor</span>
        <div className="toolbar-actions">
          <button
            className={"btn" + (showPreview ? " btn-active" : "")}
            onClick={() => setShowPreview(!showPreview)}
          >
            Preview
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Save
          </button>
          <button className="btn btn-close" onClick={handleClose}>
            Save &amp; Close
          </button>
        </div>
      </div>
      <div className="split-pane">
        <div className="pane editor-pane">
          <textarea
            className="editor-textarea"
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            placeholder="Type markdown here..."
            spellCheck={false}
          />
        </div>
        {showPreview && (
          <div className="pane preview-pane">
            <div
              className="preview-content markdown-body"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
