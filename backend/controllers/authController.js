const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const db = require("../config/db");

const generateToken = (id, username, role) => {
  return jwt.sign({ id, username, role }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
};

exports.login = async (req, res) => {
  const { username, mobile, tele_mobile, password } = req.body;
  
  let loginMobile = mobile || tele_mobile;
  let adminUsername = username;

  // The mobile app sends the telecaller's mobile number inside the 'username' key.
  if (username && !loginMobile) {
    const isNumeric = /^\+?[\d\s-]+$/.test(username);
    if (isNumeric) {
      loginMobile = username;
      adminUsername = null; // Do not attempt admin login for a mobile number
    }
  }

  console.log(`\n--- LOGIN ATTEMPT ---`);
  console.log(`Route hit: /api/auth/login`);
  console.log(`Payload keys:`, Object.keys(req.body));

  try {
    // ADMIN LOGIN BRANCH
    if (adminUsername) {
      console.log(`[DEBUG] Attempting Admin Login for username: ${adminUsername}`);
      const [admins] = await db.query("SELECT * FROM admin_users WHERE username = ?", [adminUsername]);
      if (admins.length > 0) {
        console.log(`[DEBUG] Admin user found in database.`);
        const admin = admins[0];
        const isMatch = await bcrypt.compare(password, admin.password_hash);
        console.log(`[DEBUG] Admin password match: ${isMatch}`);
        if (isMatch) {
          const token = generateToken(admin.id, admin.username, "ADMIN");
          console.log(`[DEBUG] Response status: 200 (Success) - Role: ADMIN`);
          return res.json({ token, role: "ADMIN", user: { id: admin.id, username: admin.username } });
        }
      } else {
        console.log(`[DEBUG] Admin user NOT found.`);
      }
    }

    // TELECALLER LOGIN BRANCH
    if (loginMobile) {
      console.log(`[DEBUG] Attempting Telecaller Login for mobile: ${loginMobile}`);
      
      // Normalize mobile: remove non-digits, get last 10
      const digitsOnly = loginMobile.replace(/\D/g, '');
      const phone_last10 = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;
      
      console.log(`[DEBUG] Normalized mobile (last 10): ${phone_last10}`);

      const [telecallers] = await db.query(
        "SELECT * FROM telecaller_master WHERE phone_last10 = ? OR RIGHT(REGEXP_REPLACE(tele_mobile, '[^0-9]', ''), 10) = ?", 
        [phone_last10, phone_last10]
      );

      if (telecallers.length > 0) {
        console.log(`[DEBUG] Telecaller found in database.`);
        const telecaller = telecallers[0];
        
        if (!telecaller.is_active) {
          console.log(`[DEBUG] Response status: 401 (Account disabled)`);
          return res.status(401).json({ message: "Your account is disabled." });
        }

        if (!telecaller.password_hash) {
          console.log(`[DEBUG] Response status: 401 (No password set)`);
          return res.status(401).json({ message: "Please ask admin to reset your password first." });
        }

        const isMatch = await bcrypt.compare(password, telecaller.password_hash);
        
        console.log("[TELECALLER_LOGIN_DEBUG]", {
          inputMobileLast10: phone_last10,
          foundTelecallerId: telecaller?.id,
          hasPasswordHash: !!telecaller?.password_hash,
          hashPrefix: telecaller?.password_hash?.slice(0, 4),
          hashLength: telecaller?.password_hash?.length,
          bcryptCompareResult: isMatch
        });
        
        if (isMatch) {
          const token = generateToken(telecaller.id, telecaller.telecaller_name, "TELECALLER");
          console.log(`[DEBUG] Response status: 200 (Success) - Role: TELECALLER`);
          return res.json({ 
            token, 
            role: "TELECALLER", 
            user: { 
              id: telecaller.id, 
              telecaller_name: telecaller.telecaller_name, 
              tele_mobile: telecaller.tele_mobile,
              own_campaign_enabled: telecaller.own_campaign_enabled 
            } 
          });
        }
      } else {
        console.log(`[DEBUG] Telecaller NOT found.`);
        console.log("[TELECALLER_LOGIN_DEBUG]", {
          inputMobileLast10: phone_last10,
          foundTelecallerId: null,
          hasPasswordHash: false,
          hashPrefix: null,
          hashLength: null,
          bcryptCompareResult: false
        });
      }
    }

    console.log(`[DEBUG] Response status: 401 (Invalid credentials)`);
    return res.status(401).json({ message: "Invalid credentials." });
  } catch (error) {
    console.error("[DEBUG] Login error:", error);
    console.log(`[DEBUG] Response status: 500 (Server Error)`);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getMe = async (req, res) => {
  try {
    if (req.user.role === "TELECALLER") {
      const [rows] = await db.query("SELECT own_campaign_enabled FROM telecaller_master WHERE id = ?", [req.user.id]);
      if (rows.length > 0) {
        return res.json({ user: { ...req.user, own_campaign_enabled: rows[0].own_campaign_enabled } });
      }
    }
    res.json({ user: req.user });
  } catch (err) {
    res.json({ user: req.user });
  }
};

exports.changeCredentials = async (req, res) => {
  const { currentPassword, newUsername, newPassword } = req.body;
  try {
    const adminId = req.user.id;
    
    // Fetch current admin to verify password
    const [admins] = await db.query("SELECT * FROM admin_users WHERE id = ?", [adminId]);
    if (admins.length === 0) {
      return res.status(404).json({ success: false, message: "Admin not found." });
    }
    const admin = admins[0];

    // Verify current password
    if (!currentPassword) {
      return res.status(400).json({ success: false, message: "Current password is required." });
    }
    const isMatch = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Current password is incorrect." });
    }
    
    let updateQuery = "UPDATE admin_users SET updated_at = NOW()";
    const queryParams = [];

    if (newUsername) {
      updateQuery += ", username = ?";
      queryParams.push(newUsername);
    }
    
    if (newPassword) {
      const hash = await bcrypt.hash(newPassword, 10);
      updateQuery += ", password_hash = ?";
      queryParams.push(hash);
    }

    updateQuery += " WHERE id = ?";
    queryParams.push(adminId);

    if (queryParams.length > 1) { // 1 is just the ID
      await db.query(updateQuery, queryParams);
    }

    res.json({ success: true, message: "Password changed successfully." });
  } catch (error) {
    console.error("Update credentials error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
