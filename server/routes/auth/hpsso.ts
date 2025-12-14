/**
 * HP SSO Authentication Routes
 * Handles HP Gov Single Sign-On callbacks and user authentication
 */

import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import {
    validateHPSSOToken,
    checkHPSSOHealth,
    getHPSSOConfig,
    getHPSSOBaseUrl,
    type HPSSOUserData
} from '../../services/hpsso';
import { logger } from '../../logger';

const log = logger.child({ module: 'hpsso-routes' });

export const hpssoRouter = Router();

// Token validation request schema
const validateTokenSchema = z.object({
    token: z.string().min(1, 'Token is required'),
});

// Link account request schema
const linkAccountSchema = z.object({
    sso_id: z.number(),
    existing_user_id: z.string().uuid().optional(),
});

/**
 * GET /api/auth/hpsso/config
 * Returns HP SSO configuration for frontend (non-sensitive)
 */
hpssoRouter.get('/config', (req, res) => {
    const config = getHPSSOConfig();

    res.json({
        enabled: config.enabled,
        environment: config.environment,
        loginScriptUrl: config.enabled ? `${getHPSSOBaseUrl()}/login.js` : null,
        serviceId: config.enabled ? config.serviceId : null,
    });
});

/**
 * GET /api/auth/hpsso/health
 * Check HP SSO service health
 */
hpssoRouter.get('/health', async (req, res) => {
    try {
        const health = await checkHPSSOHealth();
        res.json(health);
    } catch (error) {
        log.error({ err: error }, 'HP SSO health check failed');
        res.status(500).json({ error: 'Health check failed' });
    }
});

/**
 * POST /api/auth/hpsso/callback
 * Handles callback from HP SSO I-frame after user authentication
 * This is called when the I-frame sends the token back to our app
 */
hpssoRouter.post('/callback', async (req, res) => {
    try {
        const validation = validateTokenSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                error: 'Invalid request',
                details: validation.error.errors
            });
        }

        const { token } = validation.data;

        // Validate token with HP SSO
        const ssoUserData = await validateHPSSOToken(token);

        log.info({
            sso_id: ssoUserData.sso_id,
            mobile: ssoUserData.mobile?.slice(-4)
        }, 'HP SSO callback received');

        // Check if user exists with this SSO ID
        const existingUserBySSOId = await db
            .select()
            .from(users)
            .where(eq(users.ssoId, ssoUserData.sso_id.toString()))
            .limit(1);

        if (existingUserBySSOId.length > 0) {
            // User already linked - log them in
            const user = existingUserBySSOId[0];

            // Set session
            req.session.userId = user.id;
            req.session.role = user.role;

            return res.json({
                success: true,
                action: 'login',
                user: {
                    id: user.id,
                    username: user.username,
                    fullName: user.fullName,
                    role: user.role,
                },
            });
        }

        // Check if user exists with same mobile number
        const existingUserByMobile = await db
            .select()
            .from(users)
            .where(eq(users.mobile, ssoUserData.mobile))
            .limit(1);

        if (existingUserByMobile.length > 0) {
            // Found existing user - offer to link accounts
            return res.json({
                success: true,
                action: 'link_required',
                sso_data: {
                    sso_id: ssoUserData.sso_id,
                    name: ssoUserData.name,
                    mobile: ssoUserData.mobile,
                    email: ssoUserData.email,
                    district: ssoUserData.dist,
                },
                existing_user: {
                    id: existingUserByMobile[0].id,
                    username: existingUserByMobile[0].username,
                    fullName: existingUserByMobile[0].fullName,
                },
                message: 'An account with this mobile number already exists. Would you like to link it?',
            });
        }

        // New user - return SSO data for registration
        return res.json({
            success: true,
            action: 'register',
            sso_data: {
                sso_id: ssoUserData.sso_id,
                name: ssoUserData.name,
                mobile: ssoUserData.mobile,
                email: ssoUserData.email,
                gender: ssoUserData.gender,
                dob: ssoUserData.dob,
                guardian_name: ssoUserData.co,
                address: formatAddress(ssoUserData),
                district: ssoUserData.dist,
                state: ssoUserData.state,
                pincode: ssoUserData.pc,
                aadhaar_verified: true,
            },
            message: 'Please complete your registration',
        });

    } catch (error) {
        log.error({ err: error }, 'HP SSO callback error');
        res.status(500).json({
            error: 'Authentication failed',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

/**
 * POST /api/auth/hpsso/link
 * Link an existing account to HP SSO
 */
hpssoRouter.post('/link', async (req, res) => {
    try {
        if (!req.session?.userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const validation = linkAccountSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                error: 'Invalid request',
                details: validation.error.errors
            });
        }

        const { sso_id } = validation.data;

        // Update user with SSO ID
        await db
            .update(users)
            .set({
                ssoId: sso_id.toString(),
                updatedAt: new Date(),
            })
            .where(eq(users.id, req.session.userId));

        log.info({
            userId: req.session.userId,
            sso_id
        }, 'Account linked to HP SSO');

        res.json({
            success: true,
            message: 'Account linked successfully'
        });

    } catch (error) {
        log.error({ err: error }, 'HP SSO link error');
        res.status(500).json({ error: 'Failed to link account' });
    }
});

/**
 * GET /api/auth/hpsso/status
 * Check if current user has HP SSO linked
 */
hpssoRouter.get('/status', async (req, res) => {
    try {
        if (!req.session?.userId) {
            return res.json({ linked: false, authenticated: false });
        }

        const user = await db
            .select({ ssoId: users.ssoId })
            .from(users)
            .where(eq(users.id, req.session.userId))
            .limit(1);

        const linked = user.length > 0 && !!user[0].ssoId;

        res.json({
            linked,
            authenticated: true,
        });

    } catch (error) {
        log.error({ err: error }, 'HP SSO status check error');
        res.status(500).json({ error: 'Status check failed' });
    }
});

/**
 * Helper: Format address from HP SSO data
 */
function formatAddress(data: HPSSOUserData): string {
    const parts = [
        data.street,
        data.lm,
        data.loc,
        data.vtc,
        data.dist,
        data.state,
        data.pc ? `PIN: ${data.pc}` : null,
    ].filter(Boolean);

    return parts.join(', ');
}
