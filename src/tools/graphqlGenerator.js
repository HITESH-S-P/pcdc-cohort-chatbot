const { GraphQLGenerator: Generator } = require("../graphql/generator");

class GraphQLGenerator {
  constructor() {
    this.generator = new Generator();
  }

  async execute(cohortDescription) {
    try {
      const result = await this.generator.generate(cohortDescription);

      const validationScore =
        result.validation?.score !== undefined && result.validation?.score !== null
          ? result.validation.score.toFixed(2)
          : "N/A";
      const validationStatus =
        result.validation?.valid === true
          ? "VALID"
          : result.validation?.valid === false
            ? "INVALID"
            : "UNKNOWN";

      let response = `GraphQL query generated for: "${cohortDescription}"\n\n`;
      response += `\`\`\`graphql\n${result.query}\n\`\`\`\n\n`;

      if (result.validation) {
        response += `Validation: ${validationScore} (${validationStatus})\n`;
        response += `Matches: ${result.validation.matches?.join(", ") || "None"}\n`;
      }

      response += `\nCopy the query into the PCDC GraphQL explorer.`;

      return response;
    } catch (error) {
      return `⚠️ GraphQL generation failed: ${error.message}\n\nTry simpler description like "breast cancer patients"`;
    }
  }
}

module.exports = { GraphQLGenerator };
