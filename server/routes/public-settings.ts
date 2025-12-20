import express from "express";
import { getSystemSettingRecord } from "../services/systemSettings";
import { logger } from "../logger";

const log = logger.child({ module: "public-settings-router" });

export function createPublicSettingsRouter() {
    const router = express.Router();

    // GET /api/settings/public
    // Returns configuration that the frontend needs before generic auth actions or for general UI
    router.get("/public", async (req, res) => {
        try {
            const [visibilitySetting, inspectionSetting] = await Promise.all([
                getSystemSettingRecord("service_visibility_config"),
                getSystemSettingRecord("inspection_config")
            ]);

            const visibility = (visibilitySetting?.settingValue as Record<string, boolean>) ?? {
                homestay: true,
                hotels: false,
                guest_houses: false,
                travel_agencies: false,
                adventure_tourism: true,
                transport: false,
                restaurants: false,
                winter_sports: false
            };

            const inspection = (inspectionSetting?.settingValue as { optionalKinds: string[] }) ?? {
                optionalKinds: []
            };

            res.json({
                serviceVisibility: visibility,
                inspectionConfig: inspection
            });
        } catch (error) {
            log.error({ err: error }, "Failed to fetch public settings");
            res.status(500).json({ message: "Failed to fetch public settings" });
        }
    });

    return router;
}
