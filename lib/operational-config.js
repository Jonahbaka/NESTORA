const DEFAULT_OPERATIONAL_EMAIL = "jonahbaka00@gmail.com";

function configuredEmail(...keys) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return DEFAULT_OPERATIONAL_EMAIL;
}

export function getContactEmail() {
  return configuredEmail("CONTACT_EMAIL", "SUPPORT_EMAIL", "ADMIN_EMAIL");
}

export function getSupportEmail() {
  return configuredEmail("SUPPORT_EMAIL", "CONTACT_EMAIL", "ADMIN_EMAIL");
}
