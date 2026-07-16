export function assertSafeDemoTarget(environment = process.env) {
  if (environment.NESTORA_DEMO_MODE !== "true") {
    throw new Error("NESTORA_DEMO_MODE=true is required for demo data operations.");
  }

  const target = String(environment.NESTORA_ENVIRONMENT || "").toLowerCase();
  if (!new Set(["local", "test", "demo", "staging"]).has(target)) {
    throw new Error("NESTORA_ENVIRONMENT must be local, test, demo, or staging.");
  }

  const origin = String(environment.NEXT_PUBLIC_APP_ORIGIN || "").toLowerCase();
  if (origin.includes("nestora.doctarx.com")) {
    throw new Error("Demo data operations refuse the Nestora production origin.");
  }

  if (!environment.DATABASE_URL) throw new Error("DATABASE_URL is required for demo data operations.");
}

export function assertDemoPassword(password) {
  if (!password || password.length < 16) throw new Error("NESTORA_DEMO_PASSWORD must contain at least 16 characters.");
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    throw new Error("NESTORA_DEMO_PASSWORD must include upper, lower, number, and symbol characters.");
  }
}
