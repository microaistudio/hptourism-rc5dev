import { Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import { storage } from "../../storage";
import { logger } from "../../logger";
import { User } from "@shared/schema";
import { formatUserForResponse } from "./users";

const routeLog = logger.child({ module: "user-handlers" });

const staffProfileSchema = z.object({
    fullName: z.string().min(1, "Full name is required"),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    mobile: z.string().min(10, "Mobile number is required"),
    email: z.string().email().optional().or(z.literal("")),
    alternatePhone: z.string().optional(),
    designation: z.string().optional(),
    department: z.string().optional(),
    employeeId: z.string().optional(),
    officeAddress: z.string().optional(),
    officePhone: z.string().optional(),
});

function normalizeStringField(value: any, defaultValue: string = "", maxLength?: number): string {
    if (typeof value !== "string") return defaultValue;
    const trimmed = value.trim();
    if (maxLength && trimmed.length > maxLength) {
        return trimmed.substring(0, maxLength);
    }
    return trimmed;
}

function toNullableString(value: any, maxLength?: number): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (maxLength && trimmed.length > maxLength) {
        return trimmed.substring(0, maxLength);
    }
    return trimmed;
}

export const handleStaffProfileUpdate = async (req: Request, res: Response) => {
    try {
        const userId = req.session.userId!;
        const payload = staffProfileSchema.parse(req.body);

        const userRecord = await storage.getUser(userId);
        if (!userRecord) {
            return res.status(404).json({ message: "User not found" });
        }

        const normalizedMobile = normalizeStringField(payload.mobile, "", 15);
        if (!normalizedMobile) {
            return res.status(400).json({ message: "Mobile number is required" });
        }

        if (normalizedMobile !== userRecord.mobile) {
            const existingUser = await storage.getUserByMobile(normalizedMobile);
            if (existingUser && existingUser.id !== userRecord.id) {
                return res.status(400).json({ message: "Another account already uses this mobile number" });
            }
        }

        const updates: Partial<User> = {
            fullName: normalizeStringField(payload.fullName, userRecord.fullName, 255),
            firstName: toNullableString(payload.firstName, 100),
            lastName: toNullableString(payload.lastName, 100),
            mobile: normalizedMobile,
            email: toNullableString(payload.email, 255),
            alternatePhone: toNullableString(payload.alternatePhone, 15),
            designation: toNullableString(payload.designation, 120),
            department: toNullableString(payload.department, 120),
            employeeId: toNullableString(payload.employeeId, 50),
            officeAddress: toNullableString(payload.officeAddress, 500),
            officePhone: toNullableString(payload.officePhone, 20),
        };

        const updatedUser = await storage.updateUser(userId, updates);
        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({
            user: formatUserForResponse(updatedUser),
            message: "Profile updated successfully",
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                message: error.errors[0].message,
                errors: error.errors,
            });
        }
        routeLog.error("[staff-profile] Failed to update profile:", error);
        res.status(500).json({ message: "Failed to update profile" });
    }
};

export const handleStaffPasswordChange = async (req: Request, res: Response) => {
    try {
        const userId = req.session.userId!;
        const { newPassword } = req.body;

        if (!newPassword) {
            return res.status(400).json({ message: "New password is required" });
        }

        if (typeof newPassword !== "string" || newPassword.length < 6) {
            return res.status(400).json({ message: "New password must be at least 6 characters" });
        }

        const userRecord = await storage.getUser(userId);
        if (!userRecord) {
            return res.status(404).json({ message: "User not found" });
        }

        // User is already authenticated via session, no need to verify current password

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await storage.updateUser(userId, { password: hashedPassword });

        res.json({ message: "Password changed successfully" });
    } catch (error) {
        routeLog.error("[staff-profile] Failed to change password:", error);
        res.status(500).json({ message: "Failed to change password" });
    }
};
