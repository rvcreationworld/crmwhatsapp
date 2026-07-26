const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const db = require("./config/db");
const { initCron } = require("./cron/syncCampaigns");
const { startWhatsAppQueueProcessor, stopWhatsAppQueueProcessor } = require('./services/whatsappQueueProcessor');
const { processAutomationQueue } = require('./services/automationQueueService');
const { processRecurringBroadcasts } = require('./services/recurringBroadcastService');
const { startRefreshCron } = require('./services/botTop10Service');

let automationInterval = null;

const bcrypt = require("bcrypt");

// Load .env relative to the backend folder
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const app = express();

// Initialize Cron Jobs
initCron();
startRefreshCron();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Serve static files (uploads)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/telecallers", require("./routes/telecallerRoutes"));
app.use("/api/new-leads", require("./routes/newLeadRoutes"));
app.use("/api/working-sheet", require("./routes/workingSheetRoutes"));
app.use("/api/admin/bot-auto-assign", require("./routes/botAutoAssignRoutes"));
app.use("/api/reports", require("./routes/reportRoutes"));
app.use("/api/campaigns", require("./routes/campaignRoutes"));
app.use("/api/direct-leads", require("./routes/directLeadsRoutes"));
app.use("/api/settings", require("./routes/settingsRoutes"));
app.use("/api/callpulse", require("./routes/callpulseRoutes"));
app.use("/api/telecaller/leads", require("./routes/telecallerLeadsRoutes"));
app.use("/api/telecaller/analytics", require("./routes/telecallerAnalyticsRoutes"));
app.use("/api/admin/tele-login", require("./routes/adminTeleloginRoutes"));
app.use("/api/admin/common-campaign", require("./routes/commonCampaignRoutes"));
app.use("/api/telecaller/bot-pool", require("./routes/telecallerBotPoolRoutes"));
app.use("/api/admin/bulk-add", require("./routes/adminBulkAddRoutes"));
app.use("/api/admin/attendance", require("./routes/adminAttendanceRoutes"));
app.use("/api/telecaller/my-clients", require("./routes/telecallerMyClientsRoutes"));
app.use("/api/telecaller/direct-leads", require("./routes/telecallerDirectLeadsRoutes"));
app.use("/api/telecaller/untouched-leads", require("./routes/telecallerUntouchedRoutes"));
app.use("/api/admin/last-activity", require("./routes/adminActivityRoutes"));
app.use("/api/admin/free-leads", require("./routes/adminFreeLeadRoutes"));
app.use("/api/admin/closed-leads", require("./routes/adminClosedLeadRoutes"));
app.use("/api/admin/transfer-leads", require("./routes/adminTransferLeadRoutes"));
app.use("/api/admin/transferred-leads", require("./routes/adminTransferredLeadRoutes"));
app.use("/api/admin/analytics", require("./routes/adminAnalyticsRoutes"));
app.use("/api/admin/net-conversion", require("./routes/adminNetConversionRoutes"));
app.use("/api/telecaller/free-leads", require("./routes/telecallerFreeLeadRoutes"));
app.use("/api/telecaller/transferred-leads", require("./routes/telecallerTransferredLeadRoutes"));
app.use("/api/search", require("./routes/searchRoutes"));
app.use("/api/admin/greetings", require("./routes/adminGreetingRoutes"));
app.use("/api/telecaller/greetings", require("./routes/telecallerGreetingRoutes"));
app.use("/api/interakt", require("./routes/interaktRoutes"));
app.use("/api/whatsapp-center", require("./routes/whatsappCenterRoutes"));

// Health Route
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "API running",
    database: process.env.DB_NAME || "lead_db"
  });
});

// Debug DB Counts Route (Safe for admin/dev)
app.get("/api/debug/db-counts", async (req, res) => {
  try {
    const [telecallers] = await db.query("SELECT COUNT(*) as count FROM telecaller_master");
    const [working_sheet] = await db.query("SELECT COUNT(*) as count FROM working_sheet");
    const [new_leads] = await db.query("SELECT COUNT(*) as count FROM new_leads");
    const [direct_leads] = await db.query("SELECT COUNT(*) as count FROM direct_leads");
    const [callpulse_logs] = await db.query("SELECT COUNT(*) as count FROM callpulse_call_logs");
    
    res.json({
      telecallers: telecallers[0].count,
      working_sheet: working_sheet[0].count,
      new_leads: new_leads[0].count,
      direct_leads: direct_leads[0].count,
      callpulse_logs: callpulse_logs[0].count,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch counts" });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal server error" });
});

const PORT = process.env.PORT || 5055;

// Function to seed default admin
async function seedAdmin() {
  try {
    const [admins] = await db.query("SELECT * FROM admin_users LIMIT 1");
    if (admins.length === 0) {
      console.log("No admin found. Creating default admin...");
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await db.query(
        "INSERT INTO admin_users (username, password_hash, role) VALUES (?, ?, ?)",
        ["admin", hashedPassword, "superadmin"]
      );
      console.log("✅ Default admin created (admin / admin123)");
    }
  } catch (error) {
    console.error("❌ Failed to seed admin:", error.message);
  }
}

app.listen(PORT, async () => {
  await seedAdmin();
  console.log(`Server running on port ${PORT}`);
  
  if (process.env.WHATSAPP_QUEUE_PROCESSOR_ENABLED === 'true') {
    console.log("[WhatsApp Queue] Automatic processor enabled.");
    startWhatsAppQueueProcessor();
  } else {
    console.log("[WhatsApp Queue] Automatic processor disabled by environment configuration.");
  }

  if (process.env.WHATSAPP_AUTOMATION_PROCESSOR_ENABLED === 'true') {
    console.log("[Automation Queue] Automatic processor enabled.");
    const intervalSecs = parseInt(process.env.WHATSAPP_AUTOMATION_PROCESSOR_INTERVAL_SECONDS) || 30;
    automationInterval = setInterval(async () => {
        await processAutomationQueue();
        await processRecurringBroadcasts();
    }, intervalSecs * 1000);
  }
});

// Graceful shutdown handling
const gracefulShutdown = () => {
    console.log("Shutting down safely...");
    stopWhatsAppQueueProcessor();
    if (automationInterval) clearInterval(automationInterval);
    process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
