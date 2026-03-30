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
