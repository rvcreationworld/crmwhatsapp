const db = require('../config/db');

exports.createGreeting = async (req, res) => {
  try {
    const { title, message, duration_hours } = req.body;
    
    if (!message || !duration_hours) {
      return res.status(400).json({ success: false, message: 'Message and duration_hours are required.' });
    }
    
    const duration = parseInt(duration_hours, 10);
    if (isNaN(duration) || duration < 1 || duration > 168) {
      return res.status(400).json({ success: false, message: 'duration_hours must be between 1 and 168.' });
    }

    const adminId = req.user?.id || null;

    // Deactivate old active greetings that haven't expired yet
    await db.query(`
      UPDATE dashboard_greetings 
      SET is_active = 0 
      WHERE is_active = 1 AND expires_at > NOW()
    `);

    // Insert new greeting
    const insertQuery = `
      INSERT INTO dashboard_greetings (title, message, created_by_admin_id, starts_at, expires_at, is_active)
      VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? HOUR), 1)
    `;
    await db.query(insertQuery, [title || null, message, adminId, duration]);

    res.json({ success: true, message: 'Greeting published successfully!' });
  } catch (error) {
    console.error('Error in createGreeting:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getGreetings = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT * FROM dashboard_greetings
      ORDER BY id DESC
    `);
    res.json({ success: true, greetings: rows });
  } catch (error) {
    console.error('Error in getGreetings:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getActiveGreeting = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT * FROM dashboard_greetings
      WHERE is_active = 1 AND starts_at <= NOW() AND expires_at > NOW()
      ORDER BY id DESC
      LIMIT 1
    `);
    res.json({ success: true, greeting: rows[0] || null });
  } catch (error) {
    console.error('Error in getActiveGreeting:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deactivateGreeting = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(`UPDATE dashboard_greetings SET is_active = 0 WHERE id = ?`, [id]);
    res.json({ success: true, message: 'Greeting deactivated successfully.' });
  } catch (error) {
    console.error('Error in deactivateGreeting:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
