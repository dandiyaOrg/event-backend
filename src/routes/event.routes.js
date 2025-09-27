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
  getGlobalPassForEvent,
} from "../controllers/event.controller.js";
import validateBody from "../middlewares/validateBody.middleware.js";
import {
  eventRegisterSchema,
  eventUpdateSchema,
  updateEventStatusSchema,
} from "../utils/schemaValidation.js";

const router = Router();

router.route("/details/subevents").post(getAllSubeventsWithPasses);
router.route("/details/global").post(getGlobalPassForEvent);

router
  .route("/register")
  .post(
    upload.single("image"),
    validateBody(eventRegisterSchema),
    verifyJWT,
    registerEvent
  );
// Get events by admin
router.route("/all").get(verifyJWT, getAllEventByAdmin);
// CRUD operations by ID (generic)
router
  .route("/:eventId")
  .delete(verifyJWT, deleteEvent)
  .get(verifyJWT, getEventDetailById)
  .put(
    upload.single("image"),
    validateBody(eventUpdateSchema),
    verifyJWT,
    updateEvent
  );

router
  .route("/:eventId/status")
  .patch(validateBody(updateEventStatusSchema), updateEventStatus);

export default router;
