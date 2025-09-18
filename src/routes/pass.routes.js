import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";

import {
  createNewPass,
  deletePass,
  updatePass,
  getPassById,
  getAllPassForSubevent,
} from "../controllers/pass.controller.js";

import validateBody from "../middlewares/validateBody.middleware.js";
import { createPass, updatePassvalidation } from "../utils/schemaValidation.js";

const router = Router();

router.use(verifyJWT);

router.route("/create").post(validateBody(createPass), createNewPass);

router
  .route("/:passId")
    .delete(deletePass)
    .get(getPassById)
    .put(validateBody(updatePassvalidation), updatePass);

router.route("/subevent/:subeventId").get(getAllPassForSubevent);

export default router;