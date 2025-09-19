import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";

import {
  createNewPass,
  deletePass,
  updatePass,
  getPassById,
  getAllPassForSubevent,
  togglePass,
} from "../controllers/pass.controller.js";

import validateBody from "../middlewares/validateBody.middleware.js";
import { createPass, updatePassvalidation } from "../utils/schemaValidation.js";

const router = Router();

router.use(verifyJWT);

router.route("/create").post(validateBody(createPass), createNewPass);

router.route("/subevent/:subeventId").get(getAllPassForSubevent);

router.route("/toggle/:passId").patch(togglePass);
// delete api should not be use in frontend for pass
router
  .route("/:passId")
  .delete(deletePass)
  .get(getPassById)
  .patch(validateBody(updatePassvalidation), updatePass);

export default router;
