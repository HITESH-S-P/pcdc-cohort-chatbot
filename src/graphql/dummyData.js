const DUMMY_CASES = [
  {
    caseId: "CASE-001",
    diagnosis: {
      primaryDiagnosis: { name: "breast cancer", codes: ["C4872"] },
      diagnosisCategory: "carcinoma",
      yearOfDiagnosis: 2020,
    },
    demographics: {
      ageAtDiagnosis: 55,
      gender: "female",
      race: ["white"],
      vitalStatus: "alive",
    },
  },
  {
    caseId: "CASE-002",
    diagnosis: {
      primaryDiagnosis: { name: "lung carcinoma", codes: ["C4878"] },
      diagnosisCategory: "carcinoma",
      yearOfDiagnosis: 2019,
    },
    demographics: {
      ageAtDiagnosis: 67,
      gender: "male",
      race: ["asian"],
      vitalStatus: "deceased",
    },
  },
  {
    caseId: "CASE-003",
    diagnosis: {
      primaryDiagnosis: { name: "acute lymphoblastic leukemia", codes: ["C3167"] },
      diagnosisCategory: "leukemia",
      yearOfDiagnosis: 2021,
    },
    demographics: {
      ageAtDiagnosis: 9,
      gender: "female",
      race: ["hispanic"],
      vitalStatus: "alive",
    },
  },
  {
    caseId: "CASE-004",
    diagnosis: {
      primaryDiagnosis: { name: "breast carcinoma", codes: ["C4872"] },
      diagnosisCategory: "carcinoma",
      yearOfDiagnosis: 2022,
    },
    demographics: {
      ageAtDiagnosis: 42,
      gender: "female",
      race: ["black"],
      vitalStatus: "alive",
    },
  },
  {
    caseId: "CASE-005",
    diagnosis: {
      primaryDiagnosis: { name: "lung cancer", codes: ["C4878"] },
      diagnosisCategory: "carcinoma",
      yearOfDiagnosis: 2020,
    },
    demographics: {
      ageAtDiagnosis: 60,
      gender: "female",
      race: ["white"],
      vitalStatus: "alive",
    },
  },
];

module.exports = { DUMMY_CASES };

