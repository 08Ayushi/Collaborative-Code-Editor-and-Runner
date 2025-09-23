**Collaborative Code Editor & Runner**

A real-time collaborative online code editor and runner built using the MERN stack with CRDT-powered synchronization, supporting multi-user editing and execution of multiple programming languages.

**Features**

-> Real-time Collaboration: CRDT-powered editor using Monaco Editor, Yjs, and Socket.IO for seamless multi-user code editing.

-> Multi-Language Code Execution: Supports C, C++, Java, Python, JavaScript execution.Execution handled via Node.js WebSocket server with stdin/stdout streaming.

-> Developer Workflow: Automated development server using nodemon.

-> Scalable Backend: MongoDB + Express.js + Node.js for persistence and server-side functionality.

**Frontend:**

Built with React.js and Monaco Editor for an intuitive, VS Code-like experience.

**Tech Stack**

- Frontend: React, Monaco Editor, Yjs

- Backend: Node.js, Express.js, Socket.IO, WebSockets

- Database: MongoDB

- Other Tools: Nodemon, CRDT (via Yjs)

**Project Structure**
```
.
├── frontend/        # React frontend with Monaco Editor
├── backend/        # Node.js + Express + WebSocket server
├── package.json
└── README.md
```
**Installation & Setup**
1. Clone the repository:
   ```
   git clone https://github.com/your-username/collaborative-code-editor.git
   cd collaborative-code-editor
   ```

2. Install dependencies:
   - **For backend**
   ```
   cd backend
   npm install
   ```

   **For frontend**
   ```
   cd frontend
   npm start
   ```

4. Start the development servers:
   **Backend**
   ```
   cd backend
   npm run dev
   ```

   **Frontend**
   ```
   cd frontend
   npm start or npm run dev
   ```

-> You can also run both frontend and backend together using concurrently as shown:

1. Install concurrently:
   - From the root of your project (where both frontend/ and backend/ exist):
     ```
     npm install --save-dev concurrently
     ```

2. Update root package.json:
   - Inside your root package.json, add scripts like this:
```
{
  "scripts": {
    "client": "cd client && npm start",
    "server": "cd server && npm run dev",
    "dev": "concurrently \"npm run server\" \"npm run client\""
  }
}
```

3. Run both servers together:
   - Now, from the root of your project:
     ```
     npm run dev
     ```

**Usage**

-> Create or join a collaborative coding room.

-> Write, edit, and execute code in real-time with multiple users.

-> Supported languages: C, C++, Java, Python, JavaScript.

License: This project is licensed under the MIT License.

