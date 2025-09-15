import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {registerEvent,deleteEvent,getEventDetailById,updateEvent,getAllCreatedEvents,getAllEventByAdmin,filterEventData,FilterByTypeOfEvents} from '../controllers/event.controller.js';

import {createSubEvent,UpdatetheSubevent,deleteSubEvent,getAllSubeventOfEvent,getSubEventById,filterSubEvents} from '../controllers/subevent.controller.js';

import {CreateThePass, DeleteThePass ,  UpdateThePass} from '../controllers/pass.controller.js';



const router = Router();



// router.use(verifyJWT);

// router.route("/register").post(upload.single("design"), registerEvent);
router.route("/register").post(registerEvent);

// Filter events by name
router.route("/filter").get(filterEventData);

// Filter events by type
router.route("/type").get(FilterByTypeOfEvents);

// CRUD operations by ID (generic)
router.route("/:id")
  .delete(deleteEvent)
  .get(getEventDetailById)
  .put(updateEvent);

// Get all events
router.route("/").get(getAllCreatedEvents);

// Get events by admin
router.route("/users/:admin_id").get(getAllEventByAdmin);


// sub event routers

router.route('/:eventId/subevent/registersubevent').post(createSubEvent);
router.route('/:eventId/subevent/:id').delete(deleteSubEvent);
router.route('/:eventId/subevent/getAllSubeventOfEvent').get(getAllSubeventOfEvent); // id of that event 
router.route('/:eventId/subevent/getSubEventById/:id').get(getSubEventById);
router.route('/:eventId/subevent/filterSubEvents').get(filterSubEvents);
router.route('/:eventId/subevent/:subEventId').patch(UpdatetheSubevent);



// pass routers


router.route('/:eventId/subevent/:subeventId/Pass/CreatePass').post(CreateThePass);
router.route('/:eventId/subevent/:subeventId/Pass/:passId').delete(DeleteThePass);
router.route('/:eventId/subevent/:subeventId/Pass/:passId').put(UpdateThePass);

export default router;
