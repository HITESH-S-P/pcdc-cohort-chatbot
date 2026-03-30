const { LLMClient } = require("../llm/gemini");
const { PCDC_CONTEXT } = require("./schema");
const { evaluateQuery } = require("./evaluator");

class GraphQLGenerator {
  constructor() {
    this.llm = new LLMClient();
  }

  async generate(userInput) {
    console.log("🔄 Generating GraphQL for:", userInput);

    const prompt = `Generate GraphQL query for: "${userInput}"`;
    const graphql = await this.llm.generateGraphQL(prompt, PCDC_CONTEXT);

    // Extract just the GraphQL code
    const queryMatch = graphql.match(/```graphql\s*([\s\S]*?)\s*```/);
    const rawQuery = queryMatch ? queryMatch[1].trim() : graphql.trim();

    // Validate and evaluate
    const validation = await evaluateQuery(rawQuery);

    return {
      query: rawQuery,
      validation,
      confidence: validation.score > 0.8 ? "high" : "medium",
    };
  }
}

module.exports = { GraphQLGenerator };
