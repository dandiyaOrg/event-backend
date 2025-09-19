import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

import {
  createSubEvent,
  UpdateSubevent,
  deleteSubEvent,
  getAllSubeventOfEvent,
  getSubEventById,
} from "../controllers/subevent.controller.js";
import validateBody from "../middlewares/validateBody.middleware.js";
import {
  updateSubEventSchema,
  subEventSchema,
} from "../utils/schemaValidation.js";

const router = Router();

router.use(verifyJWT);

router.route("/event/:eventId").get(getAllSubeventOfEvent);
router
  .route("/register")
  .post(upload.single("image"), validateBody(subEventSchema), createSubEvent);

// there shouldn't be any option to delete subevent when event is active
router
  .route("/:subeventId")
  .get(getSubEventById)
  .put(
    upload.single("image"),
    validateBody(updateSubEventSchema),
    UpdateSubevent
  )
  .delete(deleteSubEvent);

export default router;
