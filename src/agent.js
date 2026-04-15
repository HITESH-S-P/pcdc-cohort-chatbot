const { LLMClient } = require("./llm/gemini");
const { GeneralInquiryTool } = require("./tools/generalInquiry");
const { DocBrowserTool } = require("./tools/docBrowser");
const { GraphQLGenerator } = require("./tools/graphqlGenerator");
const { QueryExplainer } = require("./tools/queryExplainer");
const { QueryOptimizer } = require("./tools/queryOptimizer");

class LLMAgent {
  constructor() {
    this.llm = new LLMClient();
    this.tools = {
      general: new GeneralInquiryTool(),
      docs: new DocBrowserTool(),
      graphql: new GraphQLGenerator(),
      explain: new QueryExplainer(),
      optimize: new QueryOptimizer(),
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
      {
        type: "function",
        function: {
          name: "explain_query",
          description: "Explain what a GraphQL query does in natural language",
          parameters: {
            type: "object",
            properties: {
              graphqlQuery: {
                type: "string",
                description: "The GraphQL query to explain",
              },
            },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "optimize_query",
          description: "Analyze and suggest optimizations for a GraphQL query",
          parameters: {
            type: "object",
            properties: {
              graphqlQuery: {
                type: "string",
                description: "The GraphQL query to optimize",
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
4. explain_query: "What does this query do?", "Explain this GraphQL", etc.
5. optimize_query: "Optimize this query", "Improve this GraphQL", "Make this query better", etc.

DETECT USER INTENT:
- Cohort queries → generate_graphql
- "What is...", "Explain...", "How to..." → general_inquiry or browse_docs
- "What does this query do?", "Explain this GraphQL" → explain_query
- "Optimize", "Improve", "Better query" → optimize_query
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
      if (
        toolName === "generate_graphql" ||
        toolName === "browse_docs" ||
        toolName === "explain_query" ||
        toolName === "optimize_query"
      ) {
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
      case "explain_query":
        return await this.tools.explain.execute(args.graphqlQuery);
      case "optimize_query":
        return await this.tools.optimize.execute(args.graphqlQuery);
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
