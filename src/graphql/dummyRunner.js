const { buildSchema, graphql, validate, parse } = require("graphql");
const { PCDC_SCHEMA } = require("./schema");
const { DUMMY_CASES } = require("./dummyData");

const dummySchema = buildSchema(PCDC_SCHEMA);

/**
 * LLM output often omits the `query { ... }` wrapper; GraphQL requires an operation.
 * If parsing fails, retry with a standard query wrapper.
 */
function normalizeQueryDocument(query) {
  const trimmed = (query ?? "").trim();
  if (!trimmed) return trimmed;

  try {
    parse(trimmed);
    return trimmed;
  } catch {
    const wrapped = `query {\n${trimmed}\n}`;
    try {
      parse(wrapped);
      return wrapped;
    } catch {
      return trimmed;
    }
  }
}

function normStr(s) {
  return (s ?? "").toString().trim().toLowerCase();
}

function matchesDiagnosisFilter(c, f) {
  if (!f) return true;
  const diagName = normStr(c?.diagnosis?.primaryDiagnosis?.name);

  if (f.term) {
    const termName = normStr(f.term.name);
    if (termName && !diagName.includes(termName)) return false;
  }

  if (typeof f.diagnosisCategory === "string" && f.diagnosisCategory.trim()) {
    const cat = normStr(c?.diagnosis?.diagnosisCategory);
    if (cat !== normStr(f.diagnosisCategory)) return false;
  }

  if (f.yearOfDiagnosis) {
    const y = c?.diagnosis?.yearOfDiagnosis;
    if (typeof f.yearOfDiagnosis.gte === "number" && !(y >= f.yearOfDiagnosis.gte))
      return false;
    if (typeof f.yearOfDiagnosis.lte === "number" && !(y <= f.yearOfDiagnosis.lte))
      return false;
  }

  return true;
}

function matchesDemographicsFilter(c, f) {
  if (!f) return true;

  if (f.ageAtDiagnosis) {
    const age = c?.demographics?.ageAtDiagnosis;
    if (typeof f.ageAtDiagnosis.gte === "number" && !(age >= f.ageAtDiagnosis.gte))
      return false;
    if (typeof f.ageAtDiagnosis.lte === "number" && !(age <= f.ageAtDiagnosis.lte))
      return false;
  }

  if (typeof f.gender === "string" && f.gender.trim()) {
    const g = normStr(c?.demographics?.gender);
    if (g !== normStr(f.gender)) return false;
  }

  if (Array.isArray(f.race) && f.race.length > 0) {
    const races = (c?.demographics?.race ?? []).map(normStr);
    const wanted = f.race.map(normStr);
    const ok = wanted.some((w) => races.includes(w));
    if (!ok) return false;
  }

  if (typeof f.vitalStatus === "string" && f.vitalStatus.trim()) {
    const vs = normStr(c?.demographics?.vitalStatus);
    if (vs !== normStr(f.vitalStatus)) return false;
  }

  return true;
}

function matchesFilterSet(c, filterSet) {
  if (!filterSet) return true;

  // Direct filters: treat list as OR within each category.
  if (Array.isArray(filterSet.diagnosis) && filterSet.diagnosis.length > 0) {
    const ok = filterSet.diagnosis.some((f) => matchesDiagnosisFilter(c, f));
    if (!ok) return false;
  }

  if (
    Array.isArray(filterSet.demographics) &&
    filterSet.demographics.length > 0
  ) {
    const ok = filterSet.demographics.some((f) => matchesDemographicsFilter(c, f));
    if (!ok) return false;
  }

  // Nested AND
  if (Array.isArray(filterSet.AND) && filterSet.AND.length > 0) {
    const ok = filterSet.AND.every((fs) => matchesFilterSet(c, fs));
    if (!ok) return false;
  }

  // Nested OR
  if (Array.isArray(filterSet.OR) && filterSet.OR.length > 0) {
    const ok = filterSet.OR.some((fs) => matchesFilterSet(c, fs));
    if (!ok) return false;
  }

  return true;
}

const rootValue = {
  cohort: ({ filterSet }) => {
    const matched = DUMMY_CASES.filter((c) => matchesFilterSet(c, filterSet));
    return {
      count: matched.length,
      totalCount: matched.length,
      cases: matched,
    };
  },
};

async function runQueryOnDummyData(query, variables = {}) {
  const document = normalizeQueryDocument(query);
  const ast = parse(document);
  const errors = validate(dummySchema, ast);
  if (errors.length > 0) {
    return { data: null, errors };
  }

  return await graphql({
    schema: dummySchema,
    source: document,
    rootValue,
    variableValues: variables,
  });
}

module.exports = { runQueryOnDummyData };

