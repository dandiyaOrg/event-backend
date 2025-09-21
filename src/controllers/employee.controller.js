import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Op } from "sequelize";
import {
  Employee,
  Admin,
  SubEvent,
  CheckingRecord,
  Attendee,
  IssuedPass,
  Pass,
} from "../db/models/index.js";
import { decryptPassword } from "../utils/encrypt.js";
import sendMail from "../utils/sendMail.js";
import { logger } from "../app.js";
const createEmployee = asyncHandler(async (req, res, next) => {
  try {
    const { name, mobile_no, email, password, username } = req.body;
    logger.info("Create employee request received", { name, email, username });

    if (!(name && mobile_no && email && password && username)) {
      logger.warn("Missing required fields for employee creation");
      return next(
        new ApiError(
          400,
          "Name, mobile number, email, username and password are required fields"
        )
      );
    }

    const admin_id = req.admin_id;

    // Check for existing employee
    const existingEmployee = await Employee.findOne({
      where: {
        [Op.or]: [{ email }, { mobile_no }, { username }],
      },
    });

    if (existingEmployee) {
      let msg = "";
      if (existingEmployee.email === email) msg = "Email is already registered";
      else if (existingEmployee.mobile_no === mobile_no)
        msg = "Mobile number is already registered";
      else if (existingEmployee.username === username)
        msg = "Username is already taken";

      logger.warn("Employee creation failed due to duplicate entry", { msg });
      return next(new ApiError(409, msg));
    }

    // Create new employee
    const newEmployee = await Employee.create({
      name,
      mobile_no,
      email,
      password,
      username,
      admin_id,
    });

    logger.info("Employee created successfully", { employeeId: newEmployee.employee_id });

    // Fetch admin info
    const admin = await Admin.findByPk(admin_id);
    if (!admin) {
      logger.error("Admin details not found for employee creation", { admin_id });
      return next(new ApiError(500, "Unable to find admin details"));
    }

    // Send registration email
    const decryptedpassword = decryptPassword(newEmployee.password);
    const { emailData, error } = await sendMail(
      newEmployee.email,
      "employeeRegistration",
      {
        employee: newEmployee,
        admin,
        password: decryptedpassword,
      }
    );

    if (!emailData) {
      logger.error("Failed to send employee registration email", { error });
      return next(
        new ApiError(502, "Failed to send employee registration email", error)
      );
    }

    logger.info("Employee registration email sent successfully", {
      employeeId: newEmployee.employee_id,
      emailId: emailData,
    });

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { employee: newEmployee },
          "Employee registered successfully"
        )
      );
  } catch (error) {
    logger.error("Error in createEmployee", error);
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const loginEmployee = asyncHandler(async (req, res, next) => {
  try {
    const { username, password } = req.body;
    logger.info("Employee login attempt", { username });

    if (!(username && password)) {
      logger.warn("Login failed: missing username or password");
      return next(
        new ApiError(400, "username and password fields are required")
      );
    }

    const employee = await Employee.findOne({ where: { username } });

    if (!employee) {
      logger.warn(`Login failed: employee not found with username ${username}`);
      return next(
        new ApiError(
          404,
          "Employee not found, please contact admin first for registration"
        )
      );
    }

    if (!employee.is_active) {
      logger.warn(`Login attempt for deactivated employee ${username}`);
      return next(
        new ApiError(403, "Your account is deactivated, please contact admin")
      );
    }

    const isMatch = await employee.isPasswordCorrect(password);
    if (!isMatch) {
      logger.warn(`Login failed: incorrect password for employee ${username}`);
      return next(new ApiError(401, "Incorrect credentials"));
    }

    const accessToken = employee.generateAccessToken();
    const refreshToken = employee.generateRefreshToken();

    if (!(accessToken && refreshToken)) {
      logger.error(`Token generation failed for employee ${username}`);
      return next(new ApiError(500, "Error generating tokens"));
    }

    await employee.update({ refreshToken });
    logger.info(`Employee ${username} logged in successfully`);

    res.setHeader("accessToken", accessToken);
    res.setHeader("refreshToken", refreshToken);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { employee, refreshToken, accessToken },
          "OTP Sent successfully to the Email"
        )
      );
  } catch (error) {
    logger.error("Error in loginEmployee", error);
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const updateEmployee = asyncHandler(async (req, res, next) => {
  try {
    const { name, mobile_no, email, password, username, is_active } = req.body;
    const employeeId = req.params.employeeId;

    logger.info("Update employee request received", { employeeId });

    if (!employeeId) {
      logger.warn("Employee update failed: employeeId missing in params");
      return next(new ApiError(400, "employeeId is required in params"));
    }

    // Check if all update fields are missing
    if (
      [name, mobile_no, email, password, username, is_active].every(
        (field) => field === undefined || field === null || field === ""
      )
    ) {
      logger.warn("Employee update failed: no fields provided for update");
      return next(
        new ApiError(400, "At least one field must be provided for update")
      );
    }

    const employee = await Employee.findByPk(employeeId);
    if (!employee) {
      logger.warn(`Employee not found with id ${employeeId}`);
      return next(new ApiError(404, "Employee not found"));
    }

    // Check for duplicate email, mobile, or username
    if (email || mobile_no || username) {
      const existingEmployee = await Employee.findOne({
        where: {
          [Op.or]: [
            email ? { email } : null,
            mobile_no ? { mobile_no } : null,
            username ? { username } : null,
          ].filter(Boolean),
          employee_id: { [Op.ne]: employeeId },
        },
      });

      if (existingEmployee) {
        let msg = "";
        if (existingEmployee.email === email) msg = "Email is already registered";
        else if (existingEmployee.mobile_no === mobile_no)
          msg = "Mobile number is already registered";
        else if (existingEmployee.username === username)
          msg = "Username is already taken";

        logger.warn("Employee update failed: duplicate entry", { msg });
        return next(new ApiError(409, msg));
      }
    }

    let decryptedpassword;
    if (!password) {
      decryptedpassword = decryptPassword(employee.password);
    }

    const updatedFields = [];
    if (email && email !== employee.email) updatedFields.push("email");
    if (username && username !== employee.username) updatedFields.push("username");
    if (password) updatedFields.push("password");

    // Update employee record
    const updatedEmployee = await employee.update({
      name: name ?? employee.name,
      mobile_no: mobile_no ?? employee.mobile_no,
      email: email ?? employee.email,
      username: username ?? employee.username,
      password: password ?? decryptedpassword,
      is_active: is_active ?? employee.is_active,
    });

    logger.info("Employee updated successfully", { employeeId, updatedFields });

    // Send email if credentials changed
    if (updatedFields.length > 0) {
      const admin_id = req.admin_id;
      const admin = await Admin.findByPk(admin_id);
      if (!admin) {
        logger.error("Admin details not found for credentials update", { admin_id });
        return next(new ApiError(500, "Unable to find admin details"));
      }

      const { emailData, error } = await sendMail(
        updatedEmployee.email,
        "employeeCredentialsUpdate",
        {
          employee: updatedEmployee,
          updatedFields,
          admin,
          password: decryptedpassword ?? "",
        }
      );

      if (!emailData || !emailData.id) {
        logger.error("Failed to send credentials update email", { error });
        return next(
          new ApiError(502, "Failed to send credentials update email", error)
        );
      }

      logger.info("Credentials update email sent successfully", { employeeId });
    }

    return res.status(201).json(
      new ApiResponse(
        201,
        { employee: updatedEmployee },
        "Employee updated successfully"
      )
    );
  } catch (error) {
    logger.error("Error in updateEmployee", error);
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const getAllEmployee = asyncHandler(async (req, res, next) => {
  try {
    const admin_id = req.admin_id;
    const page = parseInt(req.query.page) || 1;
    const limit = 25;
    const offset = (page - 1) * limit;

    logger.info("Fetching employees", { admin_id, page });

    const { count, rows: employees } = await Employee.findAndCountAll({
      where: { admin_id },
      limit,
      offset,
      order: [["created_at", "DESC"]],
    });

    logger.info(`Fetched ${employees.length} employees out of total ${count}`);

    const employeeList = employees.map((emp) => ({
      employee_id: emp.employee_id,
      name: emp.name,
      mobile_no: emp.mobile_no,
      email: emp.email,
      username: emp.username,
      is_active: emp.is_active,
      password: emp.password,
      admin_id: emp.admin_id,
    }));

    const totalPages = Math.ceil(count / limit);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          employees: employeeList,
          pagination: {
            totalEmployees: count,
            currentPage: page,
            totalPages,
            perPage: limit,
          },
        },
        "Employees fetched successfully"
      )
    );
  } catch (error) {
    logger.error("Error fetching employees", error);
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const deleteEmployee = asyncHandler(async (req, res, next) => {
  try {
    const employeeId = req.params.employeeId;

    logger.info("Delete employee request received", { employeeId });

    if (!employeeId) {
      logger.warn("Delete failed: employeeId missing in params");
      return next(new ApiError(400, "employeeId is required in params"));
    }

    const employee = await Employee.findByPk(employeeId);
    if (!employee) {
      logger.warn(`Delete failed: employee not found with id ${employeeId}`);
      return next(new ApiError(404, "Employee not found"));
    }

    await employee.destroy();
    logger.info(`Employee deleted successfully`, { employeeId });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { employee: employeeId },
          `Employee with id ${employeeId} deleted successfully`
        )
      );
  } catch (error) {
    logger.error("Error in deleteEmployee", error);
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const toggleEmployeeStatus = asyncHandler(async (req, res, next) => {
  try {
    const employeeId = req.params.employeeId;
    logger.info("Toggle employee status request received", { employeeId });

    if (!employeeId) {
      logger.warn("Toggle failed: employeeId missing in params");
      return next(new ApiError(400, "employeeId is required in params"));
    }

    const employee = await Employee.findByPk(employeeId);
    if (!employee) {
      logger.warn(`Toggle failed: employee not found with id ${employeeId}`);
      return next(new ApiError(404, "Employee not found"));
    }

    const updatedemployee = await employee.update({
      is_active: employee.is_active ? false : true,
    });

    logger.info(`Employee status toggled successfully`, {
      employeeId,
      newStatus: updatedemployee.is_active,
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        { employee: updatedemployee },
        "Employee status has been updated successfully"
      )
    );
  } catch (error) {
    logger.error("Error in toggleEmployeeStatus", error);
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const scanIssuedPass = asyncHandler(async (req, res, next) => {
  try {
    const { employee_id, subevent_id, attendee_id } = req.body;
    logger.info("Scan issued pass request received", { employee_id, subevent_id, attendee_id });

    // Validate subevent existence and date (must be today)
    const subevent = await SubEvent.findByPk(subevent_id);
    if (!subevent) {
      logger.warn(`SubEvent not found: ${subevent_id}`);
      return next(new ApiError(404, `SubEvent ${subevent_id} not found`));
    }

    const today = new Date();
    const subeventDate = new Date(subevent.date);
    if (
      subeventDate.getFullYear() !== today.getFullYear() ||
      subeventDate.getMonth() !== today.getMonth() ||
      subeventDate.getDate() !== today.getDate()
    ) {
      logger.warn(`SubEvent ${subevent_id} is not scheduled for today`);
      return next(new ApiError(400, "The subevent is not scheduled for today"));
    }

    // Verify employee exists and is active
    const employee = await Employee.findByPk(employee_id);
    if (!employee) {
      logger.warn(`Employee not found: ${employee_id}`);
      return next(new ApiError(404, `Employee with id ${employee_id} not found`));
    }
    if (!employee.is_active) {
      logger.warn(`Inactive employee attempted scan: ${employee_id}`);
      return next(new ApiError(403, `Employee with id ${employee_id} is inactive and cannot perform this action`));
    }

    // Find issued pass
    const issuedPass = await IssuedPass.findOne({
      where: {
        attendee_id,
        subevent_id,
        status: "active",
        is_expired: false,
      },
    });

    if (!issuedPass) {
      logger.warn(`Valid issued pass not found for attendee ${attendee_id} and subevent ${subevent_id}`);
      return next(new ApiError(404, "Valid issued pass not found for attendee and subevent"));
    }

    if (issuedPass.is_expired || !["active", "used"].includes(issuedPass.status)) {
      logger.warn(`Issued pass ${issuedPass.issued_pass_id} is not valid for scanning`);
      return next(new ApiError(400, "Issued pass is not valid for scanning"));
    }

    // Check if already scanned today
    const existingCheck = await CheckingRecord.findOne({
      where: {
        issued_pass_id: issuedPass.issued_pass_id,
        created_at: {
          [Op.gte]: new Date(today.setHours(0, 0, 0, 0)), // start of today
          [Op.lte]: new Date(today.setHours(23, 59, 59, 999)), // end of today
        },
      },
    });

    if (existingCheck) {
      logger.warn(`Issued pass ${issuedPass.issued_pass_id} already scanned today`);
      return next(new ApiError(400, "Pass already scanned for today"));
    }

    // Update used_count and create check-in record
    issuedPass.used_count = (issuedPass.used_count || 0) + 1;
    await issuedPass.save();
    logger.info(`Issued pass ${issuedPass.issued_pass_id} used_count incremented`, { newUsedCount: issuedPass.used_count });

    await CheckingRecord.create({
      issued_pass_id: issuedPass.issued_pass_id,
      employee_id,
      checkin_time: new Date(),
    });
    logger.info(`Check-in recorded for issued pass ${issuedPass.issued_pass_id}`, { employee_id });

    return res
      .status(200)
      .json(
        new ApiResponse(200, { employee }, "Attendee Pass Scanned Successfully")
      );
  } catch (error) {
    logger.error("Error in scanIssuedPass", error);
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

export {
  createEmployee,
  updateEmployee,
  getAllEmployee,
  deleteEmployee,
  toggleEmployeeStatus,
  loginEmployee,
  scanIssuedPass,
};