import express from "express";
import { ne, eq } from "drizzle-orm";
import { requireRole } from "../core/middleware";
import { db } from "../../db";
import { storage } from "../../storage";
import {
  applicationActions,
  certificates,
  clarifications,
  documents,
  himkoshTransactions,
  homestayApplications,
  inspectionOrders,
  inspectionReports,
  lgdBlocks,
  lgdDistricts,
  lgdGramPanchayats,
  lgdTehsils,
  lgdUrbanBodies,
  notifications,
  payments,
  productionStats,
  reviews,
  storageObjects,
  users,
} from "@shared/schema";
import { logger } from "../../logger";

const log = logger.child({ module: "admin-devops-router" });

export function createAdminDevopsRouter() {
  const router = express.Router();

  // Granular reset endpoint - allows selective deletion of data categories
  // IMPORTANT: This must be defined BEFORE /reset/:operation to match correctly
  router.post("/reset/granular", requireRole("super_admin"), async (req, res) => {
    try {
      const {
        confirmationText,
        reason,
        deleteApplications = true,
        deleteDocuments = true,
        deletePayments = true,
        deleteInspections = true,
        deleteCertificates = true,
        deleteNotifications = true,
        deletePropertyOwners = false,
      } = req.body;

      const environment = process.env.NODE_ENV || "development";
      const allowReset = process.env.ALLOW_RESET_OPERATIONS === "true";
      if (environment === "production" && !allowReset) {
        return res.status(403).json({ message: "Reset operations are disabled in production" });
      }

      if (confirmationText !== "RESET") {
        return res.status(400).json({ message: 'Confirmation text must be "RESET"' });
      }
      if (!reason || reason.length < 10) {
        return res.status(400).json({ message: "Reason must be at least 10 characters" });
      }

      log.info(`[super-admin] Granular reset - applications: ${deleteApplications}, documents: ${deleteDocuments}, payments: ${deletePayments}, inspections: ${deleteInspections}, certificates: ${deleteCertificates}, notifications: ${deleteNotifications}, propertyOwners: ${deletePropertyOwners}, reason: ${reason}`);

      const deletedCounts: Record<string, string> = {};

      // Delete in correct order to respect FK constraints
      if (deleteCertificates) {
        await db.delete(certificates);
        deletedCounts.certificates = "all";
      }

      if (deleteApplications) {
        await db.delete(clarifications);
        deletedCounts.clarifications = "all";
      }

      if (deleteInspections) {
        await db.delete(inspectionReports);
        await db.delete(inspectionOrders);
        deletedCounts.inspections = "all orders and reports";
      }

      if (deleteDocuments) {
        await db.delete(documents);
        deletedCounts.documents = "all";
      }

      if (deleteApplications) {
        await db.delete(applicationActions);
        deletedCounts.applicationActions = "all";
      }

      if (deleteApplications) {
        await db.delete(reviews);
        deletedCounts.reviews = "all";
      }

      if (deleteNotifications) {
        await db.delete(notifications);
        deletedCounts.notifications = "all";
      }

      if (deletePayments || deleteApplications) {
        await db.delete(himkoshTransactions);
        deletedCounts.himkoshTransactions = "all";
      }

      if (deletePayments) {
        await db.delete(payments);
        deletedCounts.payments = "all";
      }

      if (deleteApplications) {
        await db.delete(homestayApplications);
        deletedCounts.applications = "all";
      }

      if (deletePropertyOwners) {
        // Must delete storage objects first - they have FK to users
        await db.delete(storageObjects);
        deletedCounts.storageObjects = "all";
        await db.delete(users).where(eq(users.role, "property_owner"));
        deletedCounts.propertyOwners = "all property owner accounts";
      }

      res.json({
        success: true,
        message: "Granular reset completed successfully",
        deletedCounts,
        preserved: ["Staff users (DA, DTDO, Admin)", "LGD data", "DDO codes"]
      });
    } catch (error) {
      log.error("[super-admin] Granular reset failed:", error);
      res.status(500).json({ message: "Granular reset failed", error: String(error) });
    }
  });

  router.post("/reset/:operation", requireRole("super_admin"), async (req, res) => {
    try {
      const { operation } = req.params;
      const { confirmationText, reason } = req.body;
      const environment = process.env.NODE_ENV || "development";
      const allowReset = process.env.ALLOW_RESET_OPERATIONS === "true";
      if (environment === "production" && !allowReset) {
        return res.status(403).json({ message: "Reset operations are disabled in production" });
      }
      const requiredText = operation === "full" ? "RESET" : "DELETE";
      if (confirmationText !== requiredText) {
        return res.status(400).json({ message: `Confirmation text must be "${requiredText}"` });
      }
      if (!reason || reason.length < 10) {
        return res.status(400).json({ message: "Reason must be at least 10 characters" });
      }

      log.info(`[super-admin] Reset operation: ${operation}, reason: ${reason}`);
      let deletedCounts: Record<string, string> = {};

      switch (operation) {
        case "full":
          await db.delete(certificates);
          await db.delete(clarifications);
          await db.delete(inspectionReports);
          await db.delete(inspectionOrders);
          await db.delete(documents);
          await db.delete(applicationActions);
          await db.delete(reviews);
          await db.delete(notifications);
          await db.delete(himkoshTransactions);
          await db.delete(payments);
          await db.delete(homestayApplications);
          await db.delete(productionStats);
          await db.delete(storageObjects);
          await db.delete(users).where(ne(users.role, "super_admin"));
          deletedCounts = { all: "All data except super_admin accounts" };
          break;
        case "applications":
          await db.delete(certificates);
          await db.delete(clarifications);
          await db.delete(inspectionReports);
          await db.delete(inspectionOrders);
          await db.delete(documents);
          await db.delete(applicationActions);
          await db.delete(reviews);
          await db.delete(notifications);
          await db.delete(himkoshTransactions);
          await db.delete(payments);
          await db.delete(homestayApplications);
          deletedCounts = { applications: "all" };
          break;
        case "users":
          await db.delete(users).where(ne(users.role, "super_admin"));
          deletedCounts = { users: "All non-super_admin users" };
          break;
        case "files":
          await db.delete(documents);
          deletedCounts = { documents: "all" };
          break;
        case "inspections":
          await db.delete(inspectionReports);
          await db.delete(inspectionOrders);
          deletedCounts = { inspections: "all orders and reports" };
          break;
        case "objections":
          await db.delete(clarifications);

          deletedCounts = { objections: "all objections and clarifications" };
          break;
        case "payments":
          await db.delete(payments);
          deletedCounts = { payments: "all" };
          break;
        default:
          return res.status(400).json({ message: "Invalid operation" });
      }

      res.json({ success: true, message: `Reset operation '${operation}' completed successfully`, deletedCounts });
    } catch (error) {
      log.error("[super-admin] Reset failed:", error);
      res.status(500).json({ message: "Reset operation failed" });
    }
  });


  router.post("/seed/:type", requireRole("super_admin"), async (req, res) => {
    try {
      const { type } = req.params;
      const { count = 10, scenario } = req.body;
      log.info(`[super-admin] Seeding data: ${type}, count: ${count}, scenario: ${scenario}`);

      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      switch (type) {
        case "applications": {
          const createdApps = [];
          for (let i = 0; i < count; i++) {
            const nightlyRate = 2000 + i * 150;
            const app = await storage.createApplication({
              userId: currentUser.id,
              propertyName: `Test Property ${i + 1}`,
              category: (["diamond", "gold", "silver"] as const)[i % 3],
              totalRooms: 4,
              address: `Test Address ${i + 1}, Shimla`,
              district: "Shimla",
              pincode: "171001",
              locationType: "mc",
              ownerName: `Test Owner ${i + 1}`,
              ownerMobile: `98${String(765000000 + i)}`,
              ownerEmail: `test${i + 1}@example.com`,
              ownerAadhaar: `${(100000000000 + i).toString().slice(-12)}`,
              proposedRoomRate: nightlyRate,
              projectType: "new_project",
              propertyArea: 1200,
              singleBedRooms: 2,
              doubleBedRooms: 1,
              familySuites: 1,
              attachedWashrooms: 4,
              amenities: { wifi: true, parking: i % 2 === 0, restaurant: i % 3 === 0 },
              baseFee: (4000 + i * 250).toString(),
              totalFee: (6000 + i * 300).toString(),
              status: "draft",
              currentPage: 1,
              maxStepReached: 1,
            } as any);
            createdApps.push(app);
          }
          return res.json({ success: true, message: `Created ${createdApps.length} test applications` });
        }
        case "users": {
          const testUsers = [];
          const roles = ["property_owner", "dealing_assistant", "district_tourism_officer", "state_officer"];
          for (const role of roles) {
            const user = await storage.createUser({
              fullName: `Test ${role.replace(/_/g, " ")}`,
              mobile: `9${role.length}${String(Math.floor(Math.random() * 100000000)).padStart(8, "0")}`,
              email: `test.${role}@example.com`,
              password: "Test@123",
              role: role as any,
              district: role.includes("district") ? "shimla" : undefined,
            });
            testUsers.push(user);
          }
          return res.json({ success: true, message: `Created ${testUsers.length} test users (all roles)` });
        }
        case "scenario":
          return res.json({ success: true, message: `Scenario '${scenario}' loaded (not yet implemented)` });
        default:
          return res.status(400).json({ message: "Invalid seed type" });
      }
    } catch (error) {
      log.error("[super-admin] Seed failed:", error);
      res.status(500).json({ message: "Failed to generate test data" });
    }
  });

  router.post("/lgd/import", requireRole("admin", "super_admin"), async (req, res) => {
    try {
      const { csvData, dataType } = req.body;
      if (!csvData || !dataType) {
        return res.status(400).json({ message: "Missing csvData or dataType" });
      }

      const lines = csvData.trim().split("\n");
      const inserted = { districts: 0, tehsils: 0, blocks: 0, gramPanchayats: 0, urbanBodies: 0 };

      if (dataType === "villages") {
        type DistrictEntry = { lgdCode: string; districtName: string };
        type TehsilEntry = { lgdCode: string; tehsilName: string; districtCode: string };
        type VillageEntry = { lgdCode: string; gramPanchayatName: string; tehsilCode: string; districtCode: string; pincode: string | null };

        const districtMap = new Map<string, DistrictEntry>();
        const tehsilMap = new Map<string, TehsilEntry>();
        const villages: VillageEntry[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",");
          if (values.length < 9 || values[0] !== "2") continue;
          const districtCode = values[2];
          const districtName = values[3];
          const tehsilCode = values[4];
          const tehsilName = values[5];
          const villageCode = values[6];
          const villageName = values[7];
          const pincode = values[8];
          districtMap.set(districtCode, { lgdCode: districtCode, districtName });
          const tehsilKey = `${districtCode}-${tehsilCode}`;
          tehsilMap.set(tehsilKey, { lgdCode: tehsilCode, tehsilName, districtCode });
          villages.push({ lgdCode: villageCode, gramPanchayatName: villageName, tehsilCode, districtCode, pincode: pincode || null });
        }

        const resolvedBlocks = new Map<string, string | null>();
        for (const [, data] of tehsilMap.entries()) {
          const key = `${data.districtCode}-${data.lgdCode}`;
          resolvedBlocks.set(key, null);
        }

        for (const [, data] of districtMap.entries()) {
          await db
            .insert(lgdDistricts)
            .values({ lgdCode: data.lgdCode, districtName: data.districtName, isActive: true })
            .onConflictDoNothing();
          inserted.districts++;
        }

        const existingDistricts = await db.select().from(lgdDistricts);
        const districtIdMap = new Map<string, string>();
        existingDistricts.forEach((district) => {
          if (district.lgdCode) districtIdMap.set(district.lgdCode, district.id);
          districtIdMap.set(district.districtName, district.id);
        });

        for (const [, data] of tehsilMap.entries()) {
          const districtId = districtIdMap.get(data.districtCode);
          if (districtId) {
            await db
              .insert(lgdTehsils)
              .values({ lgdCode: data.lgdCode, tehsilName: data.tehsilName, districtId, isActive: true })
              .onConflictDoNothing();
            inserted.tehsils++;
          }
        }

        for (const village of villages) {
          const districtId = districtIdMap.get(village.districtCode);
          if (!districtId) continue;
          await db
            .insert(lgdGramPanchayats)
            .values({
              lgdCode: village.lgdCode,
              gramPanchayatName: village.gramPanchayatName,
              districtId,
              blockId: resolvedBlocks.get(`${village.districtCode}-${village.tehsilCode}`) ?? null,
              isActive: true,
            })
            .onConflictDoNothing();
          inserted.gramPanchayats++;
        }
      } else if (dataType === "urbanBodies") {
        const [defaultDistrict] = await db.select().from(lgdDistricts).limit(1);
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",");
          if (values.length < 6 || values[0] !== "2") continue;
          const bodyCode = values[2];
          const bodyName = values[3];
          const bodyType = values[4];
          if (!defaultDistrict) {
            log.warn("[LGD] No districts available; skipping urban body import");
            break;
          }
          const normalizedType: "mc" | "tcp" | "np" = (() => {
            const value = bodyType?.toLowerCase() || "";
            if (value.includes("corporation")) return "mc";
            if (value.includes("council") || value.includes("tcp")) return "tcp";
            return "np";
          })();
          await db
            .insert(lgdUrbanBodies)
            .values({
              lgdCode: bodyCode,
              urbanBodyName: bodyName,
              bodyType: normalizedType,
              districtId: defaultDistrict.id,
              numberOfWards: null,
              isActive: true,
            })
            .onConflictDoNothing();
          inserted.urbanBodies++;
        }
      } else {
        return res.status(400).json({ message: "Invalid dataType. Must be 'villages' or 'urbanBodies'" });
      }

      res.json({ success: true, message: `Successfully imported LGD data (${dataType})`, inserted });
    } catch (error) {
      log.error("[admin] LGD import failed:", error);
      res.status(500).json({ message: "Failed to import LGD data", error: String(error) });
    }
  });

  return router;
}
