const mysql = require('mysql2/promise');
const fs = require('fs');

async function runDiff() {
  const connection = await mysql.createConnection({
    host: '82.25.108.74',
    user: 'shareMaster',
    password: 'Share@2025'
  });

  const getTables = async (db) => {
    const [rows] = await connection.query(`
      SELECT TABLE_NAME, TABLE_ROWS, AUTO_INCREMENT
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
    `, [db]);
    return rows;
  };

  const getColumns = async (db) => {
    const [rows] = await connection.query(`
      SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
    `, [db]);
    return rows;
  };

  const getIndexes = async (db) => {
    const [rows] = await connection.query(`
      SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME, NON_UNIQUE, SEQ_IN_INDEX
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX
    `, [db]);
    return rows;
  };

  const dbProd = 'crmpro_v2';
  const dbTest = 'crmpro_v2_whatsapp_test';

  const [pTables, tTables] = await Promise.all([getTables(dbProd), getTables(dbTest)]);
  const [pCols, tCols] = await Promise.all([getColumns(dbProd), getColumns(dbTest)]);
  const [pIndexes, tIndexes] = await Promise.all([getIndexes(dbProd), getIndexes(dbTest)]);

  const buildStruct = (tables, cols, idxs) => {
    const struct = {};
    tables.forEach(t => {
      struct[t.TABLE_NAME] = {
        rows: t.TABLE_ROWS || 0,
        auto_inc: t.AUTO_INCREMENT || 'N/A',
        cols: {},
        indexes: {}
      };
    });
    cols.forEach(c => {
      if (struct[c.TABLE_NAME]) {
        struct[c.TABLE_NAME].cols[c.COLUMN_NAME] = {
          type: c.COLUMN_TYPE,
          null: c.IS_NULLABLE,
          default: c.COLUMN_DEFAULT
        };
      }
    });
    idxs.forEach(i => {
      if (struct[i.TABLE_NAME]) {
        if (!struct[i.TABLE_NAME].indexes[i.INDEX_NAME]) {
          struct[i.TABLE_NAME].indexes[i.INDEX_NAME] = { cols: [], unique: i.NON_UNIQUE === 0 };
        }
        struct[i.TABLE_NAME].indexes[i.INDEX_NAME].cols.push(i.COLUMN_NAME);
      }
    });
    return struct;
  };

  const prodStruct = buildStruct(pTables, pCols, pIndexes);
  const testStruct = buildStruct(tTables, tCols, tIndexes);

  const allTables = new Set([...Object.keys(prodStruct), ...Object.keys(testStruct)]);
  
  let md = "# Comprehensive Schema & Data Difference Report\n\n";
  md += "> Comparing Production (`crmpro_v2`) vs Test (`crmpro_v2_whatsapp_test`)\n\n";

  md += "## 1. Table Level Differences\n";
  md += "| Table Name | Status | Prod Rows | Test Rows | Prod AutoInc | Test AutoInc |\n";
  md += "|---|---|---|---|---|---|\n";

  const diffDetails = [];

  [...allTables].sort().forEach(tName => {
    const inProd = !!prodStruct[tName];
    const inTest = !!testStruct[tName];
    
    let status = "Identical";
    if (!inProd) status = "Only in Test";
    else if (!inTest) status = "Only in Prod";
    else {
      // Check for deep differences
      const pC = prodStruct[tName].cols;
      const tC = testStruct[tName].cols;
      const pI = prodStruct[tName].indexes;
      const tI = testStruct[tName].indexes;

      const allC = new Set([...Object.keys(pC), ...Object.keys(tC)]);
      const allI = new Set([...Object.keys(pI), ...Object.keys(tI)]);

      let hasDiff = false;
      let diffLogs = [];

      allC.forEach(cName => {
        if (!pC[cName]) { hasDiff = true; diffLogs.push(`- Column \`${cName}\` missing in Prod (Test type: ${tC[cName].type})`); }
        else if (!tC[cName]) { hasDiff = true; diffLogs.push(`- Column \`${cName}\` missing in Test (Prod type: ${pC[cName].type})`); }
        else {
          if (pC[cName].type !== tC[cName].type) {
            hasDiff = true;
            diffLogs.push(`- Column \`${cName}\` TYPE mismatch. Prod: \`${pC[cName].type}\`, Test: \`${tC[cName].type}\``);
          }
          if (pC[cName].null !== tC[cName].null) {
            hasDiff = true;
            diffLogs.push(`- Column \`${cName}\` NULL mismatch. Prod: \`${pC[cName].null}\`, Test: \`${tC[cName].null}\``);
          }
          if (pC[cName].default !== tC[cName].default) {
            hasDiff = true;
            diffLogs.push(`- Column \`${cName}\` DEFAULT mismatch. Prod: \`${pC[cName].default}\`, Test: \`${tC[cName].default}\``);
          }
        }
      });

      allI.forEach(iName => {
        if (!pI[iName]) { hasDiff = true; diffLogs.push(`- Index \`${iName}\` missing in Prod (Test cols: ${tI[iName].cols.join(',')})`); }
        else if (!tI[iName]) { hasDiff = true; diffLogs.push(`- Index \`${iName}\` missing in Test (Prod cols: ${pI[iName].cols.join(',')})`); }
        else {
          if (pI[iName].cols.join(',') !== tI[iName].cols.join(',')) {
            hasDiff = true;
            diffLogs.push(`- Index \`${iName}\` COLS mismatch. Prod: \`${pI[iName].cols.join(',')}\`, Test: \`${tI[iName].cols.join(',')}\``);
          }
          if (pI[iName].unique !== tI[iName].unique) {
            hasDiff = true;
            diffLogs.push(`- Index \`${iName}\` UNIQUE mismatch. Prod: \`${pI[iName].unique}\`, Test: \`${tI[iName].unique}\``);
          }
        }
      });

      if (hasDiff) {
        status = "Structure Differs";
        diffDetails.push({ table: tName, logs: diffLogs });
      }
    }

    const pRow = inProd ? prodStruct[tName].rows : '-';
    const tRow = inTest ? testStruct[tName].rows : '-';
    const pAi = inProd ? prodStruct[tName].auto_inc : '-';
    const tAi = inTest ? testStruct[tName].auto_inc : '-';

    md += `| ${tName} | ${status} | ${pRow} | ${tRow} | ${pAi} | ${tAi} |\n`;
  });

  md += "\n## 2. Detailed Structure Differences (Enums, Types, Indexes)\n";
  if (diffDetails.length === 0) {
    md += "No structural differences found between matching tables.\n";
  } else {
    diffDetails.forEach(d => {
      md += `### Table: \`${d.table}\`\n`;
      d.logs.forEach(l => md += `${l}\n`);
      md += "\n";
    });
  }

  fs.writeFileSync('/Users/aniket/.gemini/antigravity/brain/4b2c7908-bdbc-4ddc-b44e-7804f1bfc357/schema_differences.md', md);
  await connection.end();
  console.log("Diff complete.");
}

runDiff().catch(console.error);
