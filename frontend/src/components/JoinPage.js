// src/components/JoinPage.js
import React, { useState } from "react";
import toast from "react-hot-toast";

export default function JoinPage({ onBack, onJoin, onCreateRoom }) {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");

  const handleJoin = () => {
    toast.success("Successfully joined!");
    onJoin(roomId, username);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && roomId && username) handleJoin();
  };

  return (
    <div className="invite-page" onKeyDown={handleKeyDown}>
      <div className="invite-box">
        <h1>Join Room</h1>

        <input
          placeholder="ROOM ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />

        <input
          placeholder="USERNAME"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <button
          className="btn join"
          onClick={handleJoin}
          disabled={!roomId || !username}
        >
          Join
        </button>

        <p className="small">
          If you want to create a new room then{" "}
          <span className="link" onClick={onCreateRoom}>
            create here
          </span>
        </p>

        <button className="btn back" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}

/* ---------------- INJECTION HELPERS ---------------- */
// (kept as in your original paste)
function injectCUnbuffered(src) {
  if (/setvbuf\s*\(/.test(src)) return src;
  let code = src;
  if (!/^\s*#\s*include\s*<stdio\.h>/m.test(code)) {
    code = "#include <stdio.h>\n" + code;
  }
  code = code.replace(
    /int\s+main\s*\([^)]*\)\s*\{/,
    (m) =>
      `${m}\n    setvbuf(stdout, NULL, _IONBF, 0); /* auto-added to disable stdout buffering */`
  );
  return code;
}

function injectCppUnbuffered(src) {
  if (/setvbuf\s*\(/.test(src)) return src;
  let code = src;
  if (!/^\s*#\s*include\s*<cstdio>/m.test(code)) {
    code = "#include <cstdio>\n" + code;
  }
  code = code.replace(
    /int\s+main\s*\([^)]*\)\s*\{/,
    (m) => `${m}\n    setvbuf(stdout, NULL, _IONBF, 0); /* auto-added */`
  );
  return code;
}

function injectJavaAutoflush(src) {
  if (/AUTOFLUSH_STDOUT_MARKER/.test(src)) return src;
  return src.replace(
    /public\s+class\s+(\w+)\s*\{/,
    (_, cls) =>
      `public class ${cls} {\n` +
      `    /* AUTOFLUSH_STDOUT_MARKER */\n` +
      `    static { System.setOut(new java.io.PrintStream(System.out, true)); }\n`
  );
}
