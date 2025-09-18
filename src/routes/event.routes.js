import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  registerEvent,
  deleteEvent,
  getEventDetailById,
  updateEvent,
  getAllEventByAdmin,
  updateEventStatus,
  getAllSubeventsWithPasses,
} from "../controllers/event.controller.js";
import validateBody from "../middlewares/validateBody.middleware.js";
import {
  eventRegisterSchema,
  eventUpdateSchema,
  updateEventStatusSchema,
} from "../utils/schemaValidation.js";

const router = Router();

router.route("/:eventId/subevents").post(getAllSubeventsWithPasses);

router.use(verifyJWT);

router
  .route("/register")
  .post(
    upload.single("image"),
    validateBody(eventRegisterSchema),
    registerEvent
  );
// Get events by admin
router.route("/all").get(getAllEventByAdmin);  
// CRUD operations by ID (generic)
router
  .route("/:eventId")
  .delete(deleteEvent)
  .get(getEventDetailById)
  .put(upload.single("image"), validateBody(eventUpdateSchema), updateEvent);

router
  .route("/:eventId/status")
  .patch(validateBody(updateEventStatusSchema), updateEventStatus);

export default router;
