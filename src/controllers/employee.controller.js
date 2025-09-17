import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Op } from "sequelize";
import Employee from "../db/models/employee.model.js";
import { decryptPassword } from "../utils/encrypt.js";
import sendMail from "../utils/sendMail.js";
import Admin from "../db/models/admin.model.js";

const createEmployee = asyncHandler(async (req, res, next) => {
  try {
    const { name, mobile_no, email, password, username } = req.body;

    if (!(name && mobile_no && email && password && username)) {
      return next(
        new ApiError(
          400,
          "Name, mobile number, email, username and password are required fields"
        )
      );
    }
    const admin_id = req.admin_id;
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

      return next(new ApiError(409, msg));
    }

    const newEmployee = await Employee.create({
      name,
      mobile_no,
      email,
      password,
      username,
      admin_id,
    });

    const admin = await Admin.findByPk(admin_id);
    if (!admin) {
      return next(new ApiError(500, "Unable to find admin details"));
    }
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
    if (!emailData || !emailData.id) {
      return next(
        new ApiError(502, "Failed to employee registration email", error)
      );
    }
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
    console.log("error in creating employee:", error);
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const loginEmployee = asyncHandler(async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!(username && password))
      return next(
        new ApiError(400, "username and password fields are required")
      );
    const employee = await Employee.findOne({
      where: { username },
    });
    if (!employee)
      return next(
        new ApiError(
          404,
          "Employee not found, please contact admin first for registration"
        )
      );

    if (!employee.is_active) {
      return next(
        new ApiError(403, "Your account is deactivated, please contact admin")
      );
    }

    const isMatch = await employee.isPasswordCorrect(password);
    if (!isMatch) {
      return next(new ApiError(401, "Incorrect credentials"));
    }

    const accessToken = employee.generateAccessToken();
    const refreshToken = employee.generateRefreshToken();

    if (!(accessToken && refreshToken))
      return next(new ApiError(500, "Error generating tokens"));

    await employee.update({ refreshToken });
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
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const updateEmployee = asyncHandler(async (req, res, next) => {
  try {
    const { name, mobile_no, email, password, username, is_active } = req.body;
    const employeeId = req.params.employeeId;
    if (!employeeId) {
      return next(new ApiError(400, "employeeId is required in params"));
    }
    // Check if all update fields are missing or empty
    if (
      [name, mobile_no, email, password, username, is_active].every(
        (field) => field === undefined || field === null || field === ""
      )
    ) {
      return next(
        new ApiError(400, "At least one field must be provided for update")
      );
    }

    const employee = await Employee.findByPk(employeeId);
    if (!employee) {
      return next(new ApiError(404, "Employee not found"));
    }

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
        if (existingEmployee.email === email)
          msg = "Email is already registered";
        else if (existingEmployee.mobile_no === mobile_no)
          msg = "Mobile number is already registered";
        else if (existingEmployee.username === username)
          msg = "Username is already taken";

        return next(new ApiError(409, msg));
      }
    }
    let decryptedpassword;
    if (!password) {
      decryptedpassword = decryptPassword(employee.password);
    }

    const updatedFields = [];
    if (email && email !== employee.email) updatedFields.push("email");
    if (username && username !== employee.username)
      updatedFields.push("username");
    if (password) updatedFields.push("password");

    // Find which credentials fields actually changed
    const updatedEmployee = await employee.update({
      name: name ?? employee.name,
      mobile_no: mobile_no ?? employee.mobile_no,
      email: email ?? employee.email,
      username: username ?? employee.username,
      password: password ?? decryptedpassword,
      is_active: is_active ?? employee.is_active,
    });

    // Send email only if email, username, or password changed
    if (updatedFields.length > 0) {
      const admin_id = req.admin_id;
      const admin = await Admin.findByPk(admin_id);
      if (!admin) {
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
        return next(
          new ApiError(502, "Failed to send credentials update email", error)
        );
      }
    }
    return res.status(201).json(
      new ApiResponse(
        201,
        {
          employee: updatedEmployee,
        },
        "Employee updated successfully"
      )
    );
  } catch (error) {
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const getAllEmployee = asyncHandler(async (req, res, next) => {
  try {
    const admin_id = req.admin_id;
    const page = parseInt(req.query.page) || 1;
    const limit = 25;
    const offset = (page - 1) * limit;

    const { count, rows: employees } = await Employee.findAndCountAll({
      where: { admin_id },
      limit,
      offset,
      order: [["created_at", "DESC"]],
    });

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
    return next(new ApiError(500, "Internal Server Error", error));
  }
});


// bar search in employ 

const SearchEmploy = asyncHandler(async (req, res, next) => {
  try {
    const inputtext = (req.query.inputtext || "").toLowerCase();
    const page = parseInt(req.query.page) || 1;
    const limit = 25;
    const offset = (page - 1) * limit;

    // search based on name, mobile_no, email, username
    const { count, rows: employees } = await Employee.findAndCountAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${inputtext}%` } },
          { mobile_no: { [Op.like]: `%${inputtext}%` } },
          { email: { [Op.like]: `%${inputtext}%` } },
          { username: { [Op.like]: `%${inputtext}%` } },
        ],
      },
      limit,
      offset,
      order: [["created_at", "DESC"]],
    });

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
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const deleteEmployee = asyncHandler(async (req, res, next) => {
  try {
    const employeeId = req.params.employeeId;

    if (!employeeId) {
      return next(new ApiError(400, "employeeId is required in params"));
    }

    const employee = await Employee.findByPk(employeeId);
    if (!employee) {
      return next(new ApiError(404, "Employee not found"));
    }

    await employee.destroy();

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
    return next(new ApiError(500, "Internal Server Error", error));
  }
});

const toggleEmployeeStatus = asyncHandler(async (req, res, next) => {
  try {
    const employeeId = req.params.employeeId;
    if (!employeeId) {
      return next(new ApiError(400, "employeeId is required in params"));
    }

    const employee = await Employee.findByPk(employeeId);
    if (!employee) {
      return next(new ApiError(404, "Employee not found"));
    }

    const updatedemployee = await employee.update({
      is_active: employee.is_active ? false : true,
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          employee: updatedemployee,
        },
        `Employee status has been Updated successfully`
      )
    );
  } catch (error) {
    console.error("Error in toggleEmployeeStatus:", error);
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
};
