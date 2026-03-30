class GeneralInquiryTool {
  async execute(query) {
    const responses = {
      pcdc: "PCDC (Pediatric Cancer Data Commons) aggregates pediatric cancer data for cohort discovery and research.",
      cohort:
        "Cohorts are groups of patients filtered by diagnosis, demographics, treatments using GraphQL queries.",
      graphql:
        "PCDC uses GraphQL API. Describe patients naturally → I generate queries automatically!",
      "data model":
        "Key entities: cohort → filterSet (diagnosis, demographics, treatments). Supports complex AND/OR nesting.",
    };

    const lowerQuery = query.toLowerCase();
    for (const [key, value] of Object.entries(responses)) {
      if (lowerQuery.includes(key)) return value;
    }

    return "PCDC enables cohort discovery through natural language → GraphQL conversion. Try describing a patient group!";
  }
}

module.exports = { GeneralInquiryTool };
