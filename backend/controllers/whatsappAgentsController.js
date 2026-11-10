const db = require("../config/db");

exports.getAgents = async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT id, telecaller_name, tele_mobile, is_active, interakt_agent_email, interakt_agent_status, interakt_last_verified_at FROM telecaller_master WHERE is_deleted = 0 ORDER BY CAST(SUBSTRING(SUBSTRING_INDEX(telecaller_name, ' ', 1), 2) AS UNSIGNED) ASC"
        );
        res.status(200).json({ success: true, agents: rows });
    } catch (error) {
        console.error("GET INTERAKT AGENTS ERROR:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.updateAgent = async (req, res) => {
    try {
        const { id } = req.params;
        const { interakt_agent_email, interakt_agent_status } = req.body;

        let finalEmail = interakt_agent_email ? interakt_agent_email.trim().toLowerCase() : null;
        let finalStatus = interakt_agent_status || 'NOT_REGISTERED';

        if (finalStatus === 'ACTIVE' && !finalEmail) {
            return res.status(400).json({ success: false, message: "Email is mandatory when status is ACTIVE." });
        }

        if (finalEmail) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(finalEmail)) {
                return res.status(400).json({ success: false, message: "Invalid email format." });
            }

            const [emailCheck] = await db.query(
                "SELECT id FROM telecaller_master WHERE interakt_agent_email = ? AND id != ? AND is_deleted = 0",
                [finalEmail, id]
            );

            if (emailCheck.length > 0) {
                return res.status(400).json({ success: false, message: "This email is already assigned to another telecaller." });
            }
        }

        await db.query(
            "UPDATE telecaller_master SET interakt_agent_email = ?, interakt_agent_status = ? WHERE id = ?",
            [finalEmail, finalStatus, id]
        );

        res.status(200).json({ success: true, message: "Agent updated successfully" });
    } catch (error) {
        console.error("UPDATE INTERAKT AGENT ERROR:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
