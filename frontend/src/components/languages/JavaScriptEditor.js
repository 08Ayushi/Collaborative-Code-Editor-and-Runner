// src/components/languages/JavaScriptEditor.js
import React from "react";
import LanguageEditorTemplate from "./LanguageEditorTemplate";

const JavaScriptEditor = ({ code, onChange, borderColor, onCursorMove }) => (
  <div className="editor-border" style={{ borderColor }}>
    <LanguageEditorTemplate
      language="javascript"
      code={code}
      onChange={onChange}
      onCursorMove={onCursorMove}  // <-- important
    />
  </div>
);

export default JavaScriptEditor;
