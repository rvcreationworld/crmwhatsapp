const db = require("../config/db");
const { syncCommonCampaign } = require("../cron/syncCampaigns");

exports.getCommonCampaign = async (req, res) => {
  try {
    const [campaigns] = await db.query("SELECT * FROM common_campaigns ORDER BY id DESC LIMIT 1");
    if (campaigns.length === 0) {
      return res.json({ campaign: null, recentImports: [] });
    }
    const campaign = campaigns[0];

    const [recentImports] = await db.query(
      "SELECT full_name, phone_no, sheet_created_time FROM common_campaign_imports WHERE campaign_id = ? ORDER BY id DESC LIMIT 50",
      [campaign.id]
    );

    res.json({ campaign, recentImports });
  } catch (err) {
    console.error("Error fetching common campaign:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.saveCommonCampaign = async (req, res) => {
  const { campaign_name, sheet_url } = req.body;
  
  if (!sheet_url) {
    return res.status(400).json({ message: "Sheet URL is required" });
  }

  try {
    const [existing] = await db.query("SELECT id FROM common_campaigns LIMIT 1");
    if (existing.length > 0) {
      // Update
      await db.query(
        "UPDATE common_campaigns SET campaign_name = ?, sheet_url = ?, updated_at = NOW() WHERE id = ?",
        [campaign_name || "Common Campaign", sheet_url, existing[0].id]
      );
    } else {
      // Insert
      await db.query(
        "INSERT INTO common_campaigns (campaign_name, sheet_url, is_active, auto_sync_enabled, sync_interval_minutes, total_imported) VALUES (?, ?, 1, 0, 4, 0)",
        [campaign_name || "Common Campaign", sheet_url]
      );
    }
    res.json({ message: "Common campaign saved successfully" });
  } catch (err) {
    console.error("Error saving common campaign:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.triggerSyncNow = async (req, res) => {
  try {
    const [campaigns] = await db.query("SELECT * FROM common_campaigns LIMIT 1");
    if (campaigns.length === 0) {
      return res.status(404).json({ message: "Common campaign not found" });
    }
    const campaign = campaigns[0];

    if (!campaign.sheet_url) {
      return res.status(400).json({ message: "Google Sheet URL is not configured" });
    }

    const result = await syncCommonCampaign(campaign, 'MANUAL');
    
    if (result.success) {
      res.json({ message: result.message, imported: result.insertedRows, skipped: result.skippedRows });
    } else {
      res.status(500).json({ message: result.message });
    }
  } catch (err) {
    console.error("Error triggering manual sync for common campaign:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.toggleCampaignStatus = async (req, res) => {
  const { is_active } = req.body;
  try {
    await db.query("UPDATE common_campaigns SET is_active = ?, updated_at = NOW()", [is_active]);
    res.json({ message: `Common campaign ${is_active ? 'resumed' : 'paused'}` });
  } catch (err) {
    console.error("Error toggling common campaign status:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.toggleAutoSync = async (req, res) => {
  const { auto_sync_enabled } = req.body;
  try {
    await db.query("UPDATE common_campaigns SET auto_sync_enabled = ?, updated_at = NOW()", [auto_sync_enabled]);
    res.json({ message: `Common campaign auto sync ${auto_sync_enabled ? 'enabled' : 'disabled'}` });
  } catch (err) {
    console.error("Error toggling common campaign auto sync:", err);
    res.status(500).json({ message: "Server Error" });
  }
};
