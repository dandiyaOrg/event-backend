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
export { convertDateToIST, formatDateTime, convertToDateOnlyIST };
