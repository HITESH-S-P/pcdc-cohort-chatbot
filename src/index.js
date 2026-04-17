require("dotenv").config();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const path = require("path");

const { LLMAgent } = require("./agent");
const agent = new LLMAgent();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.use(cors());
app.use(express.json());
// app.use(express.static());
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// HTTP alternative to Socket.IO (serverless-friendly).
// Request: { "message": "..." }
// Response: { "response": "...", "tool": "generate_graphql" }
app.post("/api/chat", async (req, res) => {
  const message = typeof req.body?.message === "string" ? req.body.message : "";

  if (!message.trim()) {
    return res.status(400).json({
      error: 'Missing required field "message" (string).',
    });
  }

  try {
    const response = await agent.processMessage(message);
    return res.json({ response, tool: agent.lastToolUsed });
  } catch (error) {
    return res.status(500).json({
      error: `Error: ${error.message}`,
      hint: 'Try: "Show breast cancer patients"',
    });
  }
});

io.on("connection", (socket) => {
  console.log("👤 User connected:", socket.id);

  socket.on("user-message", async (message) => {
    socket.emit("status", "🤖 Processing...");

    try {
      const response = await agent.processMessage(message);
      socket.emit("bot-response", { response, tool: agent.lastToolUsed });
    } catch (error) {
      socket.emit("bot-response", {
        response: `❌ Error: ${error.message}\n\nTry: "Show breast cancer patients"`,
      });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 PCDC Chatbot: http://localhost:${PORT}`);
  console.log(`📊 Test: node src/graphql/evaluator.js`);
});
