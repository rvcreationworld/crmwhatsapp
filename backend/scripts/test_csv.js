const axios = require("axios");
const { parse } = require("csv-parse/sync");

async function test() {
  const url = "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/export?format=csv"; // Example public sheet
  const response = await axios.get(url, { responseType: 'text' });
  const csvData = response.data;
  const records = parse(csvData, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true
  });
  console.log(records[0]);
}

test().catch(console.error);
