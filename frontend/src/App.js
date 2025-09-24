// src/App.js
import React, { useState } from "react";
import { Toaster } from "react-hot-toast";
import { io } from "socket.io-client";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";

import CodeEditor from "./components/CodeEditor";
import InvitePage from "./components/InvitePage";
import JoinPage from "./components/JoinPage";
import EditorPage from "./components/EditorPage";

import "./App.css";

// create socket once for the whole app
const socket = io("http://localhost:5000");

export default function App() {
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  // session: { roomId, username }

  const handleStartInvite = () => navigate("/invite");
  const handleStartJoin   = () => navigate("/join");

  // when somebody joins (either via Invite or Join page)
  const handleSession = (roomId, username) => {
    setSession({ roomId, username });
    socket.emit("join", { roomId, username });
    navigate("/editor");
  };

  // cleanup on leave
  const handleLeave = () => {
    if (session) {
      socket.emit("leave", {
        roomId: session.roomId,
        username: session.username,
      });
      setSession(null);
    }
    navigate("/");
  };

  const RequireSession = ({ children }) => {
    if (!session) return <Navigate to="/join" replace />;
    return children;
  };

  return (
    <>
      <Toaster position="top-right" />

      <Routes>
        {/* Home shows the single-file editor with buttons to go Invite/Join */}
        <Route
          path="/"
          element={
            <CodeEditor
              onCreateRoom={handleStartInvite}
              onJoinRoom={handleStartJoin}
              socket={socket}
            />
          }
        />

        <Route
          path="/invite"
          element={
            <InvitePage
              onBack={() => navigate(-1)}
              onJoin={handleSession}
            />
          }
        />

        <Route
          path="/join"
          element={
            <JoinPage
              onBack={() => navigate(-1)}
              onJoin={handleSession}
              onCreateRoom={handleStartInvite}
            />
          }
        />

        <Route
          path="/editor"
          element={
            <RequireSession>
              <EditorPage
                roomId={session?.roomId}
                username={session?.username}
                socket={socket}
                onLeave={handleLeave}
              />
            </RequireSession>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
