const db = require('../config/db');

exports.getActiveGreeting = async (req, res) => {
  try {
    const telecallerId = req.user?.id;
    if (!telecallerId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Get the active greeting
    const [greetings] = await db.query(`
      SELECT * FROM dashboard_greetings
      WHERE is_active = 1 AND starts_at <= NOW() AND expires_at > NOW()
      ORDER BY id DESC
      LIMIT 1
    `);

    if (greetings.length === 0) {
      return res.json({ success: true, greeting: null });
    }

    const greeting = greetings[0];

    // Check if the telecaller has seen this greeting
    const [views] = await db.query(`
      SELECT animation_seen FROM dashboard_greeting_views
      WHERE greeting_id = ? AND telecaller_id = ?
    `, [greeting.id, telecallerId]);

    greeting.already_seen = views.length > 0 && views[0].animation_seen === 1;

    res.json({ success: true, greeting });
  } catch (error) {
    console.error('Error in telecaller getActiveGreeting:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.markGreetingSeen = async (req, res) => {
  try {
    const telecallerId = req.user?.id;
    const { id: greetingId } = req.params;

    if (!telecallerId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Insert ignore to prevent duplicate key errors, or ON DUPLICATE KEY UPDATE
    await db.query(`
      INSERT INTO dashboard_greeting_views (greeting_id, telecaller_id, first_seen_at, animation_seen)
      VALUES (?, ?, NOW(), 1)
      ON DUPLICATE KEY UPDATE animation_seen = 1
    `, [greetingId, telecallerId]);

    res.json({ success: true, message: 'Greeting marked as seen' });
  } catch (error) {
    console.error('Error in markGreetingSeen:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
