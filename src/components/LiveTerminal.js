// frontend/src/components/LiveTerminal.js
import React, { useEffect, useRef, useState } from "react";
import "./LiveTerminal.css";

const LiveTerminal = ({ code, language, runTrigger, roomId, socket }) => {
  const wsRef = useRef(null);
  const socketIoRef = useRef(socket);
  const roomIdRef = useRef(roomId);

  const [output, setOutput] = useState("");
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [inputEnabled, setInputEnabled] = useState(true);
  const inputRef = useRef(null);

  useEffect(() => { socketIoRef.current = socket; }, [socket]);
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:5000");
    wsRef.current = ws;

    ws.onopen = () => console.log("✅ WebSocket open");
    ws.onerror = (err) => console.error("❌ WebSocket error", err);
    ws.onclose = (ev) => console.warn("⚠️ WebSocket closed", ev);

    ws.onmessage = (evt) => {
      let msg;
      try { msg = JSON.parse(evt.data); } catch { return; }

      const io = socketIoRef.current;
      const rid = roomIdRef.current;

      switch (msg.type) {
        case "output": {
          setOutput((o) => o + msg.data);
          if (io?.emit) {
            io.emit("terminal-output", {
              roomId: rid,
              message: msg.data,
              sender: io.id ?? null,
            });
          }
          break;
        }
        case "error": {
          const errorMsg = "\n⚠️ Error: " + msg.data;
          setOutput((o) => o + errorMsg);
          if (io?.emit) {
            io.emit("terminal-output", {
              roomId: rid,
              message: errorMsg,
              sender: io.id ?? null,
            });
            io.emit("terminal-input-blur", { roomId: rid });
          }
          setWaitingForInput(false);
          setInputEnabled(true);
          break;
        }
        case "done": {
          setWaitingForInput(false);
          setInputEnabled(false);
          if (io?.emit) {
            io.emit("terminal-input-blur", { roomId: rid });
            io.emit("terminal-done", { roomId: rid });
          }
          break;
        }
        default:
          break;
      }
    };

    return () => {
      ws.onmessage = null;
      ws.close();
    };
  }, []);

  useEffect(() => {
    if (runTrigger <= 0) return;
    const ws = wsRef.current;
    if (!ws) return;

    const doRun = () => {
      setOutput("");
      setWaitingForInput(true);
      setInputEnabled(true);
      ws.send(JSON.stringify({
        type: "run",
        language,
        code,
        roomId: roomIdRef.current,
      }));
      const io = socketIoRef.current;
      if (io?.emit) io.emit("terminal-focus", { roomId: roomIdRef.current, sender: io.id ?? null });
    };

    if (ws.readyState === WebSocket.OPEN) doRun();
    else ws.addEventListener("open", doRun, { once: true });
  }, [runTrigger, language, code]);

  const sendInput = (e) => {
    e.preventDefault();
    const ws = wsRef.current;
    const io = socketIoRef.current;
    const rid = roomIdRef.current;

    const val = inputRef.current.value;
    if (!val || !inputEnabled) return;

    setOutput((o) => o + val + "\n");
    ws?.send(JSON.stringify({ type: "input", data: val }));
    if (io?.emit) {
      io.emit("terminal-output", {
        roomId: rid,
        message: val + "\n",
        sender: io.id ?? null,
      });
    }
    inputRef.current.value = "";
  };

  useEffect(() => {
    if (!socket) return;

    const onSharedOut = ({ message, sender }) => {
      if (sender === socket.id) return;
      setOutput(o => o + message);
    };

    if (socket.removeAllListeners) socket.removeAllListeners("terminal-output");
    else socket.off("terminal-output");

    socket.on("terminal-output", onSharedOut);
    return () => socket.off("terminal-output", onSharedOut);
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
    const clearOnFocus = ({ sender }) => {
      if (sender !== socket.id) setOutput("");
    };
    socket.on("terminal-focus", clearOnFocus);
    return () => socket.off("terminal-focus", clearOnFocus);
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
    const onKill = () => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "kill" }));
      }
      setOutput("");
      setWaitingForInput(false);
      setInputEnabled(false);
    };
    socket.on("terminal-kill", onKill);
    return () => socket.off("terminal-kill", onKill);
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
    const onPeerDone = () => {
      setWaitingForInput(false);
      setInputEnabled(false);
    };
    socket.on("terminal-done", onPeerDone);
    return () => socket.off("terminal-done", onPeerDone);
  }, [socket]);

  const handleClear = () => setOutput("");

  return (
    <div className="terminal-shell">
      <div className="terminal-header">
        <span className="terminal-title">Output</span>
        <button className="terminal-clear-btn" onClick={handleClear}>Clear</button>
      </div>

      <div className="terminal-body">
        <pre className="terminal-output">{output || " "}</pre>
      </div>

      {waitingForInput && inputEnabled && (
        <form onSubmit={sendInput} className="terminal-input-form">
          <span className="stdin-label">stdin ❯</span>
          <input
            ref={inputRef}
            className="terminal-input"
            autoFocus
            placeholder="Type input and press Enter"
          />
        </form>
      )}
    </div>
  );
};

export default LiveTerminal;
