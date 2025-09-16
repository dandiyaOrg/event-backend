import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {createSubEvent,deleteSubEvent,getAllSubeventOfEvent} from '../controllers/subevent.controller.js';
const router = Router();

router.route('/registersubevent').post(createSubEvent);
router.route('/:id').delete(deleteSubEvent);
router.route('/getAllSubeventOfEvent').get(getAllSubeventOfEvent);
export default router;