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
} from "../controllers/event.controller.js";
import validateBody from "../middlewares/validateBody.middleware.js";
import {
  eventRegisterSchema,
  eventUpdateSchema,
  updateEventStatusSchema,
} from "../utils/schemaValidation.js";

const router = Router();

router.use(verifyJWT);

router
  .route("/register")
  .post(
    upload.single("image"),
    validateBody(eventRegisterSchema),
    registerEvent
  );

// CRUD operations by ID (generic)
router
  .route("/:eventId")
  .delete(deleteEvent)
  .get(getEventDetailById)
  .put(upload.single("image"), validateBody(eventUpdateSchema), updateEvent);

router
  .route("/:eventId/status")
  .patch(validateBody(updateEventStatusSchema), updateEventStatus);
// Get events by admin
router.route("/all").get(getAllEventByAdmin);

export default router;
