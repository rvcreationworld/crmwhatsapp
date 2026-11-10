const db = require('./config/db');

async function run() {
  try {
    const query = `
      SELECT free_leads.*,
      COALESCE(call_stats.total_calls, 0) AS total_call_logs,
      CASE
        WHEN COALESCE(call_stats.total_calls, 0) > 0 THEN 'CONNECTED'
        ELSE 'NOT_CALLED'
      END AS call_dot_type
    , tm1.telecaller_name as current_telecaller_name, tm1.telecaller_name as telecaller_name 
      FROM free_leads 
      LEFT JOIN telecaller_master tm1 ON free_leads.current_telecaller_id = tm1.id
      LEFT JOIN (
        SELECT
          normalized_number,
          COUNT(*) AS total_calls
        FROM callpulse_call_logs
        GROUP BY normalized_number
      ) call_stats
        ON call_stats.normalized_number = free_leads.contact_last10
      WHERE YEAR(COALESCE(free_leads.fetched_at, free_leads.moved_to_free_at, free_leads.created_at)) = YEAR(CURDATE()) AND MONTH(COALESCE(free_leads.fetched_at, free_leads.moved_to_free_at, free_leads.created_at)) = MONTH(CURDATE())   
      ORDER BY COALESCE(free_leads.fetched_at, free_leads.moved_to_free_at, free_leads.created_at) DESC 
      LIMIT 50 OFFSET 0
    `;
    const [rows] = await db.query(query);
    console.log("Success! Returned rows: ", rows.length);
  } catch (err) {
    console.error("SQL Error: ", err.message);
  }
  process.exit();
}

run();
