#!/usr/bin/env tsx
/**
 * HP Tourism RC4 – Smoke-Test Harness
 *
 * Runs five representative applications (owner → DA → DTDO → certificate) using
 * the existing REST APIs + session cookies. Designed to be idempotent so it can
 * run before every STG dry-run.
 */

import fs from "fs";
import path from "path";
import { setTimeout as sleep } from "timers/promises";
import fetch from "node-fetch";

type UserCredentials = {
  mobile: string;
  password: string;
};

type SmokeAppConfig = {
  label: string;
  district: string;
  category: "silver" | "gold" | "diamond";
  locationType: "gp" | "mc" | "tcp";
  rooms: number;
  scenario: "new" | "renewal" | "add_rooms" | "delete_rooms";
  serviceBaseApplicationId?: string;
};

type SessionCookie = { name: string; value: string };

type SmokeReport = {
  id: string;
  label: string;
  applicationNumber?: string;
  steps: Array<{
    name: string;
    status: "pending" | "success" | "failed";
    detail?: string;
    startedAt?: string;
    finishedAt?: string;
  }>;
  error?: string;
};

const OWNER_CREDS: UserCredentials = {
  mobile: process.env.SMOKE_OWNER_MOBILE || "7777777771",
  password: process.env.SMOKE_OWNER_PASSWORD || "test123",
};

const DA_CREDS: UserCredentials = {
  mobile: process.env.SMOKE_DA_MOBILE || "7777777772",
  password: process.env.SMOKE_DA_PASSWORD || "test123",
};

const DTDO_CREDS: UserCredentials = {
  mobile: process.env.SMOKE_DTDO_MOBILE || "7777777773",
  password: process.env.SMOKE_DTDO_PASSWORD || "test123",
};

const BASE_URL = process.env.SMOKE_BASE_URL || "http://localhost:5000";

const APPS: SmokeAppConfig[] = [
  {
    label: "Gold MC New",
    district: "Kullu",
    category: "gold",
    locationType: "mc",
    rooms: 4,
    scenario: "new",
  },
  {
    label: "Diamond TCP New",
    district: "Kangra",
    category: "diamond",
    locationType: "tcp",
    rooms: 6,
    scenario: "new",
  },
  {
    label: "Silver GP Add Rooms",
    district: "Chamba",
    category: "silver",
    locationType: "gp",
    rooms: 2,
    scenario: "add_rooms",
  },
  {
    label: "Gold MC Delete Rooms",
    district: "Solan",
    category: "gold",
    locationType: "mc",
    rooms: 5,
    scenario: "delete_rooms",
  },
  {
    label: "Silver GP Renewal",
    district: "Shimla",
    category: "silver",
    locationType: "gp",
    rooms: 3,
    scenario: "renewal",
  },
];

