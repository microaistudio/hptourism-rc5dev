import express from "express";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { requireRole } from "../core/middleware";
import { storage } from "../../storage";
import { logger } from "../../logger";
import { users, type User } from "@shared/schema";
import { db } from "../../db";

const log = logger.child({ module: "admin-users-router" });

const ALLOWED_ROLES = [
  "property_owner",
  "dealing_assistant",
  "district_tourism_officer",
  "district_officer",
  "state_officer",
  "admin",
];

export function createAdminUsersRouter() {
  const router = express.Router();

  // Get all users
  router.get("/users", requireRole("admin", "super_admin"), async (_req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json({ users });
    } catch (error) {
      log.error("Failed to fetch users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Update user
  router.patch("/users/:id", requireRole("admin", "super_admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const {
        role,
        isActive,
        fullName,
        email,
        district,
        password,
        firstName,
        lastName,
        username,
        alternatePhone,
        designation,
        department,
        employeeId,
        officeAddress,
        officePhone,
      } = req.body;

      const currentUser = await storage.getUser(req.session.userId!);
      const targetUser = await storage.getUser(id);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const updates: Partial<User> = {};

      if (fullName?.trim()) updates.fullName = fullName.trim();
      if (firstName !== undefined && firstName !== null) updates.firstName = firstName.trim() || null;
      if (lastName !== undefined && lastName !== null) updates.lastName = lastName.trim() || null;
      if (username !== undefined && username !== null) updates.username = username.trim() || null;
      if (email !== undefined && email !== null) updates.email = email.trim() || null;
      if (alternatePhone !== undefined && alternatePhone !== null) updates.alternatePhone = alternatePhone.trim() || null;
      if (designation !== undefined && designation !== null) updates.designation = designation.trim() || null;
      if (department !== undefined && department !== null) updates.department = department.trim() || null;
      if (employeeId !== undefined && employeeId !== null) updates.employeeId = employeeId.trim() || null;
      if (district !== undefined && district !== null) updates.district = district.trim() || null;
      if (officeAddress !== undefined && officeAddress !== null) updates.officeAddress = officeAddress.trim() || null;
      if (officePhone !== undefined && officePhone !== null) updates.officePhone = officePhone.trim() || null;

      if (password?.trim()) {
        updates.password = await bcrypt.hash(password.trim(), 10);
      }

      if (role !== undefined) {
        if (!ALLOWED_ROLES.includes(role)) {
          return res.status(400).json({ message: "Invalid role" });
        }
        updates.role = role;
      }

      if (isActive !== undefined) {
        updates.isActive = isActive;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }

      if (currentUser && id === currentUser.id) {
        if (role && role !== currentUser.role) {
          return res.status(400).json({ message: "Cannot change your own role" });
        }
        if (isActive === false) {
          return res.status(400).json({ message: "Cannot deactivate your own account" });
        }
      }

      if (targetUser.role === "admin" && (!currentUser || id !== currentUser.id)) {
        if (role && role !== targetUser.role) {
          return res.status(403).json({ message: "Cannot change another admin's role" });
        }
        if (isActive === false) {
          return res.status(403).json({ message: "Cannot deactivate another admin" });
        }
      }

      const updatedUser = await storage.updateUser(id, updates);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ user: updatedUser });
    } catch (error) {
      log.error("Failed to update user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Toggle user status
  router.patch("/users/:id/status", requireRole("admin", "super_admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      const currentUser = await storage.getUser(req.session.userId!);
      if (currentUser && id === currentUser.id && isActive === false) {
        return res.status(400).json({ message: "Cannot deactivate your own account" });
      }

      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role === "admin" && !isActive && (!currentUser || user.id !== currentUser.id)) {
        return res.status(400).json({ message: "Cannot deactivate other admin users" });
      }

      const updatedUser = await storage.updateUser(id, { isActive });
      res.json({ user: updatedUser });
    } catch (error) {
      log.error("Failed to update user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  // Create a new user
  router.post("/users", requireRole("admin", "super_admin"), async (req, res) => {
    try {
      const {
        mobile,
        fullName,
        role,
        district,
        password,
        firstName,
        lastName,
        username,
        email,
        alternatePhone,
        designation,
        department,
        employeeId,
        officeAddress,
        officePhone,
      } = req.body;

      if (role !== "property_owner") {
        if (!mobile || !firstName || !lastName || !password) {
          return res
            .status(400)
            .json({ message: "Mobile, first name, last name, and password are required for staff users" });
        }
      } else {
        if (!mobile || !fullName || !password) {
          return res.status(400).json({ message: "Mobile, full name, and password are required" });
        }
      }

      if (!/^[6-9]\d{9}$/.test(mobile)) {
        return res.status(400).json({ message: "Invalid mobile number format" });
      }

      if (!ALLOWED_ROLES.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const existingUser = await db.select().from(users).where(eq(users.mobile, mobile)).limit(1);
      if (existingUser.length > 0) {
        return res.status(400).json({ message: "A user with this mobile number already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const userData: any = {
        mobile,
        fullName: fullName || `${firstName} ${lastName}`,
        role,
        district: district?.trim() || null,
        password: hashedPassword,
        isActive: true,
      };

      if (role !== "property_owner") {
        userData.firstName = firstName?.trim() || null;
        userData.lastName = lastName?.trim() || null;
        userData.username = username?.trim() || null;
        userData.email = email?.trim() || null;
        userData.alternatePhone = alternatePhone?.trim() || null;
        userData.designation = designation?.trim() || null;
        userData.department = department?.trim() || null;
        userData.employeeId = employeeId?.trim() || null;
        userData.officeAddress = officeAddress?.trim() || null;
        userData.officePhone = officePhone?.trim() || null;
      }

      const [newUser] = await db.insert(users).values(userData).returning();
      log.info(`[admin] Created new user: ${userData.fullName} (${role}) - ${mobile}`);
      res.json({ user: newUser, message: "User created successfully" });
    } catch (error) {
      log.error("Failed to create user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  return router;
}
