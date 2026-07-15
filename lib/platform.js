export const modes = [
  { value: "stay", label: "Stay" },
  { value: "rent", label: "Rent" },
  { value: "buy", label: "Buy" },
  { value: "new", label: "New homes" },
];

export function formatNaira(value, compact = false) {
  if (!Number.isFinite(Number(value))) return "₦0";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
    notation: compact ? "compact" : "standard",
  }).format(Number(value));
}

export function priceLabel(property, compact = false) {
  const suffix = property.cadence === "night" ? " / night" : property.cadence === "year" ? " / year" : property.cadence === "from" ? " · from" : "";
  return `${formatNaira(property.price, compact)}${suffix}`;
}

export function calculateStayTotal(property, nights = 3) {
  const nightly = property.fees?.nightly ?? property.price;
  const subtotal = nightly * Math.max(1, Number(nights) || 1);
  const extras = Object.entries(property.fees ?? {})
    .filter(([key]) => key !== "nightly")
    .reduce((sum, [, value]) => sum + value, 0);
  return { nightly, nights: Math.max(1, Number(nights) || 1), subtotal, extras, total: subtotal + extras };
}

export function filterProperties(items, filters = {}) {
  const query = String(filters.query ?? "").trim().toLowerCase();
  return items.filter((property) => {
    const modeMatch = !filters.mode || property.mode === filters.mode;
    const areaMatch = !filters.area || property.area.toLowerCase() === String(filters.area).toLowerCase();
    const queryMatch = !query || `${property.title} ${property.location} ${property.description}`.toLowerCase().includes(query);
    const maxMatch = !filters.maxPrice || property.price <= Number(filters.maxPrice);
    const bedMatch = !filters.beds || property.beds >= Number(filters.beds);
    return modeMatch && areaMatch && queryMatch && maxMatch && bedMatch;
  });
}

export function initials(name = "") {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export function makeReference(prefix = "NST") {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}
