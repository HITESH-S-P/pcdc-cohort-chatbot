const { parse, validate } = require("graphql");
const { PCDC_SCHEMA } = require("./schema");

const schemaAST = parse(PCDC_SCHEMA);

const TEST_QUERIES = {
  breast: `cohort(filterSet: { diagnosis: [{ term: { name: "breast carcinoma" } }] })`,
  "lung age": `cohort(filterSet: { 
        AND: [
            { diagnosis: [{ term: { name: "lung carcinoma" } }] },
            { demographics: [{ ageAtDiagnosis: { gte: 60 } }] }
        ]
    })`,
  "breast 2020": `cohort(filterSet: { 
        diagnosis: [{ 
            term: { name: "breast carcinoma" }, 
            yearOfDiagnosis: { gte: 2020 }
        }] 
    })`,
};

async function evaluateQuery(queryStr) {
  try {
    const ast = parse(queryStr);
    const errors = validate(schemaAST, ast);

    const score = errors.length === 0 ? 1.0 : 0.7;
    const matches = Object.keys(TEST_QUERIES).filter((key) =>
      queryStr.toLowerCase().includes(key),
    );

    return {
      score,
      valid: errors.length === 0,
      errors: errors.map((e) => e.message),
      matches,
    };
  } catch (error) {
    return { score: 0.3, valid: false, error: error.message };
  }
}

if (require.main === module) {
  // Test evaluator
  console.log("🧪 Testing GraphQL Evaluator...\n");

  Object.entries(TEST_QUERIES).forEach(async ([name, query]) => {
    const result = await evaluateQuery(query);
    console.log(
      `✅ ${name}: ${result.score.toFixed(2)} (${result.valid ? "VALID" : "INVALID"})`,
    );
  });
}

module.exports = { evaluateQuery };
