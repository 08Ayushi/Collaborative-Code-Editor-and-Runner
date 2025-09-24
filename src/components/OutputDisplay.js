import React from "react";

const OutputDisplay = ({ output, error }) => (
  <div className="output-section">
    <div className="output-header">Output</div>
    <div className="output-content">
      {error ? (
        <div className="error-message">{error}</div>
      ) : (
        <pre className="output-text">{output}</pre>
      )}
    </div>
  </div>
);

export default OutputDisplay;
