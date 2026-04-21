const { LLMClient } = require("../llm/gemini");
const { PCDC_SCHEMA, PCDC_CONTEXT } = require("./schema");

function extractGraphQLFromFencedBlock(text) {
  const match = String(text ?? "").match(/```graphql\s*([\s\S]*?)\s*```/i);
  return match ? match[1].trim() : String(text ?? "").trim();
}

function buildRepairContext() {
  // Keep the prompt grounded in the actual demo schema, but also include the
  // lightweight human-readable context the generator already uses.
  return `${PCDC_CONTEXT}\n\n---\n\nSchema (SDL):\n${PCDC_SCHEMA}`;
}

async function repairGraphQLQuery({ failingQuery, errorMessage }) {
  const llm = new LLMClient();
  const raw = await llm.repairGraphQLQuery({
    failingQuery,
    errorMessage,
    context: buildRepairContext(),
  });
  return extractGraphQLFromFencedBlock(raw);
}

module.exports = { repairGraphQLQuery };

