import React from "react";
import LanguageEditorTemplate from "./LanguageEditorTemplate";

const JavaEditor = ({ code, onChange }) => (
  <LanguageEditorTemplate language="java" code={code} onChange={onChange} />
);

export default JavaEditor;
