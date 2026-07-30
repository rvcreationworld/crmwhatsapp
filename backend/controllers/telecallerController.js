const db = require("../config/db");
const bcrypt = require("bcrypt");

exports.getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    let countQuery = "SELECT COUNT(*) as count FROM telecaller_master WHERE is_deleted = 0";
    let countParams = [];
    let dataQuery = "SELECT id, telecaller_name, tele_mobile, telegram_user_id, is_active, own_campaign_enabled, interakt_agent_email, interakt_agent_status, interakt_last_verified_at, created_at, phone_last10, last_verified, bot_leads_paused, callpulse_rules_bypassed FROM telecaller_master WHERE is_deleted = 0";
    let dataParams = [];

    if (search) {
      countQuery += " AND (telecaller_name LIKE ? OR tele_mobile LIKE ?)";
      countParams.push(`%${search}%`, `%${search}%`);
      dataQuery += " AND (telecaller_name LIKE ? OR tele_mobile LIKE ?)";
      dataParams.push(`%${search}%`, `%${search}%`);
    }

    dataQuery += " ORDER BY CAST(SUBSTRING(SUBSTRING_INDEX(telecaller_name, ' ', 1), 2) AS UNSIGNED) ASC LIMIT ? OFFSET ?";
    dataParams.push(limit, offset);

    const [countResult] = await db.query(countQuery, countParams);
    const totalCount = countResult[0].count;

    const [rows] = await db.query(dataQuery, dataParams);

    res.json({
      data: rows,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page
    });
  } catch (error) {
    console.error("getAll telecallers error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.create = async (req, res) => {
  try {
    const { telecaller_name, tele_mobile, password, is_active, own_campaign_enabled, interakt_agent_email, interakt_agent_status, callpulse_rules_bypassed } = req.body;

    if (!telecaller_name || !tele_mobile || !password) {
      return res.status(400).json({ success: false, message: "Name, mobile, and password are required." });
    }

    let finalEmail = interakt_agent_email ? interakt_agent_email.trim().toLowerCase() : null;
    let finalStatus = interakt_agent_status || 'NOT_REGISTERED';

    if (finalStatus === 'ACTIVE' && !finalEmail) {
      return res.status(400).json({ success: false, message: "Interakt Agent Email is mandatory when status is ACTIVE." });
    }
    
    if (finalEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(finalEmail)) {
        return res.status(400).json({ success: false, message: "Invalid email format." });
      }
      const [emailCheck] = await db.query("SELECT id FROM telecaller_master WHERE interakt_agent_email = ? AND is_deleted = 0", [finalEmail]);
      if (emailCheck.length > 0) {
        return res.status(400).json({ success: false, message: "This Interakt Agent Email is already assigned to another telecaller." });
      }
    }

    if (own_campaign_enabled === 1) {
      return res.status(400).json({ success: false, message: "Cannot enable Personal Meta Campaign Leads during creation. Please add the telecaller, link a campaign sheet in the Meta Campaigns tab, and then enable this setting." });
    }

    const digitsOnly = tele_mobile.replace(/\D/g, '');
    const phone_last10 = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;

    // Check for duplicate
    const [existing] = await db.query(
      "SELECT id, is_deleted FROM telecaller_master WHERE tele_mobile = ? OR phone_last10 = ?",
      [tele_mobile, phone_last10]
    );

    let password_hash = password;
    if (!password.startsWith("$2a$") && !password.startsWith("$2b$") && !password.startsWith("$2y$")) {
      password_hash = await bcrypt.hash(password, 10);
    }
    const active_status = is_active === undefined ? 1 : is_active;
    const own_campaign = own_campaign_enabled || 0;
    const callpulse_bypassed = callpulse_rules_bypassed || 0;

    if (existing.length > 0) {
      const existingUser = existing[0];
      if (existingUser.is_deleted === 0) {
        return res.status(400).json({ success: false, message: "Telecaller with this mobile number already exists." });
      } else {
        // Restore deleted user
        await db.query(
          `UPDATE telecaller_master 
           SET telecaller_name = ?, tele_mobile = ?, password_hash = ?, is_active = ?, is_deleted = 0, own_campaign_enabled = COALESCE(own_campaign_enabled, 0), callpulse_rules_bypassed = COALESCE(callpulse_rules_bypassed, 0) 
           WHERE id = ?`,
          [telecaller_name, tele_mobile, password_hash, active_status, existingUser.id]
        );
        return res.status(200).json({ success: true, message: "Telecaller created successfully", id: existingUser.id });
      }
    }

    const [result] = await db.query(
      "INSERT INTO telecaller_master (telecaller_name, tele_mobile, password_hash, is_active, own_campaign_enabled, interakt_agent_email, interakt_agent_status, callpulse_rules_bypassed, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)",
      [telecaller_name, tele_mobile, password_hash, active_status, own_campaign, finalEmail, finalStatus, callpulse_bypassed]
    );

    res.status(201).json({ success: true, message: "Telecaller created successfully", id: result.insertId });
  } catch (error) {
    console.error("CREATE TELECALLER ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to create telecaller", error: "Internal server error." });
  }
};

exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    const { telecaller_name, is_active, own_campaign_enabled, is_deleted, password, interakt_agent_email, interakt_agent_status, callpulse_rules_bypassed } = req.body;

    let finalEmail = interakt_agent_email !== undefined ? (interakt_agent_email ? interakt_agent_email.trim().toLowerCase() : null) : undefined;
    let finalStatus = interakt_agent_status !== undefined ? interakt_agent_status : undefined;

    if (finalStatus === 'ACTIVE' && finalEmail === null) {
      return res.status(400).json({ success: false, message: "Interakt Agent Email is mandatory when status is ACTIVE." });
    }

    if (finalEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(finalEmail)) {
        return res.status(400).json({ success: false, message: "Invalid email format." });
      }
      const [emailCheck] = await db.query("SELECT id FROM telecaller_master WHERE interakt_agent_email = ? AND id != ? AND is_deleted = 0", [finalEmail, id]);
      if (emailCheck.length > 0) {
        return res.status(400).json({ success: false, message: "This Interakt Agent Email is already assigned to another telecaller." });
      }
    }

    if (own_campaign_enabled === 1) {
      const [campaigns] = await db.query("SELECT id FROM telecaller_campaigns WHERE telecaller_id = ? AND sheet_url IS NOT NULL", [id]);
      if (campaigns.length === 0) {
        return res.status(400).json({ message: "Cannot enable Personal Meta Campaign Leads. This telecaller does not have a linked sheet in the Meta Campaigns tab." });
      }
    }

    if (is_deleted === 1 || is_deleted === true) {
      // Check for active leads across 4 tables
      const [wsActive] = await db.query(
        `SELECT id FROM working_sheet 
         WHERE telecaller_id = ? 
         AND (is_closed_lead = 0 OR is_closed_lead IS NULL)
         AND (is_transferred_lead = 0 OR is_transferred_lead IS NULL)
         AND (is_released_to_free_pool = 0 OR is_released_to_free_pool IS NULL)
         AND (is_kyc_done = 0 OR is_kyc_done IS NULL)
         LIMIT 1`, [id]
      );

      const [dlActive] = await db.query(
        `SELECT id FROM direct_leads 
         WHERE telecaller_id = ? 
         AND (is_closed_lead = 0 OR is_closed_lead IS NULL)
         AND (is_transferred_lead = 0 OR is_transferred_lead IS NULL)
         AND (is_released_to_free_pool = 0 OR is_released_to_free_pool IS NULL)
         AND (is_kyc_done = 0 OR is_kyc_done IS NULL)
         LIMIT 1`, [id]
      );

      const [flActive] = await db.query(
        `SELECT id FROM free_leads 
         WHERE current_telecaller_id = ? 
         AND (is_closed_lead = 0 OR is_closed_lead IS NULL)
         AND (is_transferred_lead = 0 OR is_transferred_lead IS NULL)
         AND free_status IN ('ASSIGNED', 'COMPLETED')
         LIMIT 1`, [id]
      );

      const [tlActive] = await db.query(
        `SELECT id FROM transferred_leads 
         WHERE current_telecaller_id = ? 
         AND (is_closed_lead = 0 OR is_closed_lead IS NULL)
         AND (is_released_to_free_pool = 0 OR is_released_to_free_pool IS NULL)
         AND transfer_status IN ('ASSIGNED', 'COMPLETED')
         LIMIT 1`, [id]
      );

      if (wsActive.length > 0 || dlActive.length > 0 || flActive.length > 0 || tlActive.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: "This telecaller has active leads. Transfer all leads before deleting." 
        });
      }
    }

    let query = "UPDATE telecaller_master SET telecaller_name = COALESCE(?, telecaller_name), is_active = COALESCE(?, is_active), own_campaign_enabled = COALESCE(?, own_campaign_enabled), is_deleted = COALESCE(?, is_deleted), callpulse_rules_bypassed = COALESCE(?, callpulse_rules_bypassed)";
    let params = [telecaller_name, is_active, own_campaign_enabled, is_deleted, callpulse_rules_bypassed];
    
    if (finalEmail !== undefined) {
      query += ", interakt_agent_email = ?";
      params.push(finalEmail);
    }
    if (finalStatus !== undefined) {
      query += ", interakt_agent_status = ?";
      params.push(finalStatus);
    }

    if (password && password.trim() !== "") {
      let password_hash = password.trim();
      if (!password_hash.startsWith("$2a$") && !password_hash.startsWith("$2b$") && !password_hash.startsWith("$2y$")) {
        password_hash = await bcrypt.hash(password_hash, 10);
      }
      query += ", password_hash = ?";
      params.push(password_hash);
    }

    query += " WHERE id = ?";
    params.push(id);

    await db.query(query, params);

    res.json({ message: "Telecaller updated successfully" });
  } catch (error) {
    console.error("update telecaller error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const id = req.params.id;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: "New password is required" });
    }

    let password_hash = newPassword.trim();
    if (!password_hash.startsWith("$2a$") && !password_hash.startsWith("$2b$") && !password_hash.startsWith("$2y$")) {
      password_hash = await bcrypt.hash(password_hash, 10);
    }

    await db.query(
      "UPDATE telecaller_master SET password_hash = ? WHERE id = ?",
      [password_hash, id]
    );

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("reset password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.toggleBotLeadsPause = async (req, res) => {
  try {
    const { id } = req.params;
    const { bot_leads_paused } = req.body;
    
    if (bot_leads_paused === undefined) {
      return res.status(400).json({ success: false, message: "bot_leads_paused is required" });
    }

    const [result] = await db.query(
      "UPDATE telecaller_master SET bot_leads_paused = ? WHERE id = ?",
      [bot_leads_paused ? 1 : 0, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Telecaller not found" });
    }

    // Refresh cache immediately
    const { refreshTop10Cache } = require("../services/botTop10Service");
    await refreshTop10Cache();

    res.json({ success: true, message: `BOT Leads ${bot_leads_paused ? 'paused' : 'resumed'} successfully` });
  } catch (error) {
    console.error("toggleBotLeadsPause error:", error);
    res.status(500).json({ success: false, message: "Server error toggling BOT leads" });
  }
};
