function parseCampaignTimeToMysqlDatetime(rawValue) {
  if (!rawValue) return null;

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) {
    console.warn("[CampaignTime] Invalid raw date:", rawValue);
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

console.log(parseCampaignTimeToMysqlDatetime('2026-06-21T13:30:18-05:00'));
console.log(parseCampaignTimeToMysqlDatetime('2026-06-15T13:36:25-05:00'));
