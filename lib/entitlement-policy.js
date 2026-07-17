const planPolicies = {
  basic: { activeListings: 5, users: 1, features: ["media_upload"] },
  pilot: { activeListings: 40, users: 2, features: ["media_upload", "marketing_generation"] },
  pro: { activeListings: 40, users: 2, features: ["media_upload", "marketing_generation"] },
  team: { activeListings: 150, users: 5, features: ["media_upload", "marketing_generation", "team_management"] },
  agency: { activeListings: 500, users: 20, features: ["media_upload", "marketing_generation", "team_management", "lead_routing", "external_delivery"] },
  "developer-studio": { activeListings: 20, users: 10, features: ["media_upload", "marketing_generation", "developer_inventory", "external_delivery"] },
  "hotel-operations": { activeListings: 10, users: 3, features: ["media_upload", "marketing_generation", "hotel_inventory", "external_delivery"] },
  "host-centre": { activeListings: 10, users: 3, features: ["media_upload", "marketing_generation", "hotel_inventory", "external_delivery"] },
  enterprise: { activeListings: 100000, users: 100000, features: ["media_upload", "marketing_generation", "team_management", "lead_routing", "developer_inventory", "hotel_inventory", "external_delivery"] },
};

export function getPlanPolicy(planId) {
  const policy = planPolicies[planId] || planPolicies.basic;
  return { activeListings: policy.activeListings, users: policy.users, features: [...policy.features] };
}
