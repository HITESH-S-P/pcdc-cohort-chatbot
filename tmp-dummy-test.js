const { runQueryOnDummyData } = require("./src/graphql/dummyRunner");

const q = `cohort(filterSet: { diagnosis: [{ term: { name: "breast carcinoma" } }] }) { count totalCount cases { caseId } }`;

runQueryOnDummyData(q).then((r) => {
  console.log(JSON.stringify(r, null, 2));
});
