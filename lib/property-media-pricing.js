export const PROPERTY_MEDIA_PRICING = Object.freeze({
  currency: "NGN",
  taxMode: "exclusive",
  taxRatePercent: 0,
  taxLabel: "Prices exclude statutory taxes where applicable. The configured launch tax rate is 0%.",
  depositPercent: 50,
  balancePolicy: "The remaining balance is due before delivery of unwatermarked final media.",
  includedRadiusKm: 25,
  additionalKmRateNgn: 1500,
  hostingRenewalNgn: 60000,
  packages: [
    {
      id: "essential-photography",
      name: "Essential Photography",
      priceNgn: 75000,
      startingFrom: false,
      includes: ["Up to 15 professionally edited photos", "Interior and exterior coverage", "One property", "Web-ready image delivery"],
      maximums: "15 edited photographs · one property",
      onsiteTime: "Up to 90 minutes",
      delivery: "Within three business days",
      revisions: "One reasonable correction round",
      hosting: "Not applicable",
      likelyAdditionalCharges: "Travel beyond 25 km, weekend, express delivery and selected extras",
      suitableFor: ["Apartments", "Small homes", "Standard rental listings"],
    },
    {
      id: "professional-listing",
      name: "Professional Listing Package",
      priceNgn: 150000,
      startingFrom: false,
      includes: ["Up to 30 professionally edited photos", "Interior, exterior, detail and amenity coverage", "One short vertical social video", "Listing-ready image set"],
      maximums: "30 edited photographs · one vertical social video",
      onsiteTime: "Up to three hours",
      delivery: "Within three business days",
      revisions: "One photo correction round and one video correction round",
      hosting: "Not applicable",
      likelyAdditionalCharges: "Travel beyond 25 km, permits, weekend, express delivery and selected extras",
      suitableFor: ["Premium rentals", "Homes for sale", "Agent and agency listings"],
    },
    {
      id: "virtual-tour",
      name: "360° Virtual Tour Package",
      priceNgn: 225000,
      startingFrom: false,
      includes: ["Professional property photography", "Up to eight connected 360° scenes", "Scene labels and navigation", "Hosted Nestora tour page", "Listing integration"],
      maximums: "Eight connected scenes",
      onsiteTime: "Up to four hours",
      delivery: "Within five business days",
      revisions: "One navigation and scene-label correction round",
      hosting: "One year included; ₦60,000 per tour per year afterward",
      likelyAdditionalCharges: "Additional scenes, travel, weekend, express delivery and advanced hosting",
      suitableFor: ["Premium homes", "Developments", "Hotels and short stays"],
    },
    {
      id: "drone-photography",
      name: "Drone Photography Package",
      priceNgn: 175000,
      startingFrom: false,
      includes: ["Up to 12 edited aerial photographs", "Property and surrounding-area coverage", "One location", "Standard colour correction"],
      maximums: "12 edited aerial photographs · one location",
      onsiteTime: "Up to two hours of planned capture",
      delivery: "Within four business days",
      revisions: "One reasonable correction round",
      hosting: "Not applicable",
      likelyAdditionalCharges: "Permits, access, travel, weather rescheduling and selected extras",
      suitableFor: ["Estates", "Developments", "Commercial property", "Land"],
    },
    {
      id: "drone-video",
      name: "Drone Video Package",
      priceNgn: 300000,
      startingFrom: false,
      includes: ["Aerial capture session", "45–60 second edited property video", "Licensed music where applicable", "Landscape master", "One vertical social cut", "Basic title treatment"],
      maximums: "One 45–60 second master · one vertical cut",
      onsiteTime: "Up to four hours of planned capture",
      delivery: "Within seven business days",
      revisions: "One edited-video correction round",
      hosting: "Not applicable",
      likelyAdditionalCharges: "Permits, travel, additional revisions, weekend and express delivery",
      suitableFor: ["Luxury property", "Developments", "Hotels", "Commercial campaigns"],
    },
    {
      id: "complete-property-media",
      name: "Complete Property Media Package",
      priceNgn: 450000,
      startingFrom: false,
      includes: ["Up to 35 edited property photographs", "Up to eight 360° scenes", "Up to 12 aerial photographs", "45–60 second property video", "One vertical social version", "Listing and tour integration"],
      maximums: "35 photos · eight 360° scenes · 12 drone stills · two video masters",
      onsiteTime: "Up to one production day",
      delivery: "Within seven business days",
      revisions: "One correction round for photography, tour and edited video",
      hosting: "One year of standard 360° hosting included",
      likelyAdditionalCharges: "Travel, permits, additional units, scenes, revisions and specialist access",
      suitableFor: ["Luxury properties", "Developments", "Hotels", "High-value sales campaigns"],
    },
    {
      id: "development-launch",
      name: "Development Launch Package",
      priceNgn: 950000,
      startingFrom: true,
      includes: ["Development photography", "Drone photography and video", "Multiple unit types", "Amenities and location footage", "360° scenes", "Brochure and website imagery"],
      maximums: "Defined in the approved project scope",
      onsiteTime: "Scoped production schedule",
      delivery: "Scoped before confirmation",
      revisions: "One correction round per agreed deliverable",
      hosting: "One year for agreed standard tours",
      likelyAdditionalCharges: "Project size, buildings, unit types, location, permits, production days and specialist transport",
      suitableFor: ["Residential launches", "Mixed-use projects", "Phased developments"],
    },
    {
      id: "hospitality-media",
      name: "Hospitality Media Package",
      priceNgn: 600000,
      startingFrom: true,
      includes: ["Exterior and room-type photography", "Amenities and common spaces", "Food or service images where agreed", "Drone coverage where permitted", "360° room and facility scenes", "Booking-site exports"],
      maximums: "Defined by room types and approved production scope",
      onsiteTime: "Scoped production schedule",
      delivery: "Scoped before confirmation",
      revisions: "One correction round per agreed deliverable",
      hosting: "One year for agreed standard tours",
      likelyAdditionalCharges: "Room types, food styling, travel, permits, additional scenes and production days",
      suitableFor: ["Hotels", "Serviced apartments", "Short-stay portfolios"],
    },
  ],
  extras: [
    { id: "additional-photo", name: "Additional edited photograph", priceNgn: 7500, unit: "image", mode: "quantity" },
    { id: "additional-scene", name: "Additional 360° scene", priceNgn: 20000, unit: "scene", mode: "quantity" },
    { id: "additional-unit-type", name: "Additional property or unit type during the same visit", priceNgn: 50000, unit: "unit type", mode: "quantity", startingFrom: true },
    { id: "floor-plan", name: "Floor-plan creation", priceNgn: 60000, unit: "floor", mode: "quantity", startingFrom: true },
    { id: "social-video", name: "Short vertical social video", priceNgn: 75000, unit: "video", mode: "quantity" },
    { id: "video-revision", name: "Additional edited-video revision", priceNgn: 35000, unit: "revision round", mode: "quantity" },
    { id: "twilight", name: "Twilight or dusk enhancement", priceNgn: 15000, unit: "photograph", mode: "quantity" },
    { id: "virtual-staging", name: "Virtual staging", priceNgn: 25000, unit: "image", mode: "quantity", startingFrom: true },
    { id: "raw-media", name: "Raw-media handover", priceNgn: 100000, unit: "handover", mode: "boolean", startingFrom: true },
    { id: "express", name: "Express delivery", percentage: 30, unit: "selected package", mode: "percentage" },
  ],
  cancellation: [
    "More than 48 hours before booking: the deposit may be transferred once.",
    "Between 24 and 48 hours: 25% cancellation fee.",
    "Less than 24 hours: 50% cancellation fee.",
    "After the team has departed or arrived: travel and mobilisation costs are non-refundable.",
  ],
  travelPolicy: [
    "Abuja metropolitan service radius: included within 25 km of central Abuja.",
    "Beyond the radius: ₦1,500 per additional kilometre, calculated for the round trip.",
    "Accommodation, permits, security, tolls, flights and specialist transport are quoted before confirmation.",
  ],
  dronePolicy: "Drone availability depends on location, weather, airspace restrictions, safety assessment and required permissions. Location-specific permit, access, escort or regulatory charges require customer approval.",
  editingEthics: "Editing improves exposure, colour and presentation without removing structural defects, changing permanent finishes, misrepresenting dimensions or adding undisclosed facilities. Virtual staging is always labelled.",
});

