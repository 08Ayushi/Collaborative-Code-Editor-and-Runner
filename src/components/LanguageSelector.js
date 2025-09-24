import React from "react";

const LanguageSelector = ({ selectedLanguage, onChange }) => (
  <select value={selectedLanguage} onChange={(e) => onChange(e.target.value)} className="language-selector">
    <option value="javascript">JavaScript</option>
    <option value="python">Python</option>
    <option value="java">Java</option>
    <option value="c">C</option>
    <option value="cpp">C++</option>
  </select>
);

export default LanguageSelector;
