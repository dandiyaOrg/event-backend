import { formatInTimeZone, format, toZonedTime } from "date-fns-tz";
import { parseISO } from "date-fns";

const convertDateToIST = (date) =>
  formatInTimeZone(date, "Asia/Kolkata", "yyyy-MM-dd HH:mm");

const formatDateTime = (date) => {
  const d = typeof date === "string" ? parseISO(date) : date;
  const zoned = toZonedTime(d, "Asia/Kolkata");
  return format(zoned, "yyyy-MM-dd HH:mm:ss.SSSXXX");
};

export { convertDateToIST, formatDateTime };
