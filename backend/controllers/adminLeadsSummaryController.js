const db = require("../config/db");

exports.getAdminSummary = async (req, res) => {
  try {
    const { telecaller_id } = req.query;
    
    let tcFilter = "";
    let tcParams = [];
    if (telecaller_id && telecaller_id !== 'all') {
      tcFilter = " AND telecaller_id = ? ";
      tcParams.push(telecaller_id);
    }

    let tcFilterCurrent = " AND current_telecaller_id IS NOT NULL ";
    let tcFParams = [];
    if (telecaller_id && telecaller_id !== 'all') {
      tcFilterCurrent += " AND current_telecaller_id = ? ";
      tcFParams.push(telecaller_id);
    }

    // 1. Current Month Counts
    const currentBotQuery = `
      SELECT COUNT(*) as count 
      FROM working_sheet 
      WHERE YEAR(created_at) = YEAR(CURDATE()) 
      AND MONTH(created_at) = MONTH(CURDATE())
      ${tcFilter}
    `;
    const currentDirectQuery = `
      SELECT COUNT(*) as count 
      FROM direct_leads 
      WHERE YEAR(created_at) = YEAR(CURDATE()) 
      AND MONTH(created_at) = MONTH(CURDATE())
      ${tcFilter}
    `;
    const currentFreeQuery = `
      SELECT COUNT(*) as count 
      FROM free_leads 
      WHERE YEAR(COALESCE(fetched_at, moved_to_free_at, created_at)) = YEAR(CURDATE()) 
      AND MONTH(COALESCE(fetched_at, moved_to_free_at, created_at)) = MONTH(CURDATE())
      ${tcFilterCurrent}
    `;
    const currentTransferredQuery = `
      SELECT COUNT(*) as count 
      FROM transferred_leads 
      WHERE YEAR(COALESCE(transferred_at, created_at)) = YEAR(CURDATE()) 
      AND MONTH(COALESCE(transferred_at, created_at)) = MONTH(CURDATE())
      ${tcFilterCurrent}
    `;

    // 2. Past Month Counts
    const pastBotQuery = `
      SELECT COUNT(*) as count 
      FROM working_sheet 
      WHERE created_at >= DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01')
      AND created_at < DATE_FORMAT(CURDATE(), '%Y-%m-01')
      ${tcFilter}
    `;
    const pastDirectQuery = `
      SELECT COUNT(*) as count 
      FROM direct_leads 
      WHERE created_at >= DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01')
      AND created_at < DATE_FORMAT(CURDATE(), '%Y-%m-01')
      ${tcFilter}
    `;
    const pastFreeQuery = `
      SELECT COUNT(*) as count 
      FROM free_leads 
      WHERE COALESCE(fetched_at, moved_to_free_at, created_at) >= DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01')
      AND COALESCE(fetched_at, moved_to_free_at, created_at) < DATE_FORMAT(CURDATE(), '%Y-%m-01')
      ${tcFilterCurrent}
    `;
    const pastTransferredQuery = `
      SELECT COUNT(*) as count 
      FROM transferred_leads 
      WHERE COALESCE(transferred_at, created_at) >= DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01')
      AND COALESCE(transferred_at, created_at) < DATE_FORMAT(CURDATE(), '%Y-%m-01')
      ${tcFilterCurrent}
    `;

    // 3. Old Leads Counts Grouped by Year and Month
    const oldBotQuery = `
      SELECT YEAR(created_at) as year, MONTH(created_at) as month, COUNT(*) as count 
      FROM working_sheet 
      WHERE created_at < DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01')
      ${tcFilter}
      GROUP BY YEAR(created_at), MONTH(created_at)
    `;
    const oldDirectQuery = `
      SELECT YEAR(created_at) as year, MONTH(created_at) as month, COUNT(*) as count 
      FROM direct_leads 
      WHERE created_at < DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01')
      ${tcFilter}
      GROUP BY YEAR(created_at), MONTH(created_at)
    `;
    const oldFreeQuery = `
      SELECT YEAR(COALESCE(fetched_at, moved_to_free_at, created_at)) as year, MONTH(COALESCE(fetched_at, moved_to_free_at, created_at)) as month, COUNT(*) as count 
      FROM free_leads 
      WHERE COALESCE(fetched_at, moved_to_free_at, created_at) < DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01')
      ${tcFilterCurrent}
      GROUP BY YEAR(COALESCE(fetched_at, moved_to_free_at, created_at)), MONTH(COALESCE(fetched_at, moved_to_free_at, created_at))
    `;
    const oldTransferredQuery = `
      SELECT YEAR(COALESCE(transferred_at, created_at)) as year, MONTH(COALESCE(transferred_at, created_at)) as month, COUNT(*) as count 
      FROM transferred_leads 
      WHERE COALESCE(transferred_at, created_at) < DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01')
      ${tcFilterCurrent}
      GROUP BY YEAR(COALESCE(transferred_at, created_at)), MONTH(COALESCE(transferred_at, created_at))
    `;

    const [[currentBot]] = await db.query(currentBotQuery, tcParams);
    const [[currentDirect]] = await db.query(currentDirectQuery, tcParams);
    const [[currentFree]] = await db.query(currentFreeQuery, tcFParams);
    const [[currentTransferred]] = await db.query(currentTransferredQuery, tcFParams);
    
    const [[pastBot]] = await db.query(pastBotQuery, tcParams);
    const [[pastDirect]] = await db.query(pastDirectQuery, tcParams);
    const [[pastFree]] = await db.query(pastFreeQuery, tcFParams);
    const [[pastTransferred]] = await db.query(pastTransferredQuery, tcFParams);

    const [oldBotRows] = await db.query(oldBotQuery, tcParams);
    const [oldDirectRows] = await db.query(oldDirectQuery, tcParams);
    const [oldFreeRows] = await db.query(oldFreeQuery, tcFParams);
    const [oldTransferredRows] = await db.query(oldTransferredQuery, tcFParams);

    // Map old leads into a unified array
    const oldLeadsMap = {};
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const mergeOldRows = (rows, typeKey) => {
      for (let row of rows) {
        const key = `${row.year}-${row.month}`;
        if (!oldLeadsMap[key]) {
          oldLeadsMap[key] = {
            year: row.year,
            month: row.month,
            monthName: `${monthNames[row.month - 1]} ${row.year}`,
            bot: 0,
            direct: 0,
            free: 0,
            transferred: 0
          };
        }
        oldLeadsMap[key][typeKey] = row.count;
      }
    };

    mergeOldRows(oldBotRows, 'bot');
    mergeOldRows(oldDirectRows, 'direct');
    mergeOldRows(oldFreeRows, 'free');
    mergeOldRows(oldTransferredRows, 'transferred');

    const oldLeadsArray = Object.values(oldLeadsMap).sort((a, b) => {
       if (a.year !== b.year) return b.year - a.year;
       return b.month - a.month;
    });

    res.json({
      current: {
        bot: currentBot.count,
        direct: currentDirect.count,
        free: currentFree.count,
        transferred: currentTransferred.count
      },
      past: {
        bot: pastBot.count,
        direct: pastDirect.count,
        free: pastFree.count,
        transferred: pastTransferred.count
      },
      old: oldLeadsArray
    });

  } catch (error) {
    console.error("getAdminSummary error:", error);
    res.status(500).json({ message: "Server error fetching admin leads summary" });
  }
};
