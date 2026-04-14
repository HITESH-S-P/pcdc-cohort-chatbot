const { LLMClient } = require("../llm/gemini");

class QueryExplainer {
  constructor() {
    this.llm = new LLMClient();
  }

  async execute(graphqlQuery) {
    try {
      const explanationPrompt = [
        {
          role: "system",
          content: `You are a GraphQL query explainer for PCDC (Pediatric Cancer Data Commons).
Explain what the GraphQL query does in simple, natural language.
Focus on:
- What patient cohort is being selected
- What filters are applied (diagnosis, demographics, treatments)
- The structure and logic of the query
- What data will be returned

Keep explanations clear and concise, suitable for researchers.`,
        },
        {
          role: "user",
          content: `Explain this GraphQL query:\n\n${graphqlQuery}`,
        },
      ];

      const response = await this.llm.chat(explanationPrompt);
      const explanation = response.message.content;

      return `🔍 **Query Explanation**\n\n${explanation}\n\n**Original Query:**\n\`\`\`graphql\n${graphqlQuery}\n\`\`\``;
    } catch (error) {
      return `❌ Failed to explain query: ${error.message}`;
    }
  }
}

module.exports = { QueryExplainer };
