import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from './db';
import {
  users,
  homestayApplications,
  documents,
  payments,
  productionStats,
  notifications,
  applicationActions,
  systemSettings,
  type User,
  type InsertUser,
  type HomestayApplication,
  type InsertHomestayApplication,
  type Document,
  type InsertDocument,
  type Payment,
  type InsertPayment,
  type Notification,
  type InsertNotification,
  type ApplicationAction,
  type InsertApplicationAction,
} from '../shared/schema';
import type { IStorage } from './storage';
import { normalizeUsername } from '@shared/userUtils';
import { formatApplicationNumber } from '@shared/applicationNumber';
import { lookupStaffAccountByIdentifier } from '@shared/districtStaffManifest';
import { deriveDistrictRoutingLabel } from '@shared/districtRouting';

const APPLICATION_NUMBER_UNIQUE_CONSTRAINT = 'homestay_applications_application_number_key';
const APPLICATION_SERIAL_SEED_KEY = 'application_serial_seed';

const isApplicationNumberUniqueViolation = (error: unknown) => {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const err = error as { code?: string; constraint?: string };
  return err.code === '23505' && err.constraint === APPLICATION_NUMBER_UNIQUE_CONSTRAINT;
};

export class DbStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByMobile(mobile: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.mobile, mobile)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const normalized = normalizeUsername(username);
    if (!normalized) {
      return undefined;
    }
    const result = await db.select().from(users).where(eq(users.username, normalized)).limit(1);
    if (result[0]) {
      return result[0];
    }
    const manifestEntry = lookupStaffAccountByIdentifier(normalized);
    if (manifestEntry) {
      return this.getUserByMobile(manifestEntry.mobile);
    }
    return undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const normalized = email?.trim().toLowerCase();
    if (!normalized) {
      return undefined;
    }
    const result = await db
      .select()
      .from(users)
      .where(sql`LOWER(${users.email}) = ${normalized}`)
      .limit(1);
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Password should already be hashed by the caller (routes.ts)
    // Do NOT hash here to avoid double-hashing
    const payload = {
      ...insertUser,
      username: normalizeUsername(insertUser.username),
    };
    const result = await db.insert(users).values(payload).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const payload: Partial<User> = {
      ...updates,
    };
    if (updates.username !== undefined) {
      payload.username = normalizeUsername(updates.username);
    }
    const result = await db.update(users)
      .set({ ...payload, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  // Homestay Application methods
  async getApplication(id: string): Promise<HomestayApplication | undefined> {
    const result = await db.select().from(homestayApplications).where(eq(homestayApplications.id, id)).limit(1);
    return result[0];
  }

  async getApplicationsByUser(userId: string): Promise<HomestayApplication[]> {
    return await db.select().from(homestayApplications)
      .where(eq(homestayApplications.userId, userId))
      .orderBy(desc(homestayApplications.createdAt));
  }

  async getApplicationsByDistrict(district: string): Promise<HomestayApplication[]> {
    return await db.select().from(homestayApplications)
      .where(
        and(
          eq(homestayApplications.district, district),
          eq(homestayApplications.status, 'pending')
        )
      )
      .orderBy(desc(homestayApplications.createdAt));
  }

  async getApplicationsByStatus(status: string): Promise<HomestayApplication[]> {
    return await db.select().from(homestayApplications)
      .where(eq(homestayApplications.status, status))
      .orderBy(desc(homestayApplications.createdAt));
  }

  async getAllApplications(): Promise<HomestayApplication[]> {
    return await db.select().from(homestayApplications)
      .orderBy(desc(homestayApplications.createdAt));
  }

  async createApplication(insertApp: InsertHomestayApplication, options?: { trusted?: boolean }): Promise<HomestayApplication> {
    const routedDistrict = deriveDistrictRoutingLabel(insertApp.district, insertApp.tehsil);
    const normalizedInsert: InsertHomestayApplication = {
      ...insertApp,
      district: routedDistrict ?? insertApp.district,
    };
    // Security: Only trusted server code can override status
    const status = options?.trusted ? (normalizedInsert.status || 'draft') : 'draft';

    const basePayload: Omit<InsertHomestayApplication, 'applicationNumber'> & {
      status: string;
      applicationKind: string;
    } = {
      ...normalizedInsert,
      applicationKind: normalizedInsert.applicationKind ?? 'new_registration',
      status,
    };

    let sequence = await this.nextApplicationSequence();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const applicationNumber = formatApplicationNumber(sequence, normalizedInsert.district);
      const appToInsert: any = {
        ...basePayload,
        applicationNumber,
      };

      try {
        const result = await db.insert(homestayApplications).values([appToInsert]).returning();
        return result[0];
      } catch (error) {
        if (isApplicationNumberUniqueViolation(error)) {
          sequence += 1;
          continue;
        }
        throw error;
      }
    }

    throw new Error('Unable to generate unique application number after multiple attempts');
  }

  async updateApplication(id: string, updates: Partial<HomestayApplication>): Promise<HomestayApplication | undefined> {
    const result = await db.update(homestayApplications)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(homestayApplications.id, id))
      .returning();
    return result[0];
  }

  // Document methods
  async createDocument(doc: InsertDocument): Promise<Document> {
    const result = await db.insert(documents).values(doc).returning();
    return result[0];
  }

  async getDocumentsByApplication(applicationId: string): Promise<Document[]> {
    // First try the documents table
    const tableDocuments = await db.select().from(documents)
      .where(eq(documents.applicationId, applicationId))
      .orderBy(desc(documents.uploadDate));

    if (tableDocuments.length > 0) {
      return tableDocuments;
    }

    // Fallback: Check the application's documents JSONB field
    // This handles cases where documents were stored in the application record
    // (e.g., advance payment workflow where documents are saved before submission)
    const [application] = await db.select({ documents: homestayApplications.documents })
      .from(homestayApplications)
      .where(eq(homestayApplications.id, applicationId))
      .limit(1);

    if (!application?.documents || !Array.isArray(application.documents)) {
      return [];
    }

    // Convert JSONB documents to Document format
    const jsonbDocs = application.documents as Array<{
      id?: string;
      documentType?: string;
      type?: string;
      fileName?: string;
      name?: string;
      filePath?: string;
      fileUrl?: string;
      url?: string;
      fileSize?: number;
      mimeType?: string;
    }>;

    return jsonbDocs.map((doc, index) => ({
      id: doc.id || `jsonb-${applicationId}-${index}`,
      applicationId,
      documentType: doc.documentType || doc.type || 'document',
      fileName: doc.fileName || doc.name || `Document ${index + 1}`,
      filePath: doc.filePath || doc.fileUrl || doc.url || '',
      fileSize: doc.fileSize || 0,
      mimeType: doc.mimeType || 'application/octet-stream',
      uploadDate: new Date(),
      isVerified: false,
      verifiedBy: null,
      verificationDate: null,
      verificationNotes: null,
      verificationStatus: 'pending',
      aiVerificationStatus: null,
      aiConfidenceScore: null,
      aiNotes: null,
    })) as Document[];
  }

  async deleteDocumentsByApplication(applicationId: string): Promise<void> {
    await db.delete(documents).where(eq(documents.applicationId, applicationId));
  }

  /**
   * Sync documents from application's JSONB field to the documents table.
   * Called when an application is submitted to ensure documents are properly
   * linked for DA verification workflow.
   */
  async syncDocumentsFromJsonb(applicationId: string): Promise<number> {
    // First check if documents already exist in the table
    const existingDocs = await db.select({ id: documents.id })
      .from(documents)
      .where(eq(documents.applicationId, applicationId))
      .limit(1);

    if (existingDocs.length > 0) {
      // Documents already synced, skip
      return 0;
    }

    // Get application with JSONB documents
    const [application] = await db.select({ documents: homestayApplications.documents })
      .from(homestayApplications)
      .where(eq(homestayApplications.id, applicationId))
      .limit(1);

    if (!application?.documents || !Array.isArray(application.documents)) {
      return 0;
    }

    const jsonbDocs = application.documents as Array<{
      id?: string;
      documentType?: string;
      type?: string;
      fileName?: string;
      name?: string;
      filePath?: string;
      fileUrl?: string;
      url?: string;
      fileSize?: number;
      mimeType?: string;
    }>;

    if (jsonbDocs.length === 0) {
      return 0;
    }

    // Insert documents into the documents table
    const docsToInsert = jsonbDocs.map((doc) => ({
      applicationId,
      documentType: doc.documentType || doc.type || 'document',
      fileName: doc.fileName || doc.name || 'Unnamed Document',
      filePath: doc.filePath || doc.fileUrl || doc.url || '',
      fileSize: doc.fileSize || 0,
      mimeType: doc.mimeType || 'application/octet-stream',
      isVerified: false,
      verificationStatus: 'pending' as const,
    }));

    await db.insert(documents).values(docsToInsert);

    return docsToInsert.length;
  }

  // Payment methods
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const result = await db.insert(payments).values(payment).returning();
    return result[0];
  }

  async updatePayment(id: string, updates: Partial<Payment>): Promise<Payment | undefined> {
    const result = await db.update(payments)
      .set(updates)
      .where(eq(payments.id, id))
      .returning();
    return result[0];
  }

  async getPaymentById(id: string): Promise<Payment | undefined> {
    const result = await db.select().from(payments)
      .where(eq(payments.id, id))
      .limit(1);
    return result[0];
  }

  async getPaymentsByApplication(applicationId: string): Promise<Payment[]> {
    return await db.select().from(payments)
      .where(eq(payments.applicationId, applicationId))
      .orderBy(desc(payments.initiatedAt));
  }

  // Notification methods
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const rawChannels = notification.channels as { email?: boolean; sms?: boolean; whatsapp?: boolean; inapp?: boolean } | undefined;
    const normalizedChannels = rawChannels
      ? ({
        email: rawChannels.email,
        sms: rawChannels.sms,
        whatsapp: rawChannels.whatsapp,
        inapp: rawChannels.inapp,
      } as InsertNotification["channels"])
      : undefined;

    const payload: InsertNotification = {
      ...notification,
      channels: normalizedChannels,
    };

    const result = await db.insert(notifications).values(payload as any).returning();
    return result[0];
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(notifications.id, id));
  }

  // Application Action methods
  async createApplicationAction(action: InsertApplicationAction): Promise<ApplicationAction> {
    const payload: InsertApplicationAction = {
      ...action,
      issuesFound: Array.isArray(action.issuesFound)
        ? action.issuesFound.map((issue) => String(issue))
        : undefined,
    };
    const result = await db.insert(applicationActions).values(payload as any).returning();
    return result[0];
  }

  async getApplicationActions(applicationId: string): Promise<ApplicationAction[]> {
    return await db.select().from(applicationActions)
      .where(eq(applicationActions.applicationId, applicationId))
      .orderBy(applicationActions.createdAt);
  }

  // Dev methods
  async getStats() {
    const { count } = await import('drizzle-orm');

    const [usersCountResult, appsCountResult, docsCountResult, paymentsCountResult] = await Promise.all([
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(homestayApplications),
      db.select({ count: count() }).from(documents),
      db.select({ count: count() }).from(payments),
    ]);

    const usersCount = usersCountResult[0]?.count ?? 0;
    const appsCount = appsCountResult[0]?.count ?? 0;
    const docsCount = docsCountResult[0]?.count ?? 0;
    const paymentsCount = paymentsCountResult[0]?.count ?? 0;

    return {
      users: Number(usersCount),
      applications: Number(appsCount),
      documents: Number(docsCount),
      payments: Number(paymentsCount),
    };
  }

  async clearAll(): Promise<void> {
    // Delete in reverse order of dependencies
    await db.delete(applicationActions);
    await db.delete(notifications);
    await db.delete(payments);
    await db.delete(documents);
    await db.delete(homestayApplications);
    await db.delete(users);
  }

  // Production Stats methods
  async saveProductionStats(stats: { totalApplications: number; approvedApplications: number; rejectedApplications: number; pendingApplications: number; sourceUrl: string }): Promise<void> {
    await db.insert(productionStats).values(stats);
  }

  async getLatestProductionStats(): Promise<{ totalApplications: number; approvedApplications: number; rejectedApplications: number; pendingApplications: number; scrapedAt: Date } | null> {
    const result = await db.select().from(productionStats)
      .orderBy(desc(productionStats.scrapedAt))
      .limit(1);

    if (!result[0]) return null;

    return {
      totalApplications: result[0].totalApplications,
      approvedApplications: result[0].approvedApplications,
      rejectedApplications: result[0].rejectedApplications,
      pendingApplications: result[0].pendingApplications,
      scrapedAt: result[0].scrapedAt || new Date()
    };
  }

  private async nextApplicationSequence(): Promise<number> {
    const [row] = await db
      .select({
        maxSerial: sql<number>`COALESCE(MAX(CAST(substring(${homestayApplications.applicationNumber} from '([0-9]+)$') AS INTEGER)), 0)`,
      })
      .from(homestayApplications);

    const seedRow = await db
      .select({ value: systemSettings.settingValue })
      .from(systemSettings)
      .where(eq(systemSettings.settingKey, APPLICATION_SERIAL_SEED_KEY))
      .limit(1);
    const seedValue = seedRow?.[0]?.value ? parseInt(seedRow[0].value, 10) : 0;
    const seed = Number.isFinite(seedValue) && seedValue > 0 ? seedValue : 0;

    const maxSerial = row?.maxSerial ?? 0;
    const baseline = Math.max(maxSerial, seed - 1);
    return baseline + 1;
  }
}
