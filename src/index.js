require("dotenv").config();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const path = require("path");

const { LLMAgent } = require("./agent");
const { runQueryOnDummyData } = require("./graphql/dummyRunner");
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

// Execute a GraphQL query against a small in-memory dummy dataset.
// Request: { "query": "query { ... }", "variables": { ... } }
// Response: standard GraphQL response shape { data, errors }
app.post("/api/test-query", async (req, res) => {
  const query = typeof req.body?.query === "string" ? req.body.query : "";
  const variables =
    req.body && typeof req.body.variables === "object" ? req.body.variables : {};

  if (!query.trim()) {
    return res.status(400).json({
      error: 'Missing required field "query" (string).',
    });
  }

  try {
    const result = await runQueryOnDummyData(query, variables);

    if (result?.errors?.length) {
      return res.status(400).json({
        data: result.data ?? null,
        errors: result.errors.map((e) => ({
          message: e.message,
          locations: e.locations,
          path: e.path,
        })),
      });
    }

    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Error: ${error.message}`,
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

let port = Number.parseInt(process.env.PORT, 10);
if (!Number.isFinite(port) || port <= 0) port = 3000;

const MAX_PORT_RETRIES = 10;
let portAttempts = 0;

server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE" && portAttempts < MAX_PORT_RETRIES) {
    portAttempts += 1;
    const nextPort = port + 1;
    console.warn(
      `⚠️ Port ${port} in use. Retrying on port ${nextPort} (${portAttempts}/${MAX_PORT_RETRIES})...`,
    );
    port = nextPort;
    setTimeout(() => server.listen(port), 250);
    return;
  }

  console.error("❌ Server failed to start:", err);
  process.exit(1);
});

server.listen(port, () => {
  console.log(`🚀 PCDC Chatbot: http://localhost:${port}`);
  console.log(`📊 Test: node src/graphql/evaluator.js`);
});
