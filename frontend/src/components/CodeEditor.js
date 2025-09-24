// src/components/CodeEditor.js
import React, { useState, useEffect, useMemo, useCallback } from "react";
import "./CodeEditor.css";
import "./LiveTerminal.css";

import LanguageSelector from "./LanguageSelector";
import JavaScriptEditor from "./languages/JavaScriptEditor";
import PythonEditor from "./languages/PythonEditor";
import JavaEditor from "./languages/JavaEditor";
import CEditor from "./languages/CEditor";
import CppEditor from "./languages/CppEditor";
import LiveTerminal from "./LiveTerminal";
import AuthModal from "./AuthModal";

const API_BASE = process.env.REACT_APP_API_BASE || "";

async function apiFetch(url, options = {}) {
  const res = await fetch(url, options);
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : { error: await res.text() };
  return { res, data };
}

function useScrollLock() {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
}

const LANGUAGE_TEMPLATES = {
  javascript: `console.log("Hello, World!");`,
  python: `print("Hello from Python!")`,
  java: `public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello from Java!");\n  }\n}`,
  c: `#include <stdio.h>\nint main() {\n  printf("Hello from C!\\n");\n  return 0;\n}`,
  cpp: `#include <iostream>\nusing namespace std;\nint main() {\n  cout << "Hello from C++!" << endl;\n  return 0;\n}`,
};

const EXT = { javascript: "js", python: "py", java: "java", c: "c", cpp: "cpp" };

export default function CodeEditor({
  onCreateRoom,
  onJoinRoom,
  roomId,
  connectedUsers = [],
  socket
}) {
  useScrollLock();

  const [language, setLanguage] = useState("javascript");
  const [runTrigger, setRunTrigger] = useState(0);
  const [code, setCode] = useState(LANGUAGE_TEMPLATES.javascript);
  const [showTerminal, setShowTerminal] = useState(false);

  // auth
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);

  // last saved snippet id
  const [snippetId, setSnippetId] = useState(null);

  // mobile drawer
  const [showDrawer, setShowDrawer] = useState(false);
  const [isMobile, setIsMobile] = useState(
    window.matchMedia("(max-width: 900px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
  }, []);

  const displayName = user ? (user.name || user.username || user.email) : null;

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    setShowTerminal(false);
  };

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    setCode(LANGUAGE_TEMPLATES[newLang] || "");
    setShowTerminal(false);
  };

  const handleRun = () => {
    setShowTerminal(true);
    setRunTrigger((t) => t + 1);
  };

  const Editor = useMemo(() => {
    const props = { code, onChange: handleCodeChange };
    switch (language) {
      case "python": return <PythonEditor {...props} />;
      case "java":   return <JavaEditor {...props} />;
      case "c":      return <CEditor {...props} />;
      case "cpp":    return <CppEditor {...props} />;
      default:       return <JavaScriptEditor {...props} />;
    }
  }, [language, code]);

  const needLogin = () => {
    const token = localStorage.getItem("token");
    return !token || !user;
  };

  const tokenHeader = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setShowDrawer(false);
  }, []);

  const defaultFilename = () => `main.${EXT[language] || "txt"}`;

  function triggerDownloadBlob(filename) {
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || defaultFilename();
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return blob.size;
  }

  async function handleDownload() {
    if (needLogin()) {
      setShowAuth(true);
      return;
    }
    let filename = defaultFilename();

    const bytes = triggerDownloadBlob(filename);

    try {
      if (snippetId) {
        await apiFetch(`${API_BASE}/api/snippets/${snippetId}/record-download`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...tokenHeader() },
          body: JSON.stringify({ bytes }),
        });
      } else {
        await apiFetch(`${API_BASE}/api/track/download`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...tokenHeader() },
          body: JSON.stringify({ filename, language, bytes }),
        });
      }
    } catch {
      /* no-op */
    }
  }

  return (
    <div className="code-editor-page">
      <div className="topbar">
        <div className="topbar-left">
          {isMobile && (
            <button
              className="hamburger"
              aria-label="Open menu"
              onClick={() => setShowDrawer(true)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="currentColor" d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z"/>
              </svg>
            </button>
          )}
          <h1 className="app-title">CodeCollab</h1>
          {!isMobile && user && (
            <span className="signed-in-pill">Signed in as: {displayName}</span>
          )}
        </div>

        {!isMobile ? (
          <div className="topbar-actions">
            <button className="create-room-btn" onClick={onCreateRoom}>Create Room</button>
            <button className="create-room-btn" onClick={onJoinRoom}>Join Room</button>
            <button className="download-btn icon-btn" onClick={handleDownload}>
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12 3v10.17l3.59-3.58L17 11l-5 5-5-5 1.41-1.41L11 13.17V3h1zM5 18h14v2H5z"/>
              </svg>
              <span className="label">Download</span>
            </button>
            {!user ? (
              <button className="login-btn" onClick={() => setShowAuth(true)}>Log in</button>
            ) : (
              <button className="logout-btn" onClick={handleLogout}>Log out</button>
            )}
          </div>
        ) : (
          <div className="mobile-right-spacer" />
        )}
      </div>

      <div className="code-editor-layout">
        <div className="editor-section">
          <div className="editor-header">
            <LanguageSelector selectedLanguage={language} onChange={handleLanguageChange} />
            <div className="editor-actions">
              <button className="run-button" onClick={handleRun}>
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M8 5v14l11-7z"/>
                </svg>
                <span className="label">Run Code</span>
              </button>
            </div>
          </div>
          {Editor}
        </div>

        {showTerminal && (
          <LiveTerminal
            code={code}
            language={language}
            runTrigger={runTrigger}
            roomId={roomId}
            socket={socket}
          />
        )}
      </div>

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={(u) => setUser(u)}
        />
      )}

      {isMobile && showDrawer && (
        <div className="drawer-backdrop" onClick={() => setShowDrawer(false)}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <div className="drawer-title">Realtime code editor</div>
              <button className="drawer-close" onClick={() => setShowDrawer(false)}>Close</button>
            </div>

            <div className="drawer-section">
              {user ? (
                <div className="signed-in-pill small">Signed in as: {displayName}</div>
              ) : (
                <div className="signed-in-pill small">Guest</div>
              )}
            </div>

            <div className="drawer-section">
              <button className="create-room-btn" onClick={onCreateRoom}>Create Room</button>
              <button className="join-room-btn" onClick={onJoinRoom}>Join Room</button>
              <button className="download-btn" onClick={handleDownload}>Download</button>
            </div>

            <div className="drawer-section">
              {!user ? (
                <button className="login-btn" onClick={() => { setShowAuth(true); setShowDrawer(false); }}>Log in</button>
              ) : (
                <button className="logout-btn" onClick={handleLogout}>Log out</button>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
