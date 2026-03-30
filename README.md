# PCDC Cohort Chatbot (GraphQL Generator) — GSoC 2026

This project is an AI-assisted chatbot that turns natural-language cohort requests into **validated GraphQL queries** for the **PCDC (Pediatric Cancer Data Commons)** cohort discovery workflow.

It was built as a GSoC 2026 mini-project and is designed for a smooth demo experience:

- A chat-style UI for cohort discovery prompts
- A dedicated **GraphQL viewer** (with syntax-highlight-like styling and a **Copy** button)
- Backend tool-calling that routes user intent to the correct action (general Q&A, doc browsing, or GraphQL generation)

Author: **Hitesh S P**

## Links

- GitHub profile: [https://github.com/HITESH-S-P](https://github.com/HITESH-S-P)
- Project repo: [https://github.com/HITESH-S-P/pcdc-cohort-chatbot](https://github.com/HITESH-S-P/pcdc-cohort-chatbot)

## Working
<img width="1899" height="968" alt="Screenshot 2026-03-30 165349" src="https://github.com/user-attachments/assets/259fd3a0-a919-487a-aedd-ae5b27c41b94" />
<img width="1900" height="964" alt="Screenshot 2026-03-30 165841" src="https://github.com/user-attachments/assets/bf45a70a-2c67-475e-9fb2-c45d30cc35e3" />


## Why this project

PCDC cohort discovery typically requires careful knowledge of:

- the GraphQL schema,
- nested filter structures (AND/OR),
- diagnosis/demographics/treatment constraints.

Researchers and domain experts often think in natural language:

> “Breast cancer patients diagnosed in 2020”  
> “Lung cancer patients with EGFR mutation and age > 60”

This project reduces the barrier by:

1. Accepting natural-language cohort requests.
2. Using an LLM to produce a GraphQL query in the correct structure.
3. Validating the generated query against a GraphQL schema.
4. Presenting the result in a clean UI so users can copy/paste into the PCDC GraphQL explorer.

## Demo / User Experience

### Chat flow

Users send prompts like:

- “Show patients with breast cancer diagnosed in 2020”
- “What is the PCDC data model?”
- “How do I query by diagnosis?”

The agent automatically routes the request:

- `general_inquiry` for general explanations
- `browse_docs` for schema/document snippets
- `generate_graphql` for cohort-to-GraphQL conversion

### GraphQL output is shown as a first-class viewer

When the backend returns a fenced block using:

```graphql
...query...
```

the frontend renders it as a dedicated “GraphQL card”:

- scrollable code area
- “Copy” button
- a short header to make it feel like a normal application (not raw AI text)

This avoids the common issue where GraphQL is displayed as plain AI text and becomes hard to read or copy.

## Key Features

1. **Gemini-powered LLM backend**
  - Uses the Gemini API to generate GraphQL queries and to decide which tool to call.
2. **Tool calling / intent routing**
  - The agent uses function-style tool declarations:
    - `general_inquiry`
    - `browse_docs`
    - `generate_graphql`
3. **PCDC-aware GraphQL generation**
  - The GraphQL generator provides the PCDC schema context to guide the model.
4. **Query validation**
  - Generated queries are validated using the project’s GraphQL schema evaluator.
5. **User-friendly GraphQL viewer UI**
  - Code card layout, safe rendering, and one-click copy.

## Tech Stack

- **Node.js + Express** (backend)
- **Socket.IO** (chat transport between UI and server)
- **Gemini API** via `@google/generative-ai`
- **GraphQL** (schema parsing + validation)
- Static UI in `public/index.html`

## How it works (Architecture Overview)

### 1) Frontend → Backend

The UI (in `public/index.html`) emits:
`user-message`

The server (in `src/index.js`) listens and forwards the message to the agent.

### 2) Agent intent routing

The agent in `src/agent.js`:

- sends the user message to the LLM along with tool definitions
- receives tool call instructions from the model
- executes the corresponding local tool:
  - `src/tools/generalInquiry.js`
  - `src/tools/docBrowser.js`
  - `src/tools/graphqlGenerator.js`

### 3) GraphQL generation + validation

For `generate_graphql`, the flow is:

1. `src/tools/graphqlGenerator.js` calls `src/graphql/generator.js`
2. `src/graphql/generator.js` calls the LLM to generate a GraphQL query using the PCDC schema context
3. the query is extracted from a fenced code block (if present)
4. the query is validated via `src/graphql/evaluator.js`
5. a formatted response is returned (including a ````graphql` block)

### 4) UI rendering

The frontend detects fenced GraphQL code blocks and renders them as a clean code viewer with copy support.

## Project Structure

Key files:

- `src/index.js`  
Express + Socket.IO server
- `src/agent.js`  
LLM tool routing + tool execution
- `src/llm/gemini.js`  
Gemini client wrapper
- `src/tools/graphqlGenerator.js`  
GraphQL generation response formatting
- `src/graphql/generator.js`  
GraphQL generation logic (prompt + extraction)
- `src/graphql/evaluator.js`  
GraphQL validation and scoring
- `public/index.html`  
Chat UI + GraphQL viewer UI

## Setup (Local Development)

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

Create a `.env` file in the project root.

Required:

- `GEMINI_API_KEY` (your Gemini API key)

Optional:

- `GEMINI_MODEL` (defaults to `gemini-1.5-pro`)
- `PORT` (defaults to `3000`)

Example `.env`:

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
GEMINI_MODEL=gemini-1.5-pro
PORT=3000
```

> Important: Do not commit real API keys to GitHub.

### 3) Run the server

Development:

```bash
npm run dev
```

Open:
`http://localhost:3000`

### 4) Test GraphQL evaluator

```bash
npm test
```

## Usage Guide

### Generate a GraphQL query

Ask for cohorts in natural language:

- “Show patients with breast cancer diagnosed in 2020”
- “Find lung cancer patients with EGFR mutation and age > 60”

The UI will display:

- the generated query in the GraphQL viewer
- validation-related info (score/status and matches)

### Browse documentation/snippets

Examples:

- “Show me the data model documentation”
- “How do I query by diagnosis?”

The agent returns doc snippets in a consistent block format so they render cleanly in the UI.

### General questions

Examples:

- “What is the PCDC data model?”
- “What is cohort discovery?”

These are routed to the `general_inquiry` tool.

## Environment Variables (Security Notes)

- All LLM calls require a server-side API key.
- The key is read from `.env` using `dotenv`.
- The frontend does not receive the API key.

## Deployment (Vercel Hosting)

### What works out-of-the-box

This project includes a static UI in `public/` and a Node backend.

Vercel can host Node runtimes, but deployment of **Socket.IO (websockets)** may require additional configuration depending on Vercel’s current platform/runtime constraints.

### Recommended deployment approach for a stable Vercel demo

For a “production-like” and stable Vercel deployment, a common approach is:

1. Keep the UI static on Vercel.
2. Replace the Socket.IO chat with a standard HTTP endpoint:
  - `POST /api/chat`
  - returns JSON response
3. Update the frontend to use `fetch()` instead of Socket.IO.

This avoids websocket constraints and makes the app work reliably anywhere Vercel runs serverless functions.

### If you keep Socket.IO

If you want to keep the current architecture unchanged, you must ensure:

- the Vercel runtime supports long-lived connections for Socket.IO
- you configure appropriate server behavior for websockets

Because this can vary by environment, the best practice for submission is to document the approach you used (or migrate to HTTP endpoints if websockets are unstable).

## Limitations

1. LLM output can vary
  - The project uses schema validation and structured response formatting to reduce risk.
2. Function calling behavior depends on model/tool support
  - Tool declarations are translated into Gemini format inside `src/llm/gemini.js`.
3. Query validation is schema-based
  - It ensures GraphQL correctness, but not semantic correctness vs. actual underlying PCDC data.

## Future Improvements 

- Add a “GraphQL Explorer test” button that performs a dry-run request (if a public endpoint exists).
- Improve extraction robustness for different code fence formats.
- Add user feedback loops:
  - “This query failed” → auto-generate a corrected version.
- Add conversation memory:
  - keep last-used filters and refine them based on follow-up questions.
- Add UI loading states per message:
  - show “Generating GraphQL…” while the server is processing.

## Credits

Built for GSoC 2026: PCDC Enhanced Chatbot with GraphQL Generation.

If you use this project in your application, include your key contributions (Gemini integration, UI improvements, GraphQL validation pipeline, and deployment notes).
