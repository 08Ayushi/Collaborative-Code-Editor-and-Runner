import React from "react";
import LanguageEditorTemplate from "./LanguageEditorTemplate";

const PythonEditor = ({ code, onChange }) => (
  <LanguageEditorTemplate language="python" code={code} onChange={onChange} />
);

export default PythonEditor;
