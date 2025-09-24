// src/components/AuthModal.jsx
import React, { useState } from "react";

const API_BASE = process.env.REACT_APP_API_BASE || ""; // e.g. http://localhost:5000

export default function AuthModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState("login"); // 'login' | 'signup'
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState("");

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const url =
        mode === "login"
          ? `${API_BASE}/api/auth/login`
          : `${API_BASE}/api/auth/signup`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const ct = res.headers.get("content-type") || "";
      const data = ct.includes("application/json")
        ? await res.json()
        : { error: await res.text() };

      if (!res.ok) throw new Error(data.error || "Request failed");

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      onSuccess?.(data.user);
      onClose();
    } catch (e2) {
      setErr(e2.message || "Something went wrong");
    }
  };

  return (
    <div className="auth-modal-backdrop">
      <div className="auth-modal">
        <div className="auth-modal-header">
          <span>{mode === "login" ? "Log in" : "Sign up"}</span>
          <button className="auth-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={submit} className="auth-form">
          {mode === "signup" && (
            <input
              name="name"
              placeholder="Full name"
              value={form.name}
              onChange={change}
              required
            />
          )}

          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={change}
            required
          />

          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={change}
            required
            minLength={6}
          />

          {err && <div className="auth-error">{err}</div>}

          <button className="auth-primary" type="submit">
            {mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>

        <div className="auth-switch">
          {mode === "login" ? (
            <>
              New here?{" "}
              <button type="button" onClick={() => setMode("signup")}>Sign up</button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button type="button" onClick={() => setMode("login")}>Log in</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
