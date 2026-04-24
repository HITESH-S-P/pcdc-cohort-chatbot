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

  async refine({ previousQuery, refinement, previousDescription }) {
    if (!previousQuery || !previousQuery.trim()) {
      throw new Error("Missing previousQuery for refinement.");
    }
    if (!refinement || !refinement.trim()) {
      throw new Error("Missing refinement instruction.");
    }

    console.log("🧠 Refining previous GraphQL with:", refinement);

    const promptParts = [
      `You will be given an existing GraphQL query for the PCDC schema and a user's follow-up refinement.`,
      `Return an UPDATED query that applies the refinement while preserving the original intent.`,
      previousDescription ? `Original cohort request: "${previousDescription}"` : null,
      `Previous query:`,
      "```graphql",
      previousQuery.trim(),
      "```",
      `Refinement instruction: "${refinement}"`,
      "",
      `Constraints:`,
      `- Keep the PCDC cohort(filterSet: ...) structure`,
      `- If you need to add additional constraints, prefer using AND with existing filters`,
      `- Return ONLY a single \`\`\`graphql\`\`\` fenced block`,
    ].filter(Boolean);

    const graphql = await this.llm.generateGraphQL(promptParts.join("\n"), PCDC_CONTEXT);

    const queryMatch = graphql.match(/```graphql\s*([\s\S]*?)\s*```/);
    const rawQuery = queryMatch ? queryMatch[1].trim() : graphql.trim();

    const validation = await evaluateQuery(rawQuery);

    return {
      query: rawQuery,
      validation,
      confidence: validation.score > 0.8 ? "high" : "medium",
    };
  }
}

module.exports = { GraphQLGenerator };
