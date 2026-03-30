const PCDC_SCHEMA = `
"""
PCDC Data Model Schema (Simplified for Demo)
"""
type Query {
  cohort(filterSet: FilterSetInput!): CohortResults!
}

input FilterSetInput {
  diagnosis: [DiagnosisFilter!]
  demographics: [DemographicsFilter!]
  treatments: [TreatmentFilter!]
  AND: [FilterSetInput!]
  OR: [FilterSetInput!]
}

input DiagnosisFilter {
  term: TermFilter!
  isPrimaryDiagnosis: Boolean
  diagnosisCategory: String
  yearOfDiagnosis: YearRangeFilter
}

input TermFilter {
  codes: [String!]
  name: String
}

input DemographicsFilter {
  ageAtDiagnosis: AgeRangeFilter
  gender: String
  race: [String!]
  vitalStatus: String
}

input AgeRangeFilter {
  gte: Int
  lte: Int
}

input YearRangeFilter {
  gte: Int
  lte: Int
}

input TreatmentFilter {
  treatmentIntent: String
  treatmentType: [String!]
}

type CohortResults {
  totalCount: Int!
  cases: [Case!]!
}

type Case {
  caseId: ID!
  diagnosis: Diagnosis!
  demographics: Demographics!
}

type Diagnosis {
  primaryDiagnosis: Term!
  diagnosisCategory: String
  yearOfDiagnosis: Int
}

type Demographics {
  ageAtDiagnosis: Int
  gender: String
  race: [String!]!
  vitalStatus: String
}

type Term {
  name: String!
  codes: [String!]!
}
`;

const PCDC_CONTEXT = `PCDC Patient Cohort Discovery:
- Primary endpoint: cohort(filterSet: FilterSetInput!)
- Key filters: diagnosis, demographics, treatments
- Diagnosis terms use NCIt codes (e.g., "C12345")
- Complex queries use AND/OR nesting
- Age: ageAtDiagnosis { gte: 60 }
- Year: yearOfDiagnosis { gte: 2020 lte: 2023 }
- Gender: "male", "female", "other"
- Race: ["white", "black", "asian", "hispanic"]

Example simple query:
cohort(filterSet: {
  diagnosis: [{ term: { name: "breast carcinoma" } }]
})

Example complex query:
cohort(filterSet: {
  AND: [
    { diagnosis: [{ term: { name: "lung carcinoma" }, isPrimaryDiagnosis: true }] },
    { demographics: [{ ageAtDiagnosis: { gte: 60 } }] }
  ]
})`;

module.exports = { PCDC_SCHEMA, PCDC_CONTEXT };
