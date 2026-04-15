const { LLMClient } = require("../llm/gemini");

class QueryOptimizer {
  constructor() {
    this.llm = new LLMClient();
  }

  async execute(graphqlQuery) {
    try {
      const prompt = `Analyze this GraphQL query and suggest optimizations or improvements:

\`\`\`graphql
${graphqlQuery}
\`\`\`

Provide suggestions for:
- Performance improvements
- Better structure
- More efficient field selection
- Any potential issues

Keep suggestions concise and actionable.`;

      const suggestions = await this.llm.generateText(prompt);

      let response = `Query Optimization Suggestions:\n\n${suggestions}\n\n`;
      response += `Original query:\n\`\`\`graphql\n${graphqlQuery}\n\`\`\``;

      return response;
    } catch (error) {
      return `⚠️ Query optimization failed: ${error.message}`;
    }
  }
}

module.exports = { QueryOptimizer };