async function login(credentials: UserCredentials): Promise<SessionCookie[]> {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mobile: credentials.mobile,
      password: credentials.password,
    }),
    redirect: "manual",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Login failed for ${credentials.mobile}: ${text}`);
  }

  const rawCookies = response.headers.raw()["set-cookie"] || [];
  return rawCookies
    .map((cookie) => {
      const [pair] = cookie.split(";");
      const [name, value] = pair.split("=");
      return { name, value };
    })
    .filter((cookie) => Boolean(cookie.name && cookie.value));
}

function cookiesToHeader(cookies: SessionCookie[]) {
  return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
}

async function ownerCreateApplication(
  cookies: SessionCookie[],
  config: SmokeAppConfig,
): Promise<{ id: string; applicationNumber: string }> {
  const payload = {
    propertyName: `${config.label} Property`,
    address: "Smoke Test Lane, Himachal Pradesh",
    district: config.district,
    pincode: "171001",
    locationType: config.locationType,
    telephone: "0177-0000000",
    ownerEmail: "owner@example.com",
    ownerMobile: OWNER_CREDS.mobile,
    ownerName: "Smoke Owner",
    ownerFirstName: "Smoke",
    ownerLastName: "Owner",
    ownerAadhaar: "123456789012",
    ownerGender: "male",
    propertyOwnership: "owned",
    category: config.category,
    proposedRoomRate: 3500,
    singleBedRoomRate: 2000,
    doubleBedRoomRate: 4000,
    familySuiteRate: 6000,
    distanceAirport: 10,
    distanceRailway: 20,
    distanceCityCenter: 5,
    distanceShopping: 3,
    distanceBusStand: 2,
    projectType: "new_project",
    propertyArea: 1200,
    singleBedRooms: config.rooms,
    singleBedBeds: 1,
    doubleBedRooms: 0,
    doubleBedBeds: 2,
    familySuites: 0,
    familySuiteBeds: 4,
    attachedWashrooms: config.rooms,
    gstin: "",
    certificateValidityYears: 1,
    isPangiSubDivision: false,
    totalRooms: config.rooms,
    baseFee: 5000,
    totalBeforeDiscounts: 5000,
    validityDiscount: 0,
    femaleOwnerDiscount: 0,
    pangiDiscount: 0,
    totalDiscount: 0,
    totalFee: 5000,
    documents: [],
  };

  const response = await fetch(`${BASE_URL}/api/applications`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookiesToHeader(cookies),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to submit application for ${config.label}: ${response.statusText}`,
    );
  }

  const { application } = (await response.json()) as {
    application: { id: string; applicationNumber: string };
  };
  return application;
}

