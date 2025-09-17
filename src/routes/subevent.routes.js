import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

import {
  createSubEvent,
  UpdateSubevent,
  deleteSubEvent,
  getAllSubeventOfEvent,
  getSubEventById,
  filterSubEvents,
} from "../controllers/subevent.controller.js";
import validateBody from "../middlewares/validateBody.middleware.js";
import {
  updateSubEventSchema,
  subEventSchema,
} from "../utils/schemaValidation.js";

const router = Router();

router.use(verifyJWT);

router.route("/getAllSubeventOfEvent").get(getAllSubeventOfEvent);
router
  .route("/registersubevent")
  .post(validateBody(subEventSchema), upload.single("image"), createSubEvent);
router.route(`/searchSubEvents?query=${query}`).get(filterSubEvents);
router
  .route("/:subeventId")
  .get(getSubEventById)
  .put(validateBody(updateSubEventSchema), UpdateSubevent)
  .delete(deleteSubEvent);

export default router;
