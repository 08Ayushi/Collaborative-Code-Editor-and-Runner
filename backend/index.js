// index.js
console.log("🔍 Starting backend index.js");

process.on("uncaughtException", (err) => {
  try {
    console.error("❌ Uncaught exception:", err?.stack || err);
  } catch { console.error("❌ Uncaught exception (no error object)"); }
});
process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled rejection:", reason);
});

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn, execSync } = require("child_process");
const { WebSocketServer } = require("ws");
const { Server } = require("socket.io");

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/codecollab";
const JWT_SECRET = process.env.JWT_SECRET || "change_this_dev_secret";

const app = express();

/* ---------- Core middleware ---------- */
app.use(cors());
app.use(express.json()); // MUST be before routes
app.use((req, _res, next) => { // tiny API logger
  if (req.url.startsWith("/api/")) console.log(`➡️  ${req.method} ${req.url}`);
  next();
});
app.use(express.static("public")); // static is fine here

/* ---------- Mongo ---------- */
mongoose.connect(MONGODB_URI)
  .then(() => console.log("🗄️  MongoDB connected"))
  .catch((e) => console.error("Mongo connect error:", e.message));

/* ---------- Schemas/Models ---------- */
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
}, { timestamps: true });

const SnippetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  filename: { type: String, required: true },
  language: { type: String, required: true },
  code: { type: String, required: true },
  downloads: { type: Number, default: 0 },
}, { timestamps: true });

const DownloadEventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  snippetId: { type: mongoose.Schema.Types.ObjectId, ref: "Snippet" },
  filename: String,
  language: String,
  bytes: Number,
}, { timestamps: true });

const User = mongoose.model("User", UserSchema);
// const Snippet = mongoose.model("Snippet", SnippetSchema);
const DownloadEvent = mongoose.model("DownloadEvent", DownloadEventSchema);