async function daStartScrutiny(
  cookies: SessionCookie[],
  applicationId: string,
): Promise<void> {
  const response = await fetch(
    `${BASE_URL}/api/da/applications/${applicationId}/start-scrutiny`,
    {
      method: "POST",
      headers: {
        Cookie: cookiesToHeader(cookies),
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `DA start scrutiny failed for ${applicationId}: ${response.statusText}`,
    );
  }
}

async function daForwardToDTDO(
  cookies: SessionCookie[],
  applicationId: string,
): Promise<void> {
  const response = await fetch(
    `${BASE_URL}/api/da/applications/${applicationId}/forward-to-dtdo`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookiesToHeader(cookies),
      },
      body: JSON.stringify({
        remarks: "Smoke-test automated forwarding.",
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `DA forward failed for ${applicationId}: ${response.status} ${text}`,
    );
  }
}

async function dtdoAcceptApplication(
  cookies: SessionCookie[],
  applicationId: string,
): Promise<void> {
  const response = await fetch(
    `${BASE_URL}/api/dtdo/applications/${applicationId}/accept`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookiesToHeader(cookies),
      },
      body: JSON.stringify({
        remarks: "Smoke-test: scheduling inspection.",
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `DTDO accept failed for ${applicationId}: ${response.status} ${text}`,
    );
  }
}

async function dtdoScheduleInspection(
  cookies: SessionCookie[],
  applicationId: string,
): Promise<void> {
  const response = await fetch(
    `${BASE_URL}/api/dtdo/applications/${applicationId}/schedule-inspection`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookiesToHeader(cookies),
      },
      body: JSON.stringify({
        inspectionDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        inspectionAddress: "Smoke Test Inspection Address",
        assignedTo: DA_CREDS.mobile,
        specialInstructions: "Automated test inspection.",
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Schedule inspection failed for ${applicationId}: ${response.status} ${text}`,
    );
  }
}

async function dtdoApprove(
  cookies: SessionCookie[],
  applicationId: string,
): Promise<void> {
  const response = await fetch(
    `${BASE_URL}/api/dtdo/applications/${applicationId}/accept`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookiesToHeader(cookies),
      },
      body: JSON.stringify({
        remarks: "Smoke-test approval",
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `DTDO final approval failed for ${applicationId}: ${response.status} ${text}`,
    );
  }
}

async function fetchCertificateMeta(
  cookies: SessionCookie[],
  applicationId: string,
): Promise<any> {
  const response = await fetch(
    `${BASE_URL}/api/applications/${applicationId}/certificate`,
    {
      method: "GET",
      headers: {
        Cookie: cookiesToHeader(cookies),
      },
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Fetch certificate failed for ${applicationId}: ${response.status} ${text}`,
    );
  }

  return response.json();
}

async function runSmokeTest() {
  const startedAt = new Date();
  const reportDir = path.join(
    "docs",
    "smoke-reports",
    startedAt.toISOString().replace(/[:.]/g, "-"),
  );
  fs.mkdirSync(reportDir, { recursive: true });

  console.log("🔐 Logging in as owner/DA/DTDO…");
  const ownerCookies = await login(OWNER_CREDS);
  const daCookies = await login(DA_CREDS);
  const dtdoCookies = await login(DTDO_CREDS);
  console.log("✅ Sessions acquired.");

  const reports: SmokeReport[] = [];

  for (const config of APPS) {
    const report: SmokeReport = {
      id: config.label.toLowerCase().replace(/\s+/g, "-"),
      label: config.label,
      steps: [
        { name: "OwnerSubmit", status: "pending" },
        { name: "DAStartScrutiny", status: "pending" },
        { name: "DAForward", status: "pending" },
        { name: "DTDOAccept", status: "pending" },
        { name: "DTDOScheduleInspection", status: "pending" },
        { name: "DTDOApprove", status: "pending" },
        { name: "Certificate", status: "pending" },
      ],
    };

    reports.push(report);

    try {
      const ownerStep = report.steps[0];
      ownerStep.startedAt = new Date().toISOString();
      const application = await ownerCreateApplication(ownerCookies, config);
      report.applicationNumber = application.applicationNumber;
      ownerStep.status = "success";
      ownerStep.finishedAt = new Date().toISOString();
      const steps = [
        {
          name: "DAStartScrutiny",
          run: () => daStartScrutiny(daCookies, application.id),
        },
        {
          name: "DAForward",
          run: () => daForwardToDTDO(daCookies, application.id),
        },
        {
          name: "DTDOAccept",
          run: () => dtdoAcceptApplication(dtdoCookies, application.id),
        },
        {
          name: "DTDOScheduleInspection",
          run: () => dtdoScheduleInspection(dtdoCookies, application.id),
        },
        {
          name: "DTDOApprove",
          run: () => dtdoApprove(dtdoCookies, application.id),
        },
        {
          name: "Certificate",
          run: () => fetchCertificateMeta(ownerCookies, application.id),
        },
      ];

      for (let i = 0; i < steps.length; i++) {
        const stepConfig = steps[i];
        const stepReport = report.steps[i + 1];
        stepReport.startedAt = new Date().toISOString();
        await stepConfig.run();
        stepReport.status = "success";
        stepReport.finishedAt = new Date().toISOString();
        await sleep(250);
      }
    } catch (error) {
      const currentStep = report.steps.find((step) => step.status === "pending");
      if (currentStep) {
        currentStep.status = "failed";
        currentStep.finishedAt = new Date().toISOString();
        currentStep.detail =
          error instanceof Error ? error.message : String(error);
      }
      report.error =
        error instanceof Error ? error.message : "Unknown smoke-test error";
      console.error(`❌ ${config.label} failed:`, report.error);
    }
  }

  const reportPath = path.join(reportDir, "report.json");
  fs.writeFileSync(reportPath, JSON.stringify({ startedAt, reports }, null, 2));
  console.log(`📄 Smoke report written to ${reportPath}`);

  const failed = reports.some((r) =>
    r.steps.some((step) => step.status === "failed"),
  );
  if (failed) {
    process.exitCode = 1;
    console.error("❌ Smoke-test detected failures. See report for details.");
  } else {
    console.log("✅ Smoke-test completed successfully.");
  }
}

runSmokeTest().catch((error) => {
  console.error("🚨 Smoke-test crashed:", error);
  process.exit(1);
});
