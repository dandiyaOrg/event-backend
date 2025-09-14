import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { registerEvent } from "../controllers/event.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();
router.use(verifyJWT);

router.route("/register").post(upload.single("design"), registerEvent);
// router.route("/:id").get(getEventDetails).delete(deleteEvent).put(updateEvent);
// router.route("/").get(getAllCreatedEvents);
// router.route("/users/:eventId").get(getAllEventRegsiteredUser);
export default router;
