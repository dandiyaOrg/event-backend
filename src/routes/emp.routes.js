import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  createEmployee,
  updateEmployee,
  getAllEmployee,
  deleteEmployee,
  toggleEmployeeStatus,
  loginEmployee,
  scanIssuedPass,
} from "../controllers/employee.controller.js";
import validateBody from "../middlewares/validateBody.middleware.js";
import {
  employeeRegisterSchema,
  employeeUpdateSchema,
  scanPassSchema,
} from "../utils/schemaValidation.js";
const router = Router();

router.route("/").get(verifyJWT, getAllEmployee);

router
  .route("/register")
  .post(validateBody(employeeRegisterSchema), verifyJWT, createEmployee);

router.route("/login").post(loginEmployee);
router.route("/toggleStatus/:employeeId").post(verifyJWT, toggleEmployeeStatus);
router.route("/scanpass", validateBody(scanPassSchema), scanIssuedPass);
router
  .route("/:employeeId")
  .put(validateBody(employeeUpdateSchema), verifyJWT, updateEmployee)
  .delete(verifyJWT, deleteEmployee);
export default router;
