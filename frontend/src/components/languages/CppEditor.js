import React from "react";
import LanguageEditorTemplate from "./LanguageEditorTemplate";

const CppEditor = ({ code, onChange }) => (
  <LanguageEditorTemplate language="cpp" code={code} onChange={onChange} />
);

export default CppEditor;
