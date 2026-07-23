import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../utils/db";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";
import { requirePermission } from "../middleware/permission";

const router = Router();

router.use(authenticateToken as any);

// 1. Get all employees
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const employees = await prisma.employee.findMany({
      include: {
        branches: { include: { branch: true } },
        permissions: { include: { permission: true } },
      },
      orderBy: { full_name: "asc" },
    });

    // Map branches back to store object for backward compatibility in UI
    const mapped = employees.map((emp) => {
      const defaultBranch = emp.branches[0]?.branch || null;
      return {
        ...emp,
        store: defaultBranch,
        branches: emp.branches.map((b) => b.branch),
      };
    });

    return res.json(mapped);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 2. Get list of all permissions (for mapping dropdowns in UI)
router.get("/permissions/list", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: { category: "asc" },
    });
    return res.json(permissions);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 3. Get employee by ID
router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: req.params.id },
      include: {
        branches: { include: { branch: true } },
        permissions: { include: { permission: true } },
      },
    });

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const defaultBranch = employee.branches[0]?.branch || null;
    const mapped = {
      ...employee,
      store: defaultBranch,
      branches: employee.branches.map((b) => b.branch),
    };

    return res.json(mapped);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 4. Create Employee
router.post("/", requirePermission(["EMPLOYEES_MANAGE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { store_id, branch_ids, username, password, full_name, phone, email, avatar_url, status, permission_codes } = req.body;

    let targetBranchIds: string[] = [];
    if (Array.isArray(branch_ids)) {
      targetBranchIds = branch_ids;
    } else if (store_id) {
      targetBranchIds = [store_id];
    }

    if (targetBranchIds.length === 0 || !username || !password || !full_name) {
      return res.status(400).json({ error: "Missing required fields (Username, Password, Full Name, and Branch)" });
    }

    const existingUser = await prisma.employee.findUnique({
      where: { username },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const hash = await bcrypt.hash(password, 10);

    const newEmployee = await prisma.$transaction(async (tx) => {
      const emp = await tx.employee.create({
        data: {
          username,
          password_hash: hash,
          full_name,
          phone,
          email,
          avatar_url,
          status: status || "active",
        },
      });

      // Link to branches
      await tx.userBranch.createMany({
        data: targetBranchIds.map((bId) => ({
          user_id: emp.id,
          branch_id: bId,
        })),
      });

      if (permission_codes && Array.isArray(permission_codes)) {
        const perms = await tx.permission.findMany({
          where: { code: { in: permission_codes } },
        });

        if (perms.length > 0) {
          await tx.employeePermission.createMany({
            data: perms.map((p) => ({
              employee_id: emp.id,
              permission_id: p.id,
            })),
          });
        }
      }

      return emp;
    });

    return res.status(201).json(newEmployee);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 5. Update Employee Profile
router.put("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const employeeId = req.params.id;

    // Check permissions: either the user is editing themselves, or they have EMPLOYEES_MANAGE
    const isSelf = req.user!.id === employeeId;
    const hasManage = req.user!.permissions.includes("EMPLOYEES_MANAGE") || req.user!.permissions.includes("SETTINGS_MANAGE");

    if (!isSelf && !hasManage) {
      return res.status(403).json({ error: "Forbidden: You cannot modify other employee profiles" });
    }

    const { full_name, phone, email, avatar_url, status, password, store_id, branch_ids } = req.body;

    const dataToUpdate: any = {};
    if (full_name) dataToUpdate.full_name = full_name;
    if (phone !== undefined) dataToUpdate.phone = phone;
    if (email !== undefined) dataToUpdate.email = email;
    if (avatar_url !== undefined) dataToUpdate.avatar_url = avatar_url;

    if (hasManage) {
      if (status) {
        if (isSelf && status !== "active") {
          return res.status(400).json({ error: "Tài khoản admin không thể tự khóa chính mình!" });
        }
        dataToUpdate.status = status;
        if (status === "active") {
          dataToUpdate.failed_login_attempts = 0;
        }
      }
    }

    if (password) {
      dataToUpdate.password_hash = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const emp = await tx.employee.update({
        where: { id: employeeId },
        data: dataToUpdate,
      });

      // Update branches if managed by administrator
      if (hasManage) {
        let targetBranchIds: string[] = [];
        if (Array.isArray(branch_ids)) {
          targetBranchIds = branch_ids;
        } else if (store_id) {
          targetBranchIds = [store_id];
        }

        if (branch_ids !== undefined || store_id !== undefined) {
          await tx.userBranch.deleteMany({ where: { user_id: employeeId } });
          if (targetBranchIds.length > 0) {
            await tx.userBranch.createMany({
              data: targetBranchIds.map((bId) => ({
                user_id: employeeId,
                branch_id: bId,
              })),
            });
          }
        }
      }

      return emp;
    });

    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 6. Set Employee Permissions (Strictly restricted to EMPLOYEES_MANAGE)
router.put("/:id/permissions", requirePermission(["EMPLOYEES_MANAGE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const employeeId = req.params.id;
    const { permission_codes } = req.body; // Array of permission codes

    if (!Array.isArray(permission_codes)) {
      return res.status(400).json({ error: "permission_codes must be an array of strings" });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    await prisma.$transaction(async (tx) => {
      // Delete existing employee permissions
      await tx.employeePermission.deleteMany({
        where: { employee_id: employeeId },
      });

      // Find permission IDs for given codes
      const dbPerms = await tx.permission.findMany({
        where: { code: { in: permission_codes } },
      });

      if (dbPerms.length > 0) {
        await tx.employeePermission.createMany({
          data: dbPerms.map((p) => ({
            employee_id: employeeId,
            permission_id: p.id,
          })),
        });
      }
    });

    return res.json({ message: "Employee permissions updated successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 7. Delete Employee
router.delete("/:id", requirePermission(["EMPLOYEES_MANAGE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const employeeId = req.params.id;

    if (req.user!.id === employeeId) {
      return res.status(400).json({ error: "Cannot delete yourself" });
    }

    await prisma.employee.delete({
      where: { id: employeeId },
    });

    return res.json({ message: "Employee deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 8. Reset Employee Password to Username & Unlock Account
router.post("/:id/reset-password", requirePermission(["EMPLOYEES_MANAGE"]) as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const employeeId = req.params.id;
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const hash = await bcrypt.hash(employee.username, 10);

    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        password_hash: hash,
        failed_login_attempts: 0,
        status: "active",
      },
    });

    return res.json({ message: `Đã reset mật khẩu = '${employee.username}' và mở khóa tài khoản thành công!` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
