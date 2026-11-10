const fs = require('fs');

// 1. Free Leads
let free = fs.readFileSync('backend/controllers/telecallerFreeLeadController.js', 'utf8');
const freeReplacement = `exports.getMyFreeLeads = async (req, res) => {
  try {
    const telecallerId = req.user.id;
    const { period } = req.query;

    let dateWhere = "";
    if (period === 'current') {
      dateWhere = " AND YEAR(fl.fetched_at) = YEAR(CURDATE()) AND MONTH(fl.fetched_at) = MONTH(CURDATE())";
    } else if (period === 'past') {
      dateWhere = " AND fl.fetched_at >= DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01') AND fl.fetched_at < DATE_FORMAT(CURDATE(), '%Y-%m-01')";
    }

    const [leads] = await db.query(\`
      SELECT fl.*, 
             pt.telecaller_name AS previous_telecaller_name
      FROM free_leads fl
      LEFT JOIN telecaller_master pt ON fl.previous_telecaller_id = pt.id
      WHERE fl.current_telecaller_id = ? AND fl.free_status IN ('ASSIGNED', 'COMPLETED')
      AND (fl.is_closed_lead = 0 OR fl.is_closed_lead IS NULL) AND (fl.is_transferred_lead = 0 OR fl.is_transferred_lead IS NULL)
      \${dateWhere}
      ORDER BY fl.fetched_at DESC
    \`, [telecallerId]);`;

free = free.replace(/exports\.getMyFreeLeads = async \(req, res\) => \{[\s\S]*?ORDER BY fl\.fetched_at DESC\n    `, \[telecallerId\]\);/, freeReplacement);
fs.writeFileSync('backend/controllers/telecallerFreeLeadController.js', free);

// 2. Transferred Leads
let trans = fs.readFileSync('backend/controllers/telecallerTransferredLeadController.js', 'utf8');
const transReplacement = `exports.getMyTransferredLeads = async (req, res) => {
  try {
    const telecallerId = req.user.id;
    const { period } = req.query;

    let dateWhere = "";
    if (period === 'current') {
      dateWhere = " AND YEAR(tl.transferred_at) = YEAR(CURDATE()) AND MONTH(tl.transferred_at) = MONTH(CURDATE())";
    } else if (period === 'past') {
      dateWhere = " AND tl.transferred_at >= DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01') AND tl.transferred_at < DATE_FORMAT(CURDATE(), '%Y-%m-01')";
    }

    // Get pending leads (ASSIGNED) and completed leads (COMPLETED)
    const [leads] = await db.query(
      \`SELECT tl.*, pt.telecaller_name AS previous_telecaller_name
       FROM transferred_leads tl
       LEFT JOIN telecaller_master pt ON tl.previous_telecaller_id = pt.id
       WHERE tl.current_telecaller_id = ? 
         AND tl.transfer_status IN ('ASSIGNED', 'COMPLETED')
         AND (tl.is_closed_lead = 0 OR tl.is_closed_lead IS NULL)
         AND (tl.is_released_to_free_pool = 0 OR tl.is_released_to_free_pool IS NULL)
         \${dateWhere}
       ORDER BY tl.transferred_at DESC\`,
      [telecallerId]
    );`;

trans = trans.replace(/exports\.getMyTransferredLeads = async \(req, res\) => \{[\s\S]*?ORDER BY tl\.transferred_at DESC`,\n      \[telecallerId\]\n    \);/, transReplacement);
fs.writeFileSync('backend/controllers/telecallerTransferredLeadController.js', trans);

console.log('Fixed period queries');
