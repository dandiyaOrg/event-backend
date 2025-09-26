import { formatInTimeZone, format, toZonedTime } from "date-fns-tz";
import { parseISO } from "date-fns";

const indiaTZ = "Asia/Kolkata";
const convertDateToIST = (date) =>
  formatInTimeZone(date, indiaTZ, "yyyy-MM-dd HH:mm");

const formatDateTime = (date) => {
  const d = typeof date === "string" ? parseISO(date) : date;
  const zoned = toZonedTime(d, indiaTZ);
  return format(zoned, "yyyy-MM-dd HH:mm:ss.SSSXXX");
};

const convertToDateOnlyIST = (date) => {
  const d = typeof date === "string" ? parseISO(date) : date;
  const zoned = toZonedTime(d, indiaTZ);
  return format(zoned, "yyyy-MM-dd", { timeZone: indiaTZ });
};
const getDateIST = (date) => {
  const d = typeof date === "string" ? parseISO(date) : date;
  return toZonedTime(d, indiaTZ);
};

function toDate(date) {
  // accept Date or ISO string
  if (date instanceof Date) return date;
  if (!date) return null;
  return typeof date === "string" ? parseISO(date) : new Date(date);
}
const formatExpiryForEmail = (date, opts = {}) => {
  const d = toDate(date);
  if (!d) return "";
  // default format: readable + short month + 12h clock + IST label
  const formatStr = opts.format || "dd MMM yyyy, hh:mm a 'IST'";
  return formatInTimeZone(d, indiaTZ, formatStr);
};

export {
  convertDateToIST,
  formatDateTime,
  convertToDateOnlyIST,
  getDateIST,
  formatExpiryForEmail,
};
