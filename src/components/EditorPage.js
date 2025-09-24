// src/components/EditorPage.js
import React, { useState, useEffect, useMemo } from "react";
import "./EditorPage.css";
import "./CodeEditor.css"; // editor styles
import "./LiveTerminal.css"; // terminal styles

import LanguageSelector from "./LanguageSelector";
import JavaScriptEditor from "./languages/JavaScriptEditor";
import PythonEditor from "./languages/PythonEditor";
import JavaEditor from "./languages/JavaEditor";
import CEditor from "./languages/CEditor";
import CppEditor from "./languages/CppEditor";
import LiveTerminal from "./LiveTerminal";
import AuthModal from "./AuthModal";

/* ---------- Same base URL mechanism as CodeEditor ---------- */
const API_BASE = process.env.REACT_APP_API_BASE || "";

/* ---------- tiny helper to parse JSON or text safely ---------- */
async function apiFetch(url, options = {}) {
  const res = await fetch(url, options);
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json")
    ? await res.json()
    : { error: await res.text() };
  return { res, data };
}

/* ---------- Scroll Lock Hook (optional) ---------- */
function useScrollLock() {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
}

/* ---------- Language Templates ---------- */
const LANGUAGE_TEMPLATES = {
  javascript: `console.log("Hello, World!");`,
  python: `print("Hello from Python!")`,
  java: `public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello from Java!");\n  }\n}`,
  c: `#include <stdio.h>\nint main() {\n  printf("Hello from C!\\n");\n  return 0;\n}`,
  cpp: `#include <iostream>\nusing namespace std;\nint main() {\n  cout << "Hello from C++!" << endl;\n  return 0;\n}`,
};

const EXT = { javascript: "js", python: "py", java: "java", c: "c", cpp: "cpp" };