/* ---------- Helpers ---------- */
function signToken(user) {
  return jwt.sign({ uid: user._id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
}
function auth(req, res, next) {
  const authH = req.headers.authorization || "";
  const token = authH.startsWith("Bearer ") ? authH.slice(7) : null;
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

/* ---------- Health ---------- */
app.get("/api/health", (_req, res) => res.json({ ok: true }));

/* ---------- Auth ---------- */
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ error: "All fields required" });
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: "Email already registered" });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash });
    res.json({ token: signToken(user), user: { id: user._id, name: user.name, email: user.email } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    res.json({ token: signToken(user), user: { id: user._id, name: user.name, email: user.email } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/me", auth, async (req, res) => {
  const user = await User.findById(req.user.uid).lean();
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json({ id: user._id, name: user.name, email: user.email });
});



app.post("/api/track/download", auth, async (req, res) => {
  try {
    const { filename, language, bytes } = req.body || {};
    await DownloadEvent.create({
      userId: req.user.uid,
      filename, language,
      bytes: Number(bytes) || 0,
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ---------- Safe route printer (optional) ---------- */
(function printRoutes() {
  try {
    const routes = [];
    const layers = app._router?.stack || [];
    for (const layer of layers) {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase()).join(",");
        routes.push(`${methods} ${layer.route.path}`);
      } else if (layer.name === "router" && layer.handle?.stack) {
        for (const sub of layer.handle.stack) {
          if (sub.route) {
            const methods = Object.keys(sub.route.methods).map(m => m.toUpperCase()).join(",");
            routes.push(`${methods} ${sub.route.path}`);
          }
        }
      }
    }
    console.log("📚 Registered routes:", routes);
  } catch (e) {
    console.log("📚 Could not print routes:", e.message);
  }
})();

/* ---------- Helpful API 404 for debugging ---------- */
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API route not found" });
});

/* ---------------- INJECTION HELPERS (runner) ---------------- */
function injectCUnbuffered(src) {
  if (/setvbuf\s*\(/.test(src)) return src;
  let code = src;
  if (!/^\s*#\s*include\s*<stdio\.h>/m.test(code)) code = "#include <stdio.h>\n" + code;
  code = code.replace(/int\s+main\s*\([^)]*\)\s*\{/, (m) =>
    `${m}\n    setvbuf(stdout, NULL, _IONBF, 0); /* auto-added */`
  );
  return code;
}
function injectCppUnbuffered(src) {
  if (/unitbuf/.test(src) || /setvbuf\s*\(/.test(src)) return src;
  let code = src;
  if (!/^\s*#\s*include\s*<iostream>/m.test(code)) code = "#include <iostream>\n" + code;
  if (!/^\s*#\s*include\s*<cstdio>/m.test(code)) code = "#include <cstdio>\n" + code;
  code = code.replace(/int\s+main\s*\([^)]*\)\s*\{/, (m) => `${m}
    std::ios::sync_with_stdio(false);
    std::cout.setf(std::ios::unitbuf);
    setvbuf(stdout, NULL, _IONBF, 0);
  `);
  return code;
}
function injectJavaAutoflush(src) {
  if (/AUTOFLUSH_STDOUT_MARKER/.test(src)) return src;
  return src.replace(/public\s+class\s+(\w+)\s*\{/, (_, cls) =>
    `public class ${cls} {
    /* AUTOFLUSH_STDOUT_MARKER */
    static { System.setOut(new java.io.PrintStream(System.out, true)); }
`
  );
}

/* ---------------- HTTP server + WebSocket + Socket.IO ---------------- */
const server = app.listen(PORT, () => {
  console.log(`🚀 HTTP + WebSocket server listening on port ${PORT}`);
});
server.on("error", (err) => {
  console.error("❌ HTTP server error:", err.code || err);
  if (err.code === "EADDRINUSE") {
    console.error(`⚠️ Port ${PORT} already in use. Kill the other process or change PORT.`);
  }
});

/* ---------------- WebSocket code runner ---------------- */
const wss = new WebSocketServer({ server });
wss.on("error", (err) => console.error("❌ WSS error:", err));

wss.on("connection", (ws) => {
  console.log("🔌 WebSocket client connected");

  function safeSend(msg) {
    if (ws.readyState !== 1) return; // 1 === OPEN
    try { ws.send(JSON.stringify(msg)); } catch (e) { console.error("⚠️ safeSend error:", e.message); }
  }

  let child = null;
  let cleanupFiles = [];
  let killTimer = null;

  // function killChild() {
  //   if (child) { try { child.kill("SIGKILL"); } catch {} child = null; }
  //   if (killTimer) { clearTimeout(killTimer); killTimer = null; }
  //   safeSend({ type: "done" });
  // }

  ws.on("message", (rawMsg) => {
    let data;
    try { data = JSON.parse(rawMsg); } catch { return safeSend({ type: "error", data: "Invalid JSON" }); }

    if (data.type === "run") {
      if (child) killChild();

      const { code, language } = data;
      const tempDir = path.join(os.tmpdir(), "code-runner");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      const ts = Date.now();
      let fileName, cmd, args, options = {};
      cleanupFiles = [];

      try {
        switch (language) {
          case "python": {
            fileName = path.join(tempDir, `main_${ts}.py`);
            fs.writeFileSync(fileName, code);
            cmd = "python"; args = ["-u", fileName];
            cleanupFiles.push(fileName);
            break;
          }
          case "c": {
            fileName = path.join(tempDir, `main_${ts}.c`);
            const exeC = path.join(tempDir, `main_${ts}.exe`);
            fs.writeFileSync(fileName, injectCUnbuffered(code));
            execSync(`gcc "${fileName}" -o "${exeC}"`);
            cmd = exeC; args = []; cleanupFiles.push(fileName, exeC);
            break;
          }
          case "cpp": {
            fileName = path.join(tempDir, `main_${ts}.cpp`);
            const exeCpp = path.join(tempDir, `main_${ts}.exe`);
            fs.writeFileSync(fileName, injectCppUnbuffered(code));
            execSync(`g++ "${fileName}" -o "${exeCpp}"`);
            cmd = exeCpp; args = []; cleanupFiles.push(fileName, exeCpp);
            break;
          }
          case "java": {
            const m = code.match(/public\s+class\s+(\w+)/);
            if (!m) return safeSend({ type: "error", data: "Java needs a public class" });
            const className = m[1];
            fileName = path.join(tempDir, `${className}.java`);
            fs.writeFileSync(fileName, injectJavaAutoflush(code));
            execSync(`javac "${fileName}"`);
            cmd = "java"; args = ["-cp", tempDir, className];
            options = { cwd: tempDir };
            cleanupFiles.push(fileName, path.join(tempDir, `${className}.class`));
            break;
          }
          case "javascript": {
            fileName = path.join(tempDir, `main_${ts}.js`);
            const wrappedCode = `const fs = require('fs');
function prompt(question) {
  fs.writeSync(1, question);
  const buf = Buffer.alloc(1024);
  const n = fs.readSync(0, buf, 0, 1024);
  return buf.toString('utf8', 0, n).trim();
}
global.alert = msg => console.log(msg);
global.confirm = q => /^y(es)?$/i.test(prompt(q + " (y/n) ").trim());
// --- user code starts here ---
${code}
// --- user code ends here ---
`;
            fs.writeFileSync(fileName, wrappedCode);
            cmd = "node"; args = [fileName]; cleanupFiles.push(fileName);
            break;
          }
          default:
            return safeSend({ type: "error", data: `Unsupported language: ${language}` });
        }

        child = spawn(cmd, args, options);

        // // 5s kill guard to avoid hung processes
        // killTimer = setTimeout(() => {
        //   safeSend({ type: "error", data: "⏱ Timed out after 5s; killing process." });
        //   killChild();
        // }, 5000);

        child.on("error", (err) => safeSend({ type: "error", data: err.message }));
        child.stdout.on("data", (d) => safeSend({ type: "output", data: d.toString() }));
        child.stderr.on("data", (d) => safeSend({ type: "error", data: d.toString() }));

        child.on("close", (code, signal) => {
          // if (killTimer) clearTimeout(killTimer);
          // cleanupFiles.forEach((f) => fs.unlink(f, () => {}));
          if (signal !== "SIGKILL") {
            safeSend({ type: "output", data: `\n✔ Finished with exit code ${code}\n` });
          }
          safeSend({ type: "done" });
          child = null;
        });
      } catch (err) {
        const msg =
          (err.stderr && err.stderr.toString && err.stderr.toString()) ||
          (err.stdout && err.stdout.toString && err.stdout.toString()) ||
          err.message;
        safeSend({ type: "error", data: msg });
      }
      return;
    }

    if (data.type === "input" && child) {
      try { child.stdin.write(data.data + "\n"); }
      catch (e) { safeSend({ type: "error", data: "Failed to write to stdin: " + e.message }); }
      return;
    }

    if (data.type === "kill") {
      if (child) { killChild(); }
      else { safeSend({ type: "error", data: "No active process to kill." }); }
      return;
    }
  });

  ws.on("close", () => {
    console.log("❌ WebSocket client disconnected");
    if (child) child.kill("SIGKILL");
    // if (killTimer) clearTimeout(killTimer);
  });
});

/* ---------------- Socket.IO for collaboration ---------------- */
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

const userSocketMap = {};
function getAllClients(roomId) {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || [])
    .map((socketId) => ({ socketId, username: userSocketMap[socketId]?.username || "Unknown" }));
}

io.on("connection", (socket) => {
  console.log("⚡ New socket connected:", socket.id);

  socket.on("join", ({ roomId, username }) => {
    userSocketMap[socket.id] = { username, roomId };
    socket.join(roomId);
    io.to(roomId).emit("joined", { clients: getAllClients(roomId), joinedUsername: username, socketId: socket.id });
  });

  socket.on("leave", ({ roomId, username }) => {
    socket.leave(roomId);
    delete userSocketMap[socket.id];
    io.to(roomId).emit("disconnected", { clients: getAllClients(roomId), leftUsername: username, socketId: socket.id });
  });

  socket.on("disconnect", () => {
    const info = userSocketMap[socket.id];
    if (info?.roomId) {
      socket.leave(info.roomId);
      delete userSocketMap[socket.id];
      io.to(info.roomId).emit("disconnected", { clients: getAllClients(info.roomId), leftUsername: info.username, socketId: socket.id });
    }
  });

  socket.on("code-change", ({ roomId, code }) => socket.to(roomId).emit("code-update", code));
  socket.on("terminal-kill", ({ roomId }) => socket.to(roomId).emit("terminal-kill"));
  socket.on("terminal-done", ({ roomId }) => socket.to(roomId).emit("terminal-done"));
  socket.on("language-change", ({ roomId, language }) => socket.to(roomId).emit("language-update", language));
  socket.on("run-trigger", ({ roomId }) => socket.to(roomId).emit("run-update", { sender: socket.id }));
  socket.on("terminal-input", ({ roomId, input }) => socket.to(roomId).emit("terminal-input", { input }));
  socket.on("terminal-focus", ({ roomId, sender }) => socket.to(roomId).emit("terminal-focus", { roomId, sender }));
  socket.on("terminal-output", ({ roomId, message, sender }) => socket.to(roomId).emit("terminal-output", { message, sender }));
  socket.on("terminal-input-focus", ({ roomId, sender }) => socket.to(roomId).emit("terminal-input-focus", { sender }));
  socket.on("terminal-input-blur", ({ roomId }) => socket.to(roomId).emit("terminal-input-blur"));

  socket.on("cursor-position", ({ roomId, username, lineNumber, column }) => {
    socket.to(roomId).emit("remote-cursor", { socketId: socket.id, username, lineNumber, column });
  });
});
