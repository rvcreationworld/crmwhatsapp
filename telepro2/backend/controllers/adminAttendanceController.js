const db = require('../config/db');

function getTodayIST() {
  const d = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(d);
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  return `${year}-${month}-${day}`;
}

function formatDateIST(dateObj) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(dateObj);
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  return `${year}-${month}-${day}`;
}

function getDaysInMonth(year, monthNum) {
  return new Date(year, monthNum, 0).getDate();
}

exports.getTelecallers = async (req, res) => {
  try {
    const query = `
      SELECT id, telecaller_name, tele_mobile 
      FROM telecaller_master 
      WHERE is_active = 1 AND (is_deleted = 0 OR is_deleted IS NULL)
      ORDER BY telecaller_name ASC
    `;
    const [telecallers] = await db.query(query);
    res.json({ success: true, telecallers });
  } catch (error) {
    console.error('[Attendance] Error fetching telecallers:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getAttendance = async (req, res) => {
  try {
    const { telecallerId } = req.params;
    const { month } = req.query; // YYYY-MM

    if (!telecallerId || !month) {
      return res.status(400).json({ success: false, message: 'telecallerId and month (YYYY-MM) are required' });
    }

    const [telecallerData] = await db.query(
      `SELECT id, telecaller_name, tele_mobile FROM telecaller_master WHERE id = ?`,
      [telecallerId]
    );

    if (telecallerData.length === 0) {
      return res.status(404).json({ success: false, message: 'Telecaller not found' });
    }

    const telecaller = telecallerData[0];

    const todayStr = getTodayIST();

    const year = parseInt(month.split('-')[0]);
    const monthNum = parseInt(month.split('-')[1]);
    
    const monthStart = `${month}-01`;
    let nextMonthYear = year;
    let nextMonthNum = monthNum + 1;
    if (nextMonthNum > 12) {
      nextMonthNum = 1;
      nextMonthYear++;
    }
    const monthEnd = `${nextMonthYear}-${String(nextMonthNum).padStart(2, '0')}-01`;

    const query = `
      SELECT 
        DATE(call_started_at) as call_date,
        COUNT(DISTINCT NULLIF(normalized_number, '')) as unique_call_count,
        COALESCE(SUM(duration_seconds), 0) as total_duration_seconds
      FROM callpulse_call_logs
      WHERE telecaller_id = ?
        AND call_started_at >= ?
        AND call_started_at < ?
        AND call_type IN ('OUTGOING', 'INCOMING')
      GROUP BY DATE(call_started_at)
    `;

    const [logs] = await db.query(query, [telecallerId, monthStart, monthEnd]);
    const logsByDate = {};
    logs.forEach(log => {
      const dateStr = log.call_date instanceof Date ? formatDateIST(log.call_date) : log.call_date.split('T')[0];
      logsByDate[dateStr] = {
        unique_call_count: Number(log.unique_call_count) || 0,
        total_duration_seconds: Number(log.total_duration_seconds) || 0
      };
    });

    const daysInMonth = getDaysInMonth(year, monthNum);
    const days = [];
    
    let summary = {
      full_days: 0,
      half_days: 0,
      not_working_days: 0,
      total_working_days: 0,
      required_unique_calls: 20,
      required_duration_minutes: 30
    };

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${month}-${String(i).padStart(2, '0')}`;
      const logData = logsByDate[dateStr] || { unique_call_count: 0, total_duration_seconds: 0 };
      const { unique_call_count, total_duration_seconds } = logData;

      let attendance_status = 'NOT_WORKING';
      let color = 'red';

      if (dateStr > todayStr) {
        attendance_status = 'FUTURE';
        color = 'grey';
      } else {
        if (unique_call_count >= 20 && total_duration_seconds >= 1800) {
          attendance_status = 'FULL_DAY';
          color = 'green';
          summary.full_days++;
        } else if (unique_call_count > 0 || total_duration_seconds > 0) {
          attendance_status = 'HALF_DAY';
          color = 'blue';
          summary.half_days++;
        } else {
          attendance_status = 'NOT_WORKING';
          color = 'red';
          summary.not_working_days++;
        }
      }

      let total_duration_label = '0m';
      if (total_duration_seconds > 0) {
        const mins = Math.floor(total_duration_seconds / 60);
        const secs = total_duration_seconds % 60;
        total_duration_label = secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
      }

      days.push({
        date: dateStr,
        day: i,
        unique_call_count,
        total_duration_seconds,
        total_duration_label,
        attendance_status,
        color
      });
    }

    summary.total_working_days = summary.full_days + (summary.half_days * 0.5);

    res.json({
      success: true,
      telecaller,
      month,
      summary,
      days
    });

  } catch (error) {
    console.error('[Attendance] Error fetching telecaller attendance:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
exports.getDailyAttendance = async (req, res) => {
  try {
    const { date } = req.query; // YYYY-MM-DD
    if (!date) {
      return res.status(400).json({ success: false, message: 'date is required' });
    }

    const query = `
      SELECT t.id as telecaller_id, t.telecaller_name, t.tele_mobile, 
             a.attendance_status, a.remark
      FROM telecaller_master t
      LEFT JOIN telecaller_attendance a 
        ON t.id = a.telecaller_id AND a.attendance_date = ?
      WHERE t.is_active = 1 AND (t.is_deleted = 0 OR t.is_deleted IS NULL)
      ORDER BY t.telecaller_name ASC
    `;
    
    const [telecallers] = await db.query(query, [date]);
    res.json({ success: true, telecallers });
  } catch (error) {
    console.error('[Attendance] Error fetching daily attendance:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.saveDailyAttendance = async (req, res) => {
  try {
    const { date, records } = req.body;
    const adminId = req.user.id; // From authMiddleware

    if (!date || !Array.isArray(records)) {
      return res.status(400).json({ success: false, message: 'Invalid data format' });
    }

    if (records.length === 0) {
      return res.json({ success: true, message: 'No records to save' });
    }

    // Prepare data for bulk insert
    const values = records.map(r => [
      r.telecaller_id, 
      date, 
      r.attendance_status, 
      r.remark || '', 
      adminId
    ]);

    const query = `
      INSERT INTO telecaller_attendance 
      (telecaller_id, attendance_date, attendance_status, remark, marked_by_admin_id) 
      VALUES ?
      ON DUPLICATE KEY UPDATE 
      attendance_status = VALUES(attendance_status),
      remark = VALUES(remark),
      marked_by_admin_id = VALUES(marked_by_admin_id)
    `;

    await db.query(query, [values]);

    res.json({ success: true, message: 'Attendance saved successfully' });
  } catch (error) {
    console.error('[Attendance] Error saving daily attendance:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getManualAttendance = async (req, res) => {
  try {
    const { telecallerId } = req.params;
    const { month } = req.query; // YYYY-MM

    if (!telecallerId || !month) {
      return res.status(400).json({ success: false, message: 'telecallerId and month (YYYY-MM) are required' });
    }

    const year = parseInt(month.split('-')[0]);
    const monthNum = parseInt(month.split('-')[1]);
    
    const monthStart = `${month}-01`;
    let nextMonthYear = year;
    let nextMonthNum = monthNum + 1;
    if (nextMonthNum > 12) {
      nextMonthNum = 1;
      nextMonthYear++;
    }
    const monthEnd = `${nextMonthYear}-${String(nextMonthNum).padStart(2, '0')}-01`;

    const query = `
      SELECT attendance_date, attendance_status, remark 
      FROM telecaller_attendance 
      WHERE telecaller_id = ? 
      AND attendance_date >= ? 
      AND attendance_date < ?
    `;

    const [records] = await db.query(query, [telecallerId, monthStart, monthEnd]);

    const attendanceByDate = {};
    records.forEach(r => {
      // Formats Date object to YYYY-MM-DD reliably assuming it's returned correctly by DB driver, or string.
      const dateStr = r.attendance_date instanceof Date ? formatDateIST(r.attendance_date) : r.attendance_date.split('T')[0];
      attendanceByDate[dateStr] = {
        status: r.attendance_status,
        remark: r.remark
      };
    });

    const daysInMonth = getDaysInMonth(year, monthNum);
    const days = [];
    const todayStr = getTodayIST();
    
    let summary = {
      full_days: 0,
      half_days: 0,
      not_working_days: 0
    };

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${month}-${String(i).padStart(2, '0')}`;
      const record = attendanceByDate[dateStr];
      
      let attendance_status = record ? record.status : 'UNMARKED';
      let color = 'grey'; // Default un-marked color

      if (attendance_status === 'FULL_DAY') {
        color = 'green';
        summary.full_days++;
      } else if (attendance_status === 'HALF_DAY') {
        color = 'blue';
        summary.half_days++;
      } else if (attendance_status === 'NOT_WORKING') {
        color = 'red';
        summary.not_working_days++;
      }

      if (dateStr > todayStr && attendance_status === 'UNMARKED') {
        attendance_status = 'FUTURE';
      }

      days.push({
        date: dateStr,
        day: i,
        status: attendance_status,
        color,
        remark: record ? record.remark : ''
      });
    }

    res.json({
      success: true,
      month,
      summary,
      days
    });

  } catch (error) {
    console.error('[Attendance] Error fetching manual attendance:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
