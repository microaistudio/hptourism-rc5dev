
import fetch from "node-fetch";
import { strict as assert } from "assert";

const BASE_URL = "http://localhost:5000";

async function verifyLogin() {
    console.log("🧪 Starting login verification...");

    // 1. Register a new user
    const mobile = "9" + Math.floor(Math.random() * 1000000000).toString().padStart(9, "0");
    const password = "password123";

    console.log(`👤 Registering user with mobile: ${mobile}`);

    const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            fullName: "Test User",
            mobile,
            password,
            confirmPassword: password,
            role: "property_owner"
        }),
    });

    if (!registerRes.ok) {
        const text = await registerRes.text();
        console.error(`❌ Registration failed: ${registerRes.status} ${text}`);
        process.exit(1);
    }

    console.log("✅ Registration successful");

    // 2. Login
    console.log("🔐 Attempting login...");
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            identifier: mobile,
            password,
            authMode: "password"
        }),
    });

    if (!loginRes.ok) {
        const text = await loginRes.text();
        console.error(`❌ Login failed: ${loginRes.status} ${text}`);
        process.exit(1);
    }

    // 3. Check Cookies
    const cookies = loginRes.headers.raw()["set-cookie"];
    if (!cookies || cookies.length === 0) {
        console.error("❌ No cookies received!");
        process.exit(1);
    }

    console.log("🍪 Received cookies:", cookies);

    const sessionCookie = cookies.find(c => c.startsWith("connect.sid="));
    if (!sessionCookie) {
        console.error("❌ Session cookie (connect.sid) not found!");
        process.exit(1);
    }

    // Check cookie attributes
    // In dev (HTTP), it should NOT have "Secure" (or it might be ignored by fetch but present in string)
    // The string usually looks like: connect.sid=...; Path=/; HttpOnly; SameSite=Lax

    console.log(`🔍 Session Cookie: ${sessionCookie}`);

    if (sessionCookie.includes("Secure")) {
        console.warn("⚠️  Cookie has 'Secure' attribute. If running on HTTP, this might be rejected by browsers.");
    } else {
        console.log("✅ Cookie does NOT have 'Secure' attribute (Correct for Dev/HTTP)");
    }

    if (sessionCookie.includes("SameSite=Lax")) {
        console.log("✅ Cookie has 'SameSite=Lax' (Correct for Dev/HTTP)");
    } else {
        console.warn(`⚠️  Cookie SameSite attribute is unexpected: ${sessionCookie}`);
    }

    console.log("🎉 Verification passed!");
}

verifyLogin().catch(err => {
    console.error("🚨 Verification failed:", err);
    process.exit(1);
});
