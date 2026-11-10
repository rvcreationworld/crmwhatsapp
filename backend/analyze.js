const mysql = require('mysql2/promise');
const fs = require('fs');

async function analyze() {
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
      SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME, ORDINAL_POSITION
    `, [db]);
    return rows;
  };

  const getIndexes = async (db) => {
    const [rows] = await connection.query(`
      SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME, NON_UNIQUE
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX
    `, [db]);
    return rows;
  };

  const getRoutines = async (db) => {
    const [rows] = await connection.query(`
      SELECT ROUTINE_NAME, ROUTINE_TYPE
      FROM information_schema.ROUTINES
      WHERE ROUTINE_SCHEMA = ?
    `, [db]);
    return rows;
  };

  const getTriggers = async (db) => {
    const [rows] = await connection.query(`
      SELECT TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE, ACTION_TIMING
      FROM information_schema.TRIGGERS
      WHERE TRIGGER_SCHEMA = ?
    `, [db]);
    return rows;
  };

  const getViews = async (db) => {
    const [rows] = await connection.query(`
      SELECT TABLE_NAME
      FROM information_schema.VIEWS
      WHERE TABLE_SCHEMA = ?
    `, [db]);
    return rows;
  };

  const getEvents = async (db) => {
    const [rows] = await connection.query(`
      SELECT EVENT_NAME, STATUS
      FROM information_schema.EVENTS
      WHERE EVENT_SCHEMA = ?
    `, [db]);
    return rows;
  };

  const dbProd = 'crmpro_v2';
  const dbTest = 'crmpro_v2_whatsapp_test';

  const pTables = await getTables(dbProd);
  const tTables = await getTables(dbTest);

  const pCols = await getColumns(dbProd);
  const tCols = await getColumns(dbTest);

  const pIndexes = await getIndexes(dbProd);
  const tIndexes = await getIndexes(dbTest);

  const pRoutines = await getRoutines(dbProd);
  const tRoutines = await getRoutines(dbTest);

  const pTriggers = await getTriggers(dbProd);
  const tTriggers = await getTriggers(dbTest);

  const pViews = await getViews(dbProd);
  const tViews = await getViews(dbTest);

  const pEvents = await getEvents(dbProd);
  const tEvents = await getEvents(dbTest);

  // Reorganize data
  const structureProd = {};
  pTables.forEach(t => structureProd[t.TABLE_NAME] = { rows: t.TABLE_ROWS, auto_increment: t.AUTO_INCREMENT, cols: [], indexes: [] });
  pCols.forEach(c => { if(structureProd[c.TABLE_NAME]) structureProd[c.TABLE_NAME].cols.push(c); });
  pIndexes.forEach(i => { if(structureProd[i.TABLE_NAME]) structureProd[i.TABLE_NAME].indexes.push(i); });

  const structureTest = {};
  tTables.forEach(t => structureTest[t.TABLE_NAME] = { rows: t.TABLE_ROWS, auto_increment: t.AUTO_INCREMENT, cols: [], indexes: [] });
  tCols.forEach(c => { if(structureTest[c.TABLE_NAME]) structureTest[c.TABLE_NAME].cols.push(c); });
  tIndexes.forEach(i => { if(structureTest[i.TABLE_NAME]) structureTest[i.TABLE_NAME].indexes.push(i); });

  let md = "# Complete Database Comparison Report\n\n";

  md += "## Summary of Objects\n";
  md += "| Object Type | crmpro_v2 (Production) | crmpro_v2_whatsapp_test (Test) |\n";
  md += "|---|---|---|\n";
  md += `| Tables | ${pTables.length} | ${tTables.length} |\n`;
  md += `| Views | ${pViews.length} | ${tViews.length} |\n`;
  md += `| Procedures/Functions | ${pRoutines.length} | ${tRoutines.length} |\n`;
  md += `| Triggers | ${pTriggers.length} | ${tTriggers.length} |\n`;
  md += `| Events | ${pEvents.length} | ${tEvents.length} |\n\n`;

  const prodTableNames = new Set(Object.keys(structureProd));
  const testTableNames = new Set(Object.keys(structureTest));

  const prodOnly = [...prodTableNames].filter(x => !testTableNames.has(x));
  const testOnly = [...testTableNames].filter(x => !prodTableNames.has(x));
  const common = [...prodTableNames].filter(x => testTableNames.has(x));

  const identical = [];
  const different = [];

  common.forEach(tName => {
    const pStr = JSON.stringify(structureProd[tName].cols);
    const tStr = JSON.stringify(structureTest[tName].cols);
    if (pStr === tStr) identical.push(tName);
    else different.push(tName);
  });

  md += `## Table Overview\n`;
  md += `- **Tables only in Production**: ${prodOnly.length > 0 ? prodOnly.join(', ') : 'None'}\n`;
  md += `- **Tables only in Test**: ${testOnly.length > 0 ? testOnly.join(', ') : 'None'}\n`;
  md += `- **Tables with identical structures**: ${identical.length}\n`;
  md += `- **Tables with different structures**: ${different.length}\n\n`;

  if (different.length > 0) {
    md += "### Tables with Different Structures\n";
    different.forEach(tName => {
      md += `- **${tName}**\n`;
    });
    md += "\n";
  }

  md += "## Detailed Table Analysis\n";
  
  const allTables = new Set([...prodTableNames, ...testTableNames]);
  
  const businessTables = [];

  [...allTables].sort().forEach(tName => {
    const inProd = prodTableNames.has(tName);
    const inTest = testTableNames.has(tName);
    const p = structureProd[tName] || {};
    const t = structureTest[tName] || {};
    
    // Add to business tables list if it has data in prod
    if (inProd && p.rows > 0) businessTables.push({ name: tName, rows: p.rows });
    
    md += `### Table: ${tName}\n`;
    md += `- **Exists in**: ${inProd && inTest ? 'Both' : (inProd ? 'Production Only' : 'Test Only')}\n`;
    md += `- **Row Count**: Prod: ${p.rows || 0}, Test: ${t.rows || 0}\n`;
    md += `- **Auto_Increment**: Prod: ${p.auto_increment || 'N/A'}, Test: ${t.auto_increment || 'N/A'}\n`;
    
    const pkColsProd = inProd ? p.indexes.filter(i => i.INDEX_NAME === 'PRIMARY').map(i => i.COLUMN_NAME).join(', ') : '';
    const pkColsTest = inTest ? t.indexes.filter(i => i.INDEX_NAME === 'PRIMARY').map(i => i.COLUMN_NAME).join(', ') : '';
    md += `- **Primary Key**: Prod: [${pkColsProd}], Test: [${pkColsTest}]\n`;
    md += "\n";
    
    // Check if it's different to print columns, otherwise skip full column dump to save space
    if (inProd && inTest && different.includes(tName)) {
       md += "#### Structure Differences\n";
       md += "Columns in Prod but not Test or changed:\n";
       p.cols.forEach(pc => {
          const tc = t.cols.find(c => c.COLUMN_NAME === pc.COLUMN_NAME);
          if (!tc) md += `- ${pc.COLUMN_NAME} (Removed in Test)\n`;
          else if (tc.COLUMN_TYPE !== pc.COLUMN_TYPE || tc.IS_NULLABLE !== pc.IS_NULLABLE || tc.COLUMN_DEFAULT !== pc.COLUMN_DEFAULT) {
              md += `- ${pc.COLUMN_NAME}: Prod(${pc.COLUMN_TYPE}, Null:${pc.IS_NULLABLE}, Def:${pc.COLUMN_DEFAULT}) -> Test(${tc.COLUMN_TYPE}, Null:${tc.IS_NULLABLE}, Def:${tc.COLUMN_DEFAULT})\n`;
          }
       });
       t.cols.forEach(tc => {
          const pc = p.cols.find(c => c.COLUMN_NAME === tc.COLUMN_NAME);
          if (!pc) md += `- ${tc.COLUMN_NAME} (Added in Test): ${tc.COLUMN_TYPE}\n`;
       });
       md += "\n";
    }
  });

  md += "## Business Tables Migration Analysis\n";
  md += "The following business tables contain data in Production and must be carefully migrated. Order of migration must respect Foreign Keys.\n\n";

  md += "| Table Name | Prod Rows | PK/IDs Preservable? | Timestamps Preservable? | Safe Migration Order |\n";
  md += "|---|---|---|---|---|\n";

  // Let's analyze FKs using another query
  const [fkRows] = await connection.query(`
    SELECT TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE REFERENCED_TABLE_SCHEMA = ?
  `, [dbProd]);

  const fks = {};
  fkRows.forEach(row => {
     if(!fks[row.TABLE_NAME]) fks[row.TABLE_NAME] = [];
     fks[row.TABLE_NAME].push(row.REFERENCED_TABLE_NAME);
  });

  // Calculate dependency level
  const levels = {};
  function getLevel(table, visited = new Set()) {
     if(levels[table]) return levels[table];
     if(visited.has(table)) return 0; // circular
     visited.add(table);
     
     if(!fks[table] || fks[table].length === 0) {
        levels[table] = 1;
        return 1;
     }
     let maxLevel = 1;
     for(let ref of fks[table]) {
        maxLevel = Math.max(maxLevel, getLevel(ref, visited) + 1);
     }
     levels[table] = maxLevel;
     return maxLevel;
  }

  businessTables.forEach(bt => {
      getLevel(bt.name);
  });

  businessTables.sort((a,b) => (levels[a.name] || 1) - (levels[b.name] || 1));

  businessTables.forEach(bt => {
      let tName = bt.name;
      const deps = fks[tName] ? fks[tName].join(', ') : 'None';
      const isAutoInc = structureProd[tName].auto_increment !== null;
      md += `| ${tName} | ${bt.rows} | Yes | Yes | Level ${levels[tName] || 1} (Deps: ${deps}) |\n`;
  });

  md += "\n## Migration Strategy & Verification\n";
  md += "1. **IDs & Auto_Increment**: Since we are migrating INTO \`crmpro_v2_whatsapp_test\`, we must TRUNCATE/DELETE all test data from the target tables and disable \`FOREIGN_KEY_CHECKS = 0\`. Then we execute \`INSERT INTO ... SELECT * FROM crmpro_v2...\` explicitly specifying the ID columns to preserve exact primary keys. Afterward, we reset the AUTO_INCREMENT counter using the MAX(id) + 1.\n";
  md += "2. **Timestamps**: Since we use exact \`INSERT\`, fields like \`created_at\`, \`updated_at\` will retain their exact original values without receiving today's timestamp (provided we list the columns explicitly or insert the exact rows without triggering ON UPDATE CURRENT_TIMESTAMP behaviors unless necessary. Wait, \`INSERT\` preserves values exactly, \`ON UPDATE\` is only for updates).\n";
  md += "3. **Order**: Insert Level 1 tables first (no dependencies), then Level 2, etc.\n";
  md += "4. **Different Structures**: For tables where test has more columns, the \`INSERT\` statement must specify columns matching production, leaving new columns to assume their \`DEFAULT\` values.\n";

  fs.writeFileSync('/Users/aniket/.gemini/antigravity/brain/4b2c7908-bdbc-4ddc-b44e-7804f1bfc357/database_analysis.md', md);
  await connection.end();
  console.log("Analysis complete.");
}

analyze().catch(console.error);
