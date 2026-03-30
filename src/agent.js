const { LLMClient } = require("./llm/gemini");
const { GeneralInquiryTool } = require("./tools/generalInquiry");
const { DocBrowserTool } = require("./tools/docBrowser");
const { GraphQLGenerator } = require("./tools/graphqlGenerator");

class LLMAgent {
  constructor() {
    this.llm = new LLMClient();
    this.tools = {
      general: new GeneralInquiryTool(),
      docs: new DocBrowserTool(),
      graphql: new GraphQLGenerator(),
    };
    this.lastToolUsed = null;
  }

  async processMessage(userMessage) {
    const tools = [
      {
        type: "function",
        function: {
          name: "general_inquiry",
          description:
            "Answer general questions about PCDC, cohorts, data model",
          parameters: {
            type: "object",
            properties: { query: { type: "string" } },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "browse_docs",
          description: "Browse PCDC documentation and schema",
          parameters: {
            type: "object",
            properties: { topic: { type: "string" } },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "generate_graphql",
          description:
            "Generate GraphQL queries from natural language cohort descriptions",
          parameters: {
            type: "object",
            properties: {
              cohortDescription: {
                type: "string",
                description: "Natural language description of patient cohort",
              },
            },
          },
        },
      },
    ];

    const messages = [
      {
        role: "system",
        content: `You are PCDC Chatbot Agent. Route user requests to correct tools:

TOOLS:
1. general_inquiry: General PCDC questions
2. browse_docs: Documentation, schema questions  
3. generate_graphql: "Show patients with...", "Find cohort of...", "breast cancer", etc.

DETECT USER INTENT:
- Cohort queries → generate_graphql
- "What is...", "Explain...", "How to..." → general_inquiry or browse_docs
- Always be helpful and explain results.

Respond conversationally.`,
      },
      { role: "user", content: userMessage },
    ];

    const response = await this.llm.chat(messages, tools, "auto");
    const message = response.message;

    if (message.tool_calls) {
      this.lastToolUsed = message.tool_calls[0].function.name;

      const toolName = message.tool_calls[0].function.name;
      const toolResult = await this.executeTool(
        toolName,
        JSON.parse(message.tool_calls[0].function.arguments),
      );

      // For GraphQL/doc outputs we must preserve fenced code blocks exactly,
      // otherwise the UI can't reliably show the generated query.
      if (toolName === "generate_graphql" || toolName === "browse_docs") {
        return toolResult;
      }

      return await this.formatResponse(userMessage, toolResult);
    }

    return message.content;
  }

  async executeTool(toolName, args) {
    switch (toolName) {
      case "generate_graphql":
        return await this.tools.graphql.execute(args.cohortDescription);
      case "general_inquiry":
        return await this.tools.general.execute(args.query);
      case "browse_docs":
        return await this.tools.docs.execute(args.topic);
      default:
        return "Tool not found";
    }
  }

  async formatResponse(userQuery, toolResult) {
    const toolText =
      typeof toolResult === "string"
        ? toolResult
        : JSON.stringify(toolResult, null, 2);

    const formatPrompt = [
      {
        role: "system",
        content: "Format tool results conversationally for users",
      },
      {
        role: "user",
        content: `User: ${userQuery}\nTool Result: ${toolText}`,
      },
    ];

    const response = await this.llm.chat(formatPrompt);
    return response.message.content;
  }
}

module.exports = { LLMAgent };
