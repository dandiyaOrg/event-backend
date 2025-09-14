import cron from "node-cron";
import prisma from "../db/config.js";

const scheduleTask = cron.schedule("0 * * * *", async () => {
  try {
    console.log("Running job cron to update event status....");
    const now = new Date();
    const result = await prisma.event.updateMany({
      where: {
        endDate: {
          lt: now,
        },
        status: "ACTIVE",
      },
      data: {
        status: "COMPLETED",
      },
    });
    console.log(`Updated ${result.count} event(s) to COMPLETED status.`);
  } catch (err) {
    console.log("Error in scheduling task");
    console.log(err);
  }
});
export default scheduleTask;
