import React, { useEffect } from "react";
import Editor from "@monaco-editor/react";
import * as monaco from "monaco-editor";

const LanguageEditorTemplate = ({ language, code, onChange }) => {
  useEffect(() => {
    if (language !== "javascript" && language !== "typescript") {
      monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: true,
        noSyntaxValidation: true,
      });
    }
  }, [language]);
  

  return (
    <Editor
      height="calc(100vh - 180px)"
      language={language === 'cpp' ? 'cpp' : language}
      value={code}
      theme="vs-dark"
      onChange={(value) => onChange(value || "")}
      options={{
        fontSize: 14,
        fontFamily: "'JetBrains Mono', monospace",
        minimap: { enabled: false },
        automaticLayout: true,
      }}
    />
  );
};

export default LanguageEditorTemplate;