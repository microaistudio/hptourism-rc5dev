import { type User, type InsertUser, type HomestayApplication, type InsertHomestayApplication, type Document, type InsertDocument, type Payment, type InsertPayment, type Notification, type InsertNotification, type ApplicationAction, type InsertApplicationAction } from "@shared/schema";
import { randomUUID } from "crypto";
import { config } from "@shared/config";
import { normalizeUsername } from "@shared/userUtils";
import { formatApplicationNumber } from "@shared/applicationNumber";
import { deriveDistrictRoutingLabel } from "@shared/districtRouting";
import { lookupStaffAccountByIdentifier } from "@shared/districtStaffManifest";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByMobile(mobile: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  // Homestay Application methods
  getApplication(id: string): Promise<HomestayApplication | undefined>;
  getApplicationsByUser(userId: string): Promise<HomestayApplication[]>;
  getApplicationsByDistrict(district: string): Promise<HomestayApplication[]>;
  getApplicationsByStatus(status: string): Promise<HomestayApplication[]>;
  getAllApplications(): Promise<HomestayApplication[]>;
  createApplication(app: InsertHomestayApplication, options?: { trusted?: boolean }): Promise<HomestayApplication>;
  updateApplication(id: string, app: Partial<HomestayApplication>): Promise<HomestayApplication | undefined>;

  // Document methods
  createDocument(doc: InsertDocument): Promise<Document>;
  getDocumentsByApplication(applicationId: string): Promise<Document[]>;
  deleteDocumentsByApplication(applicationId: string): Promise<void>;
  syncDocumentsFromJsonb?(applicationId: string): Promise<number>;

  // Payment methods
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, payment: Partial<Payment>): Promise<Payment | undefined>;
  getPaymentById(id: string): Promise<Payment | undefined>;
  getPaymentsByApplication(applicationId: string): Promise<Payment[]>;

  // Notification methods
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<void>;

  // Application Action methods
  createApplicationAction(action: InsertApplicationAction): Promise<ApplicationAction>;
  getApplicationActions(applicationId: string): Promise<ApplicationAction[]>;

  // Production Stats methods
  saveProductionStats(stats: { totalApplications: number; approvedApplications: number; rejectedApplications: number; pendingApplications: number; sourceUrl: string }): Promise<void>;
  getLatestProductionStats(): Promise<{ totalApplications: number; approvedApplications: number; rejectedApplications: number; pendingApplications: number; scrapedAt: Date } | null>;

  // Dev methods
  getStats(): Promise<{ users: number; applications: number; documents: number; payments: number }>;
  clearAll(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private applications: Map<string, HomestayApplication>;
  private documents: Map<string, Document>;
  private payments: Map<string, Payment>;
  private notifications: Map<string, Notification>;
  private applicationActions: Map<string, ApplicationAction>;

  private static normalizeNullable<T extends Record<string, any>>(input: T): T {
    const normalized: Record<string, any> = { ...input };
    for (const key of Object.keys(normalized)) {
      if (normalized[key] === undefined) {
        normalized[key] = null;
      }
    }
    return normalized as T;
  }

  constructor() {
    this.users = new Map();
    this.applications = new Map();
    this.documents = new Map();
    this.payments = new Map();
    this.notifications = new Map();
    this.applicationActions = new Map();
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByMobile(mobile: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.mobile === mobile,
    );
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const normalized = normalizeUsername(username);
    if (!normalized) {
      return undefined;
    }
    const match = Array.from(this.users.values()).find(
      (user) => user.username === normalized,
    );
    if (match) {
      return match;
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
    return Array.from(this.users.values()).find(
      (user) => (user.email ?? "").toLowerCase() === normalized,
    );
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const now = new Date();
    const normalizedUsername = normalizeUsername(insertUser.username);
    const user: User = {
      ...insertUser,
      id,
      fullName: insertUser.fullName,
      firstName: insertUser.firstName ?? null,
      lastName: insertUser.lastName ?? null,
      username: normalizedUsername,
      email: insertUser.email ?? null,
      alternatePhone: insertUser.alternatePhone ?? null,
      designation: insertUser.designation ?? null,
      department: insertUser.department ?? null,
      employeeId: insertUser.employeeId ?? null,
      officeAddress: insertUser.officeAddress ?? null,
      officePhone: insertUser.officePhone ?? null,
      aadhaarNumber: insertUser.aadhaarNumber ?? null,
      district: insertUser.district ?? null,
      password: insertUser.password ?? null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const processedUpdates: Partial<User> = {
      ...updates,
    };
    if (updates.username !== undefined) {
      processedUpdates.username = normalizeUsername(updates.username);
    }

    const updatedUser: User = {
      ...user,
      ...processedUpdates,
      id: user.id, // Prevent ID from being changed
      createdAt: user.createdAt, // Preserve creation date
      updatedAt: new Date(), // Update modification date
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Homestay Application methods
  async getApplication(id: string): Promise<HomestayApplication | undefined> {
    return this.applications.get(id);
  }

  async getApplicationsByUser(userId: string): Promise<HomestayApplication[]> {
    return Array.from(this.applications.values())
      .filter(app => app.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
  }

  async getApplicationsByDistrict(district: string): Promise<HomestayApplication[]> {
    // District officers should only see applications pending review
    return Array.from(this.applications.values()).filter(
      app => app.district === district && app.status === 'pending'
    );
  }

  async getApplicationsByStatus(status: string): Promise<HomestayApplication[]> {
    return Array.from(this.applications.values()).filter(app => app.status === status);
  }

  async getAllApplications(): Promise<HomestayApplication[]> {
    return Array.from(this.applications.values());
  }

  async createApplication(insertApp: InsertHomestayApplication, options?: { trusted?: boolean }): Promise<HomestayApplication> {
    const routedDistrict = deriveDistrictRoutingLabel(insertApp.district, insertApp.tehsil);
    const normalizedInsert: InsertHomestayApplication = {
      ...insertApp,
      district: routedDistrict ?? insertApp.district,
    };
    const id = randomUUID();
    const now = new Date();
    const applicationNumber = formatApplicationNumber(this.applications.size + 1, normalizedInsert.district);

    // Security: Only trusted server code (not client requests) can override status
    // Untrusted calls (from client) always get 'draft' status
    const isTrusted = options?.trusted === true;
    const status = isTrusted && normalizedInsert.status ? normalizedInsert.status : 'draft';
    const submittedAt = isTrusted && normalizedInsert.submittedAt ? normalizedInsert.submittedAt : (status === 'pending' ? now : null);
    const currentStage = status === 'pending' ? 'district' : null;

    const applicationKind = insertApp.applicationKind ?? 'new_registration';
    const app = ({
      ...(MemStorage.normalizeNullable(normalizedInsert) as InsertHomestayApplication),
      id,
      applicationNumber,
      applicationKind,
      latitude: insertApp.latitude ?? null,
      longitude: insertApp.longitude ?? null,
      ownerEmail: insertApp.ownerEmail ?? null,
      amenities: (insertApp.amenities ?? null) as any,
      rooms: (insertApp.rooms ?? null) as any,
      status,
      currentStage,
      districtOfficerId: null,
      districtReviewDate: null,
      districtNotes: null,
      stateOfficerId: null,
      stateReviewDate: null,
      stateNotes: null,
      rejectionReason: null,
      clarificationRequested: null,
      certificateNumber: null,
      certificateIssuedDate: null,
      certificateExpiryDate: null,
      submittedAt,
      approvedAt: null,
      createdAt: now,
      updatedAt: now,
    } as unknown) as HomestayApplication;

    this.applications.set(id, app);
    return app;
  }

  async updateApplication(id: string, update: Partial<HomestayApplication>): Promise<HomestayApplication | undefined> {
    const existing = this.applications.get(id);
    if (!existing) return undefined;

    const updated: HomestayApplication = {
      ...existing,
      ...update,
      updatedAt: new Date(),
    };

    this.applications.set(id, updated);
    return updated;
  }

  // Document methods
  async createDocument(insertDoc: InsertDocument): Promise<Document> {
    const id = randomUUID();
    const now = new Date();

    const doc = ({
      ...MemStorage.normalizeNullable(insertDoc),
      id,
      uploadDate: now,
      aiVerificationStatus: insertDoc.aiVerificationStatus ?? null,
      aiConfidenceScore: insertDoc.aiConfidenceScore ?? null,
      aiNotes: insertDoc.aiNotes ?? null,
      isVerified: insertDoc.isVerified ?? false,
      verifiedBy: insertDoc.verifiedBy ?? null,
      verificationDate: insertDoc.verificationDate ?? null,
      verificationNotes: insertDoc.verificationNotes ?? null,
      verificationStatus: insertDoc.verificationStatus ?? 'pending',
    } as unknown) as Document;

    this.documents.set(id, doc);
    return doc;
  }

  async getDocumentsByApplication(applicationId: string): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(doc => doc.applicationId === applicationId);
  }

  async deleteDocumentsByApplication(applicationId: string): Promise<void> {
    for (const [id, doc] of Array.from(this.documents.entries())) {
      if (doc.applicationId === applicationId) {
        this.documents.delete(id);
      }
    }
  }

  async syncDocumentsFromJsonb(_applicationId: string): Promise<number> {
    // MemStorage doesn't need sync as it doesn't use separate table
    return 0;
  }

  // Payment methods
  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const id = randomUUID();
    const now = new Date();
    const receiptNumber = `REC-2025-${String(this.payments.size + 1).padStart(6, '0')}`;

    const payment = ({
      ...MemStorage.normalizeNullable(insertPayment),
      id,
      paymentGateway: insertPayment.paymentGateway ?? null,
      gatewayTransactionId: insertPayment.gatewayTransactionId ?? null,
      paymentMethod: insertPayment.paymentMethod ?? null,
      paymentStatus: insertPayment.paymentStatus ?? 'pending',
      initiatedAt: now,
      completedAt: insertPayment.completedAt ?? null,
      receiptNumber,
      receiptUrl: insertPayment.receiptUrl ?? null,
      paymentLink: insertPayment.paymentLink ?? null,
      qrCodeUrl: insertPayment.qrCodeUrl ?? null,
      paymentLinkExpiryDate: insertPayment.paymentLinkExpiryDate ?? null,
    } as unknown) as Payment;

    this.payments.set(id, payment);
    return payment;
  }

  async updatePayment(id: string, update: Partial<Payment>): Promise<Payment | undefined> {
    const existing = this.payments.get(id);
    if (!existing) return undefined;

    const updated: Payment = {
      ...existing,
      ...update,
    };

    this.payments.set(id, updated);
    return updated;
  }

  async getPaymentById(id: string): Promise<Payment | undefined> {
    return this.payments.get(id);
  }

  async getPaymentsByApplication(applicationId: string): Promise<Payment[]> {
    return Array.from(this.payments.values()).filter(payment => payment.applicationId === applicationId);
  }

  // Notification methods
  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = randomUUID();
    const now = new Date();

    const rawChannels = insertNotification.channels as { email?: boolean; sms?: boolean; whatsapp?: boolean; inapp?: boolean } | undefined;
    const normalizedChannels = rawChannels
      ? ({
        email: rawChannels.email,
        sms: rawChannels.sms,
        whatsapp: rawChannels.whatsapp,
        inapp: rawChannels.inapp,
      } as Notification["channels"])
      : { inapp: true, email: false, sms: false, whatsapp: false };

    const notification: Notification = {
      ...insertNotification,
      id,
      applicationId: insertNotification.applicationId || null,
      channels: normalizedChannels,
      isRead: false,
      readAt: null,
      createdAt: now,
    };

    this.notifications.set(id, notification);
    return notification;
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notif => notif.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async markNotificationAsRead(id: string): Promise<void> {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.isRead = true;
      notification.readAt = new Date();
      this.notifications.set(id, notification);
    }
  }

  // Application Action methods
  async createApplicationAction(insertAction: InsertApplicationAction): Promise<ApplicationAction> {
    const id = randomUUID();
    const now = new Date();

    const action: ApplicationAction = {
      ...insertAction,
      id,
      previousStatus: insertAction.previousStatus || null,
      newStatus: insertAction.newStatus || null,
      feedback: insertAction.feedback || null,
      issuesFound: Array.isArray(insertAction.issuesFound)
        ? insertAction.issuesFound.map((issue) => String(issue))
        : null,
      createdAt: now,
    };

    this.applicationActions.set(id, action);
    return action;
  }

  async getApplicationActions(applicationId: string): Promise<ApplicationAction[]> {
    return Array.from(this.applicationActions.values())
      .filter(action => action.applicationId === applicationId)
      .sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));
  }

  // Production Stats methods (stub for MemStorage - not used in production)
  async saveProductionStats(stats: { totalApplications: number; approvedApplications: number; rejectedApplications: number; pendingApplications: number; sourceUrl: string }): Promise<void> {
    // No-op for MemStorage
  }

  async getLatestProductionStats(): Promise<{ totalApplications: number; approvedApplications: number; rejectedApplications: number; pendingApplications: number; scrapedAt: Date } | null> {
    return null;
  }

  // Dev methods
  async getStats() {
    return {
      users: this.users.size,
      applications: this.applications.size,
      documents: this.documents.size,
      payments: this.payments.size,
    };
  }

  async clearAll() {
    this.users.clear();
    this.applications.clear();
    this.documents.clear();
    this.payments.clear();
    this.notifications.clear();
    this.applicationActions.clear();
  }
}

import { DbStorage } from './db-storage';

// Use DbStorage by default (PostgreSQL)
// Set USE_MEM_STORAGE=true to use in-memory storage (testing only)
export const storage: IStorage = config.storage.useMemory
  ? new MemStorage()
  : new DbStorage();
