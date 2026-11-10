const getDateRanges = () => {
  const now = new Date();
  
  // Current month
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Past month
  const pastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const pastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const formatDate = (date) => {
    // Return YYYY-MM-DD HH:mm:ss for MySQL
    return date.toISOString().slice(0, 19).replace('T', ' ');
  };

  return {
    current_month: {
      start: formatDate(currentMonthStart),
      end: formatDate(currentMonthEnd)
    },
    past_month: {
      start: formatDate(pastMonthStart),
      end: formatDate(pastMonthEnd)
    },
    old: {
      end: formatDate(pastMonthStart) // strictly < pastMonthStart
    }
  };
};

const applyTimeBlockFilter = (query, params, timeBlock, dateColumn = 'created_at') => {
  let newQuery = query;
  
  if (timeBlock === 'current_month') {
    newQuery += ` AND YEAR(${dateColumn}) = YEAR(CURDATE()) AND MONTH(${dateColumn}) = MONTH(CURDATE())`;
  } else if (timeBlock === 'past_month') {
    newQuery += ` AND ${dateColumn} >= DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01') AND ${dateColumn} < DATE_FORMAT(CURDATE(), '%Y-%m-01')`;
  } else if (timeBlock === 'old') {
    newQuery += ` AND ${dateColumn} < DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01')`;
  }

  return { query: newQuery, params };
};

function convertSheetTimestampToIstMysql(timestamp) {
  if (!timestamp) return null;

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    console.warn("[CampaignTime] Invalid raw date:", timestamp);
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);

  const get = (type) => parts.find((p) => p.type === type)?.value;

  let year = get("year");
  let month = get("month");
  let day = get("day");
  let hour = get("hour");
  const minute = get("minute");
  const second = get("second");

  if (hour === "24") {
    hour = "00";

    const localDate = new Date(Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day)
    ));

    localDate.setUTCDate(localDate.getUTCDate() + 1);

    year = String(localDate.getUTCFullYear());
    month = String(localDate.getUTCMonth() + 1).padStart(2, "0");
    day = String(localDate.getUTCDate()).padStart(2, "0");
  }

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

module.exports = {
  getDateRanges,
  applyTimeBlockFilter,
  convertSheetTimestampToIstMysql
};
