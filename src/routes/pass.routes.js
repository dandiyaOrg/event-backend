import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";

import {
  createPass,
  deletePass,
  updatePass,
  getPassById,
  getAllPassForSubevent,
} from "../controllers/pass.controller.js";

import validateBody from "../middlewares/validateBody.middleware.js";
import {} from "../utils/schemaValidation.js";

const router = Router();

router.use(verifyJWT);

router.route("/create").post(validateBody(), createPass);

router
  .route("/:passId")
  .delete(deletePass)
  .get(getPassById)
  .put(validateBody(), updatePass);

router.route("/subevent/:subeventId").get(getAllPassForSubevent);

export default router;
