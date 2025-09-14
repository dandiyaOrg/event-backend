import { Router } from "express";
import {
  getAllEvents,
  userEventRegistration,
  getEventById,
} from "../controllers/event.user.controller.js";

const router = Router();

router.route("/").get(getAllEvents);
router
  .route("/:eventId")
  .get(getEventById)
  .post(userEventRegistration)
  .put(userEventRegistration);

export default router;
