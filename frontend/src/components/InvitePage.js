// src/components/InvitePage.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import toast from "react-hot-toast";

const genId = () =>
  (window.crypto?.randomUUID?.() || uuidv4()).replace(/-/g, "").slice(0, 10);

export default function InvitePage({ onBack, onJoin }) {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const roomInputRef = useRef(null);

  const createAndCopy = useCallback(() => {
    const id = genId();
    setRoomId(id);
    navigator.clipboard?.writeText(id).catch(() => {});
  }, []);

  useEffect(() => {
    createAndCopy();
  }, [createAndCopy]);

  const handleJoin = () => {
    toast.success("Successfully joined!");
    onJoin(roomId, username);
  };

  const handleCreateRoom = () => {
    setRoomId("");
    setTimeout(() => roomInputRef.current?.focus(), 0);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && roomId && username) handleJoin();
  };

  return (
    <div className="invite-page" onKeyDown={handleKeyDown}>
      <div className="invite-box">
        <h1>Create Room</h1>

        <input
          id="room-id-input"
          ref={roomInputRef}
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
          If you want to create a custom ID then{" "}
          <span className="link" onClick={handleCreateRoom}>create here</span>
        </p>

        <button className="btn back" onClick={onBack}>Back</button>
      </div>
    </div>
  );
}
