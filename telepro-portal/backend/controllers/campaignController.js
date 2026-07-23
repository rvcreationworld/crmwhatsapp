const db = require("../config/db");
const { syncCampaign } = require("../cron/syncCampaigns");

function extractSheetId(url) {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

exports.addGoogleSheetCampaign = async (req, res) => {
  try {
    const { telecaller_id, campaign_name, google_sheet_link } = req.body;
    
    if (!telecaller_id || !campaign_name || !google_sheet_link) {
      return res.status(400).json({ message: "Telecaller ID, Campaign Name, and Google Sheet Link are required" });
    }

    const sheetId = extractSheetId(google_sheet_link);
    if (!sheetId) {
      return res.status(400).json({ message: "Invalid Google Sheet link. Ensure it is a valid docs.google.com/spreadsheets URL." });
    }

    // Insert campaign with sheet_url
    const [campaignResult] = await db.query(
      `INSERT INTO telecaller_campaigns 
       (telecaller_id, campaign_name, sheet_url, total_imported, sync_status) 
       VALUES (?, ?, ?, 0, 'IDLE')`,
      [telecaller_id, campaign_name, google_sheet_link]
    );

    const campaignId = campaignResult.insertId;

    // We do NOT await the sync here, just trigger it in the background to not block the response
    const [newCampaignRows] = await db.query("SELECT * FROM telecaller_campaigns WHERE id = ?", [campaignId]);
    if (newCampaignRows.length > 0) {
      syncCampaign(newCampaignRows[0]).catch(err => console.error("Initial background sync failed:", err));
    }

    res.json({ 
      message: "Campaign added successfully! Initial sync started in the background.",
      campaignId: campaignId
    });

  } catch (error) {
    console.error("Add Campaign Error:", error);
    res.status(500).json({ message: "Server error processing Google Sheet: " + error.message });
  }
};

exports.triggerSyncNow = async (req, res) => {
  try {
    const { id } = req.params;
    const [campaignRows] = await db.query("SELECT * FROM telecaller_campaigns WHERE id = ?", [id]);
    
    if (campaignRows.length === 0) {
      return res.status(404).json({ message: "Campaign not found" });
    }
    
    const campaign = campaignRows[0];
    if (!campaign.sheet_url) {
      return res.status(400).json({ message: "This campaign does not have a Google Sheet linked." });
    }

    // Await it so we can report success/failure immediately to the manual trigger
    const syncResult = await syncCampaign(campaign);
    
    if (syncResult && !syncResult.success) {
      return res.status(500).json({ 
        success: false,
        fetchedRows: syncResult.fetchedRows || 0,
        insertedRows: syncResult.insertedRows || 0,
        skippedDuplicates: syncResult.skippedDuplicates || 0,
        message: syncResult.message || "Manual sync failed." 
      });
    }

    res.json({ 
      success: true,
      fetchedRows: syncResult ? syncResult.fetchedRows : 0,
      insertedRows: syncResult ? syncResult.insertedRows : 0,
      skippedDuplicates: syncResult ? syncResult.skippedDuplicates : 0,
      message: syncResult ? syncResult.message : "Manual sync triggered and completed successfully."
    });
  } catch (error) {
    console.error("Trigger sync error:", error);
    res.status(500).json({ message: "Server error triggering sync" });
  }
};

exports.getCampaigns = async (req, res) => {
  try {
    const telecaller_id = req.query.telecaller_id;
    let query = `
      SELECT c.*, t.telecaller_name 
      FROM telecaller_campaigns c
      JOIN telecaller_master t ON c.telecaller_id = t.id
    `;
    const params = [];

    if (telecaller_id) {
      query += ` WHERE c.telecaller_id = ?`;
      params.push(telecaller_id);
    }
    
    query += " ORDER BY c.created_at DESC";

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error("Get campaigns error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.toggleCampaign = async (req, res) => {
  try {
    const id = req.params.id;
    const { is_active } = req.body;
    
    await db.query("UPDATE telecaller_campaigns SET is_active = ? WHERE id = ?", [is_active, id]);
    res.json({ message: "Campaign toggled" });
  } catch (error) {
    console.error("Toggle campaign error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const { campaign_name, google_sheet_link } = req.body;
    
    if (!campaign_name || !google_sheet_link) {
      return res.status(400).json({ message: 'Campaign name and Google Sheet link are required' });
    }

    const sheetId = extractSheetId(google_sheet_link);
    if (!sheetId) {
      return res.status(400).json({ message: 'Invalid Google Sheet link. Ensure it is a valid docs.google.com/spreadsheets URL.' });
    }

    await db.query(
      'UPDATE telecaller_campaigns SET campaign_name = ?, sheet_url = ? WHERE id = ?',
      [campaign_name, google_sheet_link, id]
    );

    res.json({ message: 'Campaign updated successfully' });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({ message: 'Server error updating campaign' });
  }
};

exports.deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM telecaller_campaigns WHERE id = ?', [id]);
    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ message: 'Server error deleting campaign' });
  }
};

