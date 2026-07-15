export const PRICING_CURRENCY = "NGN";
export const ANNUAL_DISCOUNT_PERCENT = 20;

export function calculateAnnualPrice(monthlyPrice) {
  return Math.round(monthlyPrice * 12 * (1 - ANNUAL_DISCOUNT_PERCENT / 100));
}

export const professionalPlans = [
  {
    id: "basic",
    name: "Basic",
    audience: "New agents and individual landlords",
    monthlyPrice: 0,
    summary: "A credible public presence and the essentials for handling your first enquiries.",
    limits: { users: 1, activeListings: 5, branches: 0, hostedTours: 0 },
    features: [
      "1 user and 5 active listings",
      "Public professional profile and mini-site",
      "Basic lead inbox and WhatsApp contact link",
      "Shareable Nestora listing pages",
      "Basic listing analytics",
      "Availability reminders",
    ],
    cta: "Create a free account",
  },
  {
    id: "pro",
    name: "Pro",
    audience: "Active independent professionals",
    monthlyPrice: 30000,
    summary: "A focused CRM, inspection workflow and marketing toolkit for daily property work.",
    limits: { users: 2, activeListings: 40, branches: 0, hostedTours: 5 },
    features: [
      "2 users and 40 active listings",
      "Lead pipeline, customer notes and saved replies",
      "Follow-up reminders and inspection calendar",
      "Advanced analytics and lead-source tracking",
      "PDF brochures, QR codes and social scheduling",
      "5 hosted walkthroughs and AI-assisted drafts",
    ],
    cta: "Choose Pro",
    featured: true,
  },
  {
    id: "team",
    name: "Team",
    audience: "Small agencies and operating teams",
    monthlyPrice: 80000,
    summary: "Shared inventory, ownership and reporting for teams that need one source of truth.",
    limits: { users: 5, activeListings: 150, branches: 1, hostedTours: 20 },
    features: [
      "5 users and 150 active listings",
      "Shared inbox, lead assignment and team calendar",
      "Shared inventory and media library",
      "Approval workflows and manager analytics",
      "Role-based workspace access and one branch",
      "20 hosted walkthroughs",
    ],
    cta: "Choose Team",
  },
  {
    id: "agency",
    name: "Agency",
    audience: "Multi-branch property businesses",
    monthlyPrice: 200000,
    summary: "Routing, governance and integrations for established organisations operating at scale.",
    limits: { users: 20, activeListings: 500, branches: 5, hostedTours: 60 },
    features: [
      "20 users, 500 active listings and 5 branches",
      "Advanced permissions and compliance oversight",
      "Round-robin, territory and SLA lead routing",
      "Bulk import, API access and webhooks",
      "Custom domain and organisation branding",
      "60 hosted walkthroughs and account support",
    ],
    cta: "Discuss Agency",
  },
];

export const enterprisePlan = {
  id: "enterprise",
  name: "Nestora Enterprise",
  audience: "Large developers, hotel groups, institutions and national operators",
  summary: "Custom limits, multi-organisation governance, SSO-ready access, audit exports, migration and dedicated support under a written annual agreement.",
  cta: "Plan an enterprise rollout",
};

export const specialistPlans = [
  {
    id: "developer-studio",
    name: "Developer Studio",
    monthlyPrice: 250000,
    image: "/images/nestora/katampe-residences.webp",
    imageAlt: "Contemporary residential development in Katampe, Abuja",
    scope: "3 active developments, 500 units and 10 users",
    summary: "Development microsites, visual unit inventory, allocations, reservations, construction updates and buyer reporting.",
  },
  {
    id: "host-centre",
    name: "Host Centre",
    monthlyPrice: 40000,
    image: "/images/nestora/asokoro-rooftop.webp",
    imageAlt: "Premium hospitality terrace in Asokoro, Abuja",
    scope: "10 hospitality units and 3 users",
    summary: "Availability, direct enquiries, reservations, guest messaging, check-in workflows and booking analytics.",
  },
  {
    id: "property-manager",
    name: "Property Manager",
    monthlyPrice: 40000,
    image: "/images/nestora/guzape-duplex.webp",
    imageAlt: "Managed residential property in Guzape, Abuja",
    scope: "50 managed units and 5 users",
    summary: "Lease records, rent reminders, maintenance, vendors, inspections, expenses and owner reporting.",
  },
];

export const comparisonRows = [
  { label: "Workspace users", values: ["1", "2", "5", "20"] },
  { label: "Active listings", values: ["5", "40", "150", "500"] },
  { label: "Lead management", values: ["Basic inbox", "Full pipeline", "Shared pipeline", "Automated routing"] },
  { label: "Analytics", values: ["Listing basics", "Advanced", "Team and source", "Branch and SLA"] },
  { label: "Branches", values: ["-", "-", "1", "5"] },
  { label: "Hosted walkthroughs", values: ["-", "5", "20", "60"] },
  { label: "Branding", values: ["Nestora", "Profile", "Organisation", "Domain and organisation"] },
  { label: "API and webhooks", values: ["-", "-", "-", "Included"] },
];

export const addOnGroups = [
  {
    id: "capacity",
    title: "Capacity and brand",
    description: "Expand only the limits your team actually uses.",
    items: [
      { name: "25 additional active listings", price: 10000, unit: "month" },
      { name: "Additional workspace user", price: 12000, unit: "user / month" },
      { name: "Additional branch", price: 25000, unit: "month" },
      { name: "50 GB media storage", price: 10000, unit: "month" },
      { name: "White-label brand controls", price: 25000, unit: "month" },
      { name: "API and webhook access", price: 50000, unit: "month" },
    ],
  },
  {
    id: "media",
    title: "Property media",
    description: "Abuja launch pricing for professional capture and delivery.",
    items: [
      { name: "Photography essentials", price: 45000, unit: "property" },
      { name: "Photography and cinematic walkthrough", price: 85000, unit: "property" },
      { name: "Interactive 360 capture", price: 65000, unit: "property" },
      { name: "360 capture and measured floor plan", price: 95000, unit: "property" },
      { name: "Drone capture add-on", price: 75000, unit: "property" },
      { name: "Complete property launch media", price: 175000, unit: "property" },
    ],
  },
  {
    id: "trust",
    title: "Trust and onboarding",
    description: "Human review and setup services with a documented scope.",
    items: [
      { name: "Professional identity and business review", price: 15000, unit: "review" },
      { name: "Apartment on-site listing check", price: 25000, unit: "property" },
      { name: "House on-site listing check", price: 40000, unit: "property" },
      { name: "Data migration, up to 500 records", price: 50000, unit: "migration" },
      { name: "Pro or Team guided onboarding", price: 75000, unit: "engagement" },
      { name: "Agency or Developer onboarding", price: 150000, unit: "engagement" },
    ],
  },
];

export const marketplaceRates = [
  { name: "Creator Network", rate: 12, copy: "No recurring subscription. Nestora retains 12% only when a booked media job is completed." },
  { name: "Professional Services", rate: 10, copy: "No recurring subscription. Nestora retains 10% on completed work arranged through the platform." },
];

export const usageCharges = [
  "Payment processing is passed through at the provider's disclosed rate.",
  "WhatsApp and SMS usage is charged at provider cost plus a 10% handling margin, shown before sending.",
  "Travel, permits and unusual production scope are quoted before a media booking is confirmed.",
  "Statutory taxes are added only where required and shown on the invoice.",
];
