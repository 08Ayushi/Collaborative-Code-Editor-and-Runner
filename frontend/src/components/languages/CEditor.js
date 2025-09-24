import React from "react";
import LanguageEditorTemplate from "./LanguageEditorTemplate";

const CEditor = ({ code, onChange }) => (
  <LanguageEditorTemplate language="c" code={code} onChange={onChange} />
);

export default CEditor;
