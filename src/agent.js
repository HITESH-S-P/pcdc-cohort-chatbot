const { LLMClient } = require("./llm/gemini");
const { GeneralInquiryTool } = require("./tools/generalInquiry");
const { DocBrowserTool } = require("./tools/docBrowser");
const { GraphQLGenerator } = require("./tools/graphqlGenerator");
const { GraphQLRefiner } = require("./tools/graphqlRefiner");
const { QueryExplainer } = require("./tools/queryExplainer");
const { QueryOptimizer } = require("./tools/queryOptimizer");

class LLMAgent {
  constructor() {
    this.llm = new LLMClient();
    this.tools = {
      general: new GeneralInquiryTool(),
      docs: new DocBrowserTool(),
      graphql: new GraphQLGenerator(),
      refine: new GraphQLRefiner(),
      explain: new QueryExplainer(),
      optimize: new QueryOptimizer(),
    };
    this.lastToolUsed = null;

    // Lightweight conversation memory (server process lifetime).
    this.memory = {
      lastCohortDescription: null,
      lastGraphQLQuery: null,
    };
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
          name: "refine_graphql",
          description:
            "Refine the previously generated GraphQL query using a follow-up instruction (e.g. add/remove constraints).",
          parameters: {
            type: "object",
            properties: {
              refinement: {
                type: "string",
                description:
                  "Follow-up instruction to refine the previous cohort/query (e.g. 'only year 2020', 'add ageAtDiagnosis > 10').",
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
4. refine_graphql: Follow-ups that modify the LAST generated cohort/query, like "now add age > 10", "make it 2020 only", "also include lung cancer", "remove gender filter", etc.
5. explain_query: "What does this query do?", "Explain this GraphQL", etc.
6. optimize_query: "Optimize this query", "Improve this GraphQL", "Make this query better", etc.

DETECT USER INTENT:
- Cohort queries → generate_graphql
- If user asks a follow-up refinement and we already have a previous query → refine_graphql
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
        toolName === "refine_graphql" ||
        toolName === "browse_docs" ||
        toolName === "explain_query" ||
        toolName === "optimize_query"
      ) {
        // Update memory when we successfully produced a new/updated query.
        if (toolName === "generate_graphql") {
          this.memory.lastCohortDescription =
            this.tools.graphql.lastDescription ?? null;
          this.memory.lastGraphQLQuery = this.tools.graphql.lastQuery ?? null;
        }
        if (toolName === "refine_graphql") {
          // Extract the latest query from the fenced block returned by the tool.
          const match =
            typeof toolResult === "string"
              ? toolResult.match(/```graphql\s*([\s\S]*?)\s*```/)
              : null;
          const refinedQuery = match ? match[1].trim() : null;
          if (refinedQuery) {
            this.memory.lastGraphQLQuery = refinedQuery;
          }
        }
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
      case "refine_graphql": {
        const previousQuery = this.memory.lastGraphQLQuery;
        if (!previousQuery || !previousQuery.trim()) {
          return `⚠️ I can refine a query only after we've generated one.\n\nTry: "Show breast cancer patients diagnosed in 2020" and then say "now add ageAtDiagnosis >= 10".`;
        }
        return await this.tools.refine.execute({
          previousQuery,
          refinement: args.refinement,
          previousDescription: this.memory.lastCohortDescription,
        });
      }
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
