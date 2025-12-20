import express from "express";
import { requireAuth, requireRole } from "./core/middleware";
import { storage } from "../storage";
import { logger } from "../logger";
import { logApplicationAction } from "../audit";

const paymentsLog = logger.child({ module: "payments-router" });

export function createPaymentsRouter() {
    const router = express.Router();

    // Create payment
    router.post("/", requireAuth, async (req, res) => {
        try {
            const payment = await storage.createPayment(req.body);
            res.json({ payment });
        } catch (error) {
            paymentsLog.error({ err: error, route: "/" }, "Failed to create payment");
            res.status(500).json({ message: "Failed to create payment" });
        }
    });

    // Update payment (for gateway callback)
    router.patch("/:id", async (req, res) => {
        try {
            const payment = await storage.updatePayment(req.params.id, req.body);
            if (!payment) {
                return res.status(404).json({ message: "Payment not found" });
            }

            res.json({ payment });
        } catch (error) {
            paymentsLog.error({ err: error, route: "/:id" }, "Failed to update payment");
            res.status(500).json({ message: "Failed to update payment" });
        }
    });

    // Confirm payment (Officer only)
    router.post("/:id/confirm", requireRole("district_officer", "state_officer"), async (req, res) => {
        try {
            const userId = req.session.userId!;
            const payment = await storage.getPaymentById(req.params.id);
            if (!payment) {
                return res.status(404).json({ message: "Payment not found" });
            }

            // Update payment status to success
            await storage.updatePayment(req.params.id, {
                paymentStatus: "success",
                completedAt: new Date(),
            });

            // Update application status to approved and generate certificate number
            const application = await storage.getApplication(payment.applicationId);
            if (!application) {
                return res.status(404).json({ message: "Application not found" });
            }

            const certificateNumber = `HP-HST-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;
            const issueDate = new Date();
            const expiryDate = new Date(issueDate);
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
            const formatTimelineDate = (value: Date) =>
                value.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

            await storage.updateApplication(payment.applicationId, {
                status: "approved",
                certificateNumber,
                certificateIssuedDate: issueDate,
                certificateExpiryDate: expiryDate,
                approvedAt: issueDate,
            });

            // Application Lifecycle: If this was a service request (Add Rooms, etc.),
            // mark the parent application as superseded to prevent duplicates.
            if (application.parentApplicationId) {
                await storage.updateApplication(application.parentApplicationId, {
                    status: 'superseded',
                    districtNotes: `Superseded by application ${application.applicationNumber}`
                });
            }
            await logApplicationAction({
                applicationId: payment.applicationId,
                actorId: userId,
                action: "payment_confirmed",
                previousStatus: application.status,
                newStatus: "approved",
                feedback: "Payment confirmed manually by officer.",
            });
            await logApplicationAction({
                applicationId: payment.applicationId,
                actorId: userId,
                action: "certificate_issued",
                previousStatus: "approved",
                newStatus: "approved",
                feedback: `Certificate ${certificateNumber} issued on ${formatTimelineDate(issueDate)} (valid till ${formatTimelineDate(
                    expiryDate,
                )})`,
            });

            res.json({ message: "Payment confirmed and certificate issued" });
        } catch (error) {
            paymentsLog.error({ err: error, route: "/:id/confirm" }, "Failed to confirm payment");
            res.status(500).json({ message: "Failed to confirm payment" });
        }
    });

    return router;
}
