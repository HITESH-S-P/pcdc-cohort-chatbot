class DocBrowserTool {
  constructor() {
    this.docs = {
      schema:
        "PCDC Schema: cohort(filterSet: FilterSetInput!) → DiagnosisFilter, DemographicsFilter, TreatmentFilter",
      diagnosis:
        "diagnosis: [{ term: { name: 'breast carcinoma' }, yearOfDiagnosis: { gte: 2020 } }]",
      demographics:
        "demographics: [{ ageAtDiagnosis: { gte: 60 }, gender: 'female' }]",
      filters:
        "Use AND/OR for complex queries: AND: [{diagnosis:...}, {demographics:...}]",
    };
  }

  async execute(topic) {
    const lowerTopic = topic.toLowerCase();
    for (const [key, content] of Object.entries(this.docs)) {
      if (lowerTopic.includes(key)) {
        return `📚 **${key.toUpperCase()}**\n\`\`\`graphql\n${content}\n\`\`\``;
      }
    }
    return "Available docs: schema, diagnosis, demographics, filters";
  }
}

module.exports = { DocBrowserTool };