export function mergePropertyMediaPricing(stored) {
  if (!stored || typeof stored !== "object") return PROPERTY_MEDIA_PRICING;
  return {
    ...PROPERTY_MEDIA_PRICING,
    ...stored,
    packages: Array.isArray(stored.packages) && stored.packages.length ? stored.packages : PROPERTY_MEDIA_PRICING.packages,
    extras: Array.isArray(stored.extras) && stored.extras.length ? stored.extras : PROPERTY_MEDIA_PRICING.extras,
    cancellation: Array.isArray(stored.cancellation) && stored.cancellation.length ? stored.cancellation : PROPERTY_MEDIA_PRICING.cancellation,
    travelPolicy: Array.isArray(stored.travelPolicy) && stored.travelPolicy.length ? stored.travelPolicy : PROPERTY_MEDIA_PRICING.travelPolicy,
  };
}

export function calculatePropertyMediaEstimate(input, pricing = PROPERTY_MEDIA_PRICING) {
  const active = mergePropertyMediaPricing(pricing);
  const selectedPackage = active.packages.find((item) => item.id === input.packageId);
  if (!selectedPackage) throw new Error("INVALID_PACKAGE");

  const extras = [];
  let extrasTotal = 0;
  for (const definition of active.extras) {
    if (definition.mode === "percentage") continue;
    const raw = input.extras?.[definition.id];
    const quantity = definition.mode === "boolean" ? (raw ? 1 : 0) : Math.max(0, Math.min(100, Number(raw || 0)));
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    const amount = Math.round(definition.priceNgn * quantity);
    extras.push({ id: definition.id, name: definition.name, quantity, unitPriceNgn: definition.priceNgn, amountNgn: amount });
    extrasTotal += amount;
  }

  const distanceKm = Math.max(0, Math.min(5000, Number(input.distanceKm || 0)));
  if (!Number.isFinite(distanceKm)) throw new Error("INVALID_DISTANCE");
  const additionalOneWayKm = Math.max(0, distanceKm - active.includedRadiusKm);
  const travelNgn = Math.round(additionalOneWayKm * 2 * active.additionalKmRateNgn);

  const preferredDate = new Date(`${input.preferredDate}T12:00:00Z`);
  if (Number.isNaN(preferredDate.getTime())) throw new Error("INVALID_DATE");
  const weekend = preferredDate.getUTCDay() === 0 || preferredDate.getUTCDay() === 6;
  const weekendNgn = weekend ? Math.round(selectedPackage.priceNgn * 0.2) : 0;
  const expressNgn = input.extras?.express ? Math.round(selectedPackage.priceNgn * 0.3) : 0;
  const permitAllowanceNgn = Math.max(0, Math.min(100000000, Math.round(Number(input.permitAllowanceNgn || 0))));
  const subtotalNgn = selectedPackage.priceNgn + extrasTotal + travelNgn + weekendNgn + expressNgn + permitAllowanceNgn;
  const taxNgn = Math.round(subtotalNgn * (Number(active.taxRatePercent || 0) / 100));
  const totalNgn = subtotalNgn + taxNgn;
  const depositNgn = Math.round(totalNgn * (Number(active.depositPercent || 0) / 100));

  return {
    currency: active.currency,
    package: { id: selectedPackage.id, name: selectedPackage.name, amountNgn: selectedPackage.priceNgn, startingFrom: selectedPackage.startingFrom },
    extras,
    extrasTotalNgn: extrasTotal,
    travel: { distanceKm, includedRadiusKm: active.includedRadiusKm, additionalOneWayKm, rateNgn: active.additionalKmRateNgn, amountNgn: travelNgn },
    weekend: { applied: weekend, percentage: 20, amountNgn: weekendNgn },
    express: { applied: Boolean(input.extras?.express), percentage: 30, amountNgn: expressNgn },
    permitAllowanceNgn,
    subtotalNgn,
    tax: { mode: active.taxMode, percentage: active.taxRatePercent, amountNgn: taxNgn, label: active.taxLabel },
    totalNgn,
    deposit: { percentage: active.depositPercent, amountNgn: depositNgn },
    remainingBalanceNgn: totalNgn - depositNgn,
    balancePolicy: active.balancePolicy,
  };
}