export default function EditorPage({ roomId, username, socket, onLeave }) {
  useScrollLock(); // prevent page scroll while editor open

  // Editor state
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(LANGUAGE_TEMPLATES.javascript);
  const [showTerminal, setShowTerminal] = useState(false);
  const [runTrigger, setRunTrigger] = useState(0);
  const [clients, setClients] = useState([]);
  const [editingUsers, setEditingUsers] = useState(new Set());

  // Auth & snippet state (NEW)
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [snippetId, setSnippetId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

const copyRoomId = () => {
  navigator.clipboard.writeText(roomId);
};

const handleLogout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  setUser(null);
};

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
  }, []);

  /* ---------- presence for "editing" (unchanged) ---------- */
  useEffect(() => {
    socket.on("user-editing-start", ({ socketId }) => {
      setEditingUsers((s) => new Set(s).add(socketId));
    });
    socket.on("user-editing-stop", ({ socketId }) => {
      setEditingUsers((s) => {
        const copy = new Set(s);
        copy.delete(socketId);
        return copy;
      });
    });
    return () => {
      socket.off("user-editing-start");
      socket.off("user-editing-stop");
    };
  }, [socket]);

  /* ---------- helpers (NEW, same as in simple editor) ---------- */
  const needLogin = () => {
    const token = localStorage.getItem("token");
    return !token || !user;
  };

  const tokenHeader = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

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

    // If never saved, offer quick save name (optional)
    // if (!snippetId) {
    //   const quick = window.confirm("You haven't saved this yet. Save before download?");
    //   if (quick) {
    //     const saved = await saveSnippetFlow();
    //     if (saved) filename = saved.filename;
    //   }
    // }

    // 1) actual browser download
    const bytes = triggerDownloadBlob(filename);

    // 2) reflect in DB (best-effort)
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

  /* ---------- language / run / code change ---------- */
  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    setCode(LANGUAGE_TEMPLATES[newLang] || "");
    setShowTerminal(false);
    socket.emit("language-change", { roomId, language: newLang });
  };

  const handleRun = () => {
    setShowTerminal(true);
    socket.emit("terminal-focus", { roomId, sender: socket.id });
    setRunTrigger((t) => t + 1);
    socket.emit("run-trigger", { roomId, sender: socket.id });
  };

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    setShowTerminal(false);
    socket.emit("terminal-kill", { roomId });
    socket.emit("code-change", { roomId, code: newCode });
    socket.emit("user-editing-start", { roomId, socketId: socket.id });
    // optional: if you want to force a new "Save As" after big changes:
    // setSnippetId(null);
  };

  const Editor = useMemo(() => {
    const props = { code, onChange: handleCodeChange };
    switch (language) {
      case "python":
        return <PythonEditor {...props} />;
      case "java":
        return <JavaEditor {...props} />;
      case "c":
        return <CEditor {...props} />;
      case "cpp":
        return <CppEditor {...props} />;
      default:
        return <JavaScriptEditor {...props} />;
    }
  }, [language, code]);

  /* ---------- terminal-kill from others ---------- */
  useEffect(() => {
    socket.on("terminal-kill", () => setShowTerminal(false));
    return () => socket.off("terminal-kill");
  }, [socket]);

  /* ---------- collaborative presence ---------- */
  useEffect(() => {
    socket.emit("join", { roomId, username });

    socket.on("joined", ({ clients }) => setClients(clients));
    socket.on("disconnected", ({ clients }) => setClients(clients));

    socket.on("code-update", (newCode) => {
      if (newCode !== code) {
        setCode(newCode);
        setShowTerminal(false);
      }
    });

    socket.on("language-update", (newLang) => {
      setLanguage(newLang);
      setCode(LANGUAGE_TEMPLATES[newLang] || "");
      setShowTerminal(false);
    });

    socket.on("run-update", ({ sender }) => {
      if (sender !== socket.id) setShowTerminal(true);
    });

    return () => {
      socket.off("joined");
      socket.off("disconnected");
      socket.off("code-update");
      socket.off("language-update");
      socket.off("run-update");
    };
  }, [socket, roomId, username, code]);

  return (
    <div className="editor-wrapper">
       {/* Mobile header (shown on small screens) */}
    <div className="mobile-header">
      <button
        className="hamburger"
        aria-label="Open menu"
        onClick={() => setDrawerOpen(true)}
      >
        ☰
      </button>
      <div className="mobile-title">
        <div className="title">CodeCollab</div>
        <div className="subtitle">Realtime code editor</div>
      </div>
      <div className="mobile-right-spacer" />
    </div>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <span role="img" aria-label="dna" /> CodeCollab
          <p className="sub">Realtime collaboration</p>
        </div>

        {user ? (
          <div className="signed-in-pill">Signed in: {user.name}</div>
        ) : (
          <button className="btn" onClick={() => setShowAuth(true)}>Log in</button>
        )}

        <h4>Connected</h4>
        <div className="user-list">
          {clients.map((client) => {
            const initials = client.username
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase();
            return (
              <div key={client.socketId} className="user-chip">
                {initials}
              </div>
            );
          })}
        </div>

        <button
          className="btn copy"
          onClick={() => navigator.clipboard.writeText(roomId)}
        >
          Copy ROOM ID
        </button>
        <button className="btn leave" onClick={onLeave}>
          Leave
        </button>
      </aside>

      {/* Main editor & terminal area */}
      {/* Main editor & terminal area */}
      <main className="editor-area">
        <div className="editor-section">
          <div className="editor-header">
            <LanguageSelector
              selectedLanguage={language}
              onChange={handleLanguageChange}
            />
            <div className="editor-actions">
              <button
                className="run-button icon-btn"
                onClick={handleRun}
                aria-label="Run code"
                title="Run"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span className="label">Run Code</span>
              </button>

              <button
                className="download-btn icon-btn"
                onClick={handleDownload}
                aria-label="Download"
                title="Download"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 20h14v-2H5v2zM12 3v10.17l3.59-3.58L17 11l-5 5-5-5 1.41-1.41L11 13.17V3h1z" />
                </svg>
                <span className="label">Download</span>
              </button>
            </div>
          </div>

          {/* NEW: this wrapper ensures the editor sits below the header */}
          <div className="editor-body">
            {Editor}
          </div>
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
      </main>


      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={(u) => setUser(u)}
        />
      )}
       {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              {/* <div className="drawer-title">Menu</div> */}
              <button className="drawer-close" onClick={() => setDrawerOpen(false)}>✕</button>
            </div>

            {/* Auth block */}
            <div className="drawer-section">
              {user ? (
                <>
                  <div className="signed-in-pill small">Signed in: {user.name}</div>
                  <button className="btn logout" onClick={() => { handleLogout(); setDrawerOpen(false); }}>
                    Log out
                  </button>
                </>
              ) : (
                <button className="btn" onClick={() => { setShowAuth(true); setDrawerOpen(false); }}>
                  Log in
                </button>
              )}
            </div>

            {/* Room controls */}
            <div className="drawer-section">
              <button className="btn copy" onClick={copyRoomId}>Copy ROOM ID</button>
              <button className="btn leave" onClick={onLeave}>Leave</button>
            </div>

            {/* Connected users */}
            <div className="drawer-section">
              <h4>Connected</h4>
              <div className="user-list">
                {clients.map((client) => {
                  const initials = client.username
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase();
                  return (
                    <div key={client.socketId} className="user-chip">
                      {initials}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
