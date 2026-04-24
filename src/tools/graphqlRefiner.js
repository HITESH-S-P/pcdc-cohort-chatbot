const { GraphQLGenerator } = require("../graphql/generator");

class GraphQLRefiner {
  constructor() {
    this.generator = new GraphQLGenerator();
  }

  async execute({ previousQuery, refinement, previousDescription }) {
    try {
      const result = await this.generator.refine({
        previousQuery,
        refinement,
        previousDescription,
      });

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

      let response = `Refined GraphQL query based on your follow-up: "${refinement}"\n\n`;
      response += `\`\`\`graphql\n${result.query}\n\`\`\`\n\n`;

      if (result.validation) {
        response += `Validation: ${validationScore} (${validationStatus})\n`;
        response += `Matches: ${result.validation.matches?.join(", ") || "None"}\n`;
      }

      response += `\nTip: you can keep refining (e.g. "add ageAtDiagnosis > 10").`;
      return response;
    } catch (error) {
      return `⚠️ Refinement failed: ${error.message}\n\nTry: "add yearOfDiagnosis >= 2020"`;
    }
  }
}

module.exports = { GraphQLRefiner };

