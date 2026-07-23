const db = require("../config/db");
const jwt = require("jsonwebtoken");

exports.getTelecallers = async (req, res) => {
  try {
    const { search, isActive, ownCampaignEnabled } = req.query;
    
    let query = "SELECT id, telecaller_name, tele_mobile, is_active, own_campaign_enabled, is_deleted FROM telecaller_master WHERE is_deleted = 0";
    const params = [];

    if (search) {
      query += " AND (telecaller_name LIKE ? OR tele_mobile LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    if (isActive !== undefined && isActive !== "") {
      query += " AND is_active = ?";
      params.push(parseInt(isActive));
    }

    if (ownCampaignEnabled !== undefined && ownCampaignEnabled !== "") {
      query += " AND own_campaign_enabled = ?";
      params.push(parseInt(ownCampaignEnabled));
    }

    query += " ORDER BY CAST(SUBSTRING(SUBSTRING_INDEX(telecaller_name, ' ', 1), 2) AS UNSIGNED) ASC";

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching telecallers for telelogin:", error);
    res.status(500).json({ message: "Server error fetching telecallers" });
  }
};

exports.impersonateTelecaller = async (req, res) => {
  try {
    const adminId = req.user.id;
    const adminUsername = req.user.username; // Note: req.user structure depends on authMiddleware. We assume it has username or we just log it
    const { telecallerId } = req.params;

    // Verify telecaller exists and is active/not deleted
    const [telecallers] = await db.query(
      "SELECT id, telecaller_name, tele_mobile FROM telecaller_master WHERE id = ? AND is_deleted = 0",
      [telecallerId]
    );

    if (telecallers.length === 0) {
      return res.status(404).json({ message: "Telecaller not found or deleted" });
    }

    const tc = telecallers[0];

    // Generate Impersonation JWT (Valid for 30 minutes)
    const tokenPayload = {
      id: tc.id,
      role: "TELECALLER",
      telecaller_id: tc.id,
      telecaller_name: tc.telecaller_name,
      tele_mobile: tc.tele_mobile,
      impersonated: true,
      impersonated_by_admin_id: adminId,
      impersonated_by_admin_username: adminUsername || "admin"
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: "30m" });

    // Log the action
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers["user-agent"];

    await db.query(
      `INSERT INTO admin_telelogin_logs 
      (admin_id, admin_username, telecaller_id, telecaller_name, tele_mobile, ip_address, user_agent) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [adminId, adminUsername || "admin", tc.id, tc.telecaller_name, tc.tele_mobile, ipAddress, userAgent]
    );

    res.json({
      success: true,
      impersonationUrl: `/telecaller/impersonate?token=${token}`
    });

  } catch (error) {
    console.error("Error creating impersonation session:", error);
    res.status(500).json({ message: "Server error generating impersonation session" });
  }
};

exports.getLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const [logs] = await db.query(
      "SELECT * FROM admin_telelogin_logs ORDER BY login_at DESC LIMIT ? OFFSET ?",
      [limit, offset]
    );

    const [[{ count }]] = await db.query("SELECT COUNT(*) as count FROM admin_telelogin_logs");

    res.json({
      logs,
      total: count,
      page,
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error("Error fetching telelogin logs:", error);
    res.status(500).json({ message: "Server error fetching logs" });
  }
};
