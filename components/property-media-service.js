"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Camera, Check, ChevronRight, CircleDollarSign, Clock3, FileImage, MapPin, Move3d, Plane, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PropertyMediaPanorama } from "@/components/property-media-panorama";

const customerTypes = [
  ["agent", "Agent"], ["agency", "Agency"], ["developer", "Property developer"], ["hotel", "Hotel"],
  ["short_stay", "Short-stay operator"], ["landlord", "Landlord"], ["property_manager", "Property manager"],
  ["commercial_owner", "Commercial-property owner"], ["other", "Other"],
];

export function PropertyMediaService({ configuration }) {
  const { pricing, serviceMedia } = configuration;
  return (
    <div className="property-media-page">
      <section className="media-service-hero">
        <Image src={serviceMedia.team.src} alt={serviceMedia.team.alt} fill priority sizes="100vw" />
        <span className="media-service-hero__veil" />
        <div className="shell media-service-hero__content">
          <p className="eyebrow"><Camera size={17} />Nestora Property Media</p>
          <h1>Property media people can feel.</h1>
          <p>Professional interiors, cinematic aerial coverage, walkthrough video and immersive 360° tours—planned for real listings, developments and hospitality brands.</p>
          <div><Link className="button button--coral" href="#booking">Book a property shoot <ArrowRight size={17} /></Link><Link className="button button--light" href="#pricing">View every price</Link></div>
          <small>Launch visuals are illustrative and administrator-replaceable. They do not depict named Nestora employees.</small>
        </div>
      </section>

      <nav className="media-service-tabs shell" aria-label="Photography service page">
        <a href="#services">Services</a><a href="#tour">360° tour</a><a href="#drone">Drone</a><a href="#pricing">Pricing</a><a href="#booking">Book</a><a href="#preparation">Prepare</a><a href="#terms">Terms</a>
      </nav>

      <section className="section shell media-service-intro" id="services">
        <div><p className="eyebrow">A complete production partner</p><h2>Capture once. Publish everywhere.</h2><p>Every package is planned around the places your customers actually discover property: listings, social campaigns, development websites, hotel booking pages, brochures and immersive tours.</p></div>
        <div className="media-service-capabilities">
          {[
            [Camera, "Interior and exterior photography", "Balanced, listing-ready photographs with truthful correction."],
            [Move3d, "Immersive 360° capture", "Connected scenes, labels, navigation and Nestora hosting."],
            [Plane, "Drone stills and video", "Scale, surroundings, access and construction progress where permitted."],
            [FileImage, "Walkthroughs, social and floor plans", "Delivery formats for websites, campaigns, presentations and listings."],
          ].map(([Icon, title, copy]) => <article key={title}><Icon size={23} /><h3>{title}</h3><p>{copy}</p></article>)}
        </div>
      </section>

      <section className="section media-worker-story">
        <div className="shell media-worker-story__grid">
          <div className="media-worker-story__image"><Image src={serviceMedia.interior.src} alt={serviceMedia.interior.alt} fill sizes="(max-width: 850px) 100vw, 55vw" /></div>
          <div><p className="eyebrow">Purposeful capture</p><h2>Composed for the buyer’s next question.</h2><p>We plan light, room sequence, amenity detail and delivery formats before capture. The result is a coherent visual story—not a folder of unrelated images.</p><ul><li><Check />Professional camera and stabilised video capture</li><li><Check />Web-ready and high-resolution delivery sets</li><li><Check />Ethical exposure, colour and perspective correction</li><li><Check />Direct listing and Marketing Studio integration</li></ul></div>
        </div>
      </section>

      <section className="section shell media-tour-showcase" id="tour">
        <header><div><p className="eyebrow"><Move3d size={17} />Immersive masterpiece</p><h2>Step inside before scheduling a visit.</h2></div><p>Drag, swipe, use the keyboard, enter fullscreen or enable motion on a supported mobile device. Scene descriptions remain available when WebGL is not.</p></header>
        <PropertyMediaPanorama />
        <div className="media-tour-showcase__actions"><a className="button button--ink" href="#booking">Book a 360° property shoot <ArrowRight size={17} /></a><span><ShieldCheck size={17} />One year of standard hosting is included with eligible packages.</span></div>
      </section>

      <section className="section media-drone-service" id="drone">
        <Image src={serviceMedia.drone.src} alt={serviceMedia.drone.alt} fill sizes="100vw" />
        <span className="media-drone-service__veil" />
        <div className="shell media-drone-service__content">
          <p className="eyebrow"><Plane size={17} />Drone coverage</p><h2>Show the property, its scale and its location advantage.</h2>
          <div className="media-drone-service__uses">{["Gated estates", "Residential developments", "Hotels and short stays", "Commercial buildings", "Land and development sites", "Construction progress", "Road and neighbourhood access", "Amenities and boundaries"].map((item) => <span key={item}>{item}</span>)}</div>
          <p>Choose aerial stills, a short reveal, a full development flyover, progress recording or a neighbourhood overview.</p>
          <small>{pricing.dronePolicy}</small>
        </div>
      </section>

      <BeforeAfter />
      <Pricing pricing={pricing} />
      <BookingForm pricing={pricing} />
      <TrustContent pricing={pricing} />
    </div>
  );
}

function Pricing({ pricing }) {
  return (
    <section className="section shell media-pricing" id="pricing">
      <header><div><p className="eyebrow"><CircleDollarSign size={17} />Transparent Abuja launch pricing</p><h2>Every package. Every visible cost.</h2></div><p>{pricing.taxLabel} A {pricing.depositPercent}% deposit confirms a booking; the balance is due before unwatermarked final delivery.</p></header>
      <div className="media-package-grid">{pricing.packages.map((item) => <article className={item.id === "complete-property-media" ? "featured" : ""} key={item.id}><span>{item.startingFrom ? "Starting from" : "Package price"}</span><h3>{item.name}</h3><strong>{money(item.priceNgn)}</strong><ul>{item.includes.map((line) => <li key={line}><Check size={15} />{line}</li>)}</ul><dl><div><dt>Maximum</dt><dd>{item.maximums}</dd></div><div><dt>On site</dt><dd>{item.onsiteTime}</dd></div><div><dt>Delivery</dt><dd>{item.delivery}</dd></div><div><dt>Revisions</dt><dd>{item.revisions}</dd></div><div><dt>Hosting</dt><dd>{item.hosting}</dd></div><div><dt>Possible additions</dt><dd>{item.likelyAdditionalCharges}</dd></div></dl><a href="#booking" onClick={() => window.dispatchEvent(new CustomEvent("nestora:media-package", { detail: item.id }))}>Choose package <ChevronRight size={16} /></a></article>)}</div>
      <div className="media-cost-table">
        <div><h3>Optional extras</h3><p>Quantities are selected in the booking estimator.</p></div>
        <div role="table" aria-label="Property-media optional costs">
          {pricing.extras.map((extra) => <div role="row" key={extra.id}><span role="cell">{extra.name}{extra.startingFrom ? " · starting from" : ""}</span><strong role="cell">{extra.percentage ? `+${extra.percentage}%` : money(extra.priceNgn)} <small>/ {extra.unit}</small></strong></div>)}
          <div role="row"><span role="cell">360° hosting after the included year</span><strong role="cell">{money(pricing.hostingRenewalNgn)} <small>/ tour / year</small></strong></div>
          <div role="row"><span role="cell">Travel beyond {pricing.includedRadiusKm} km of central Abuja</span><strong role="cell">{money(pricing.additionalKmRateNgn)} <small>/ additional km, round trip</small></strong></div>
          <div role="row"><span role="cell">Weekend or public-holiday booking</span><strong role="cell">+20% <small>subject to availability</small></strong></div>
          <div role="row"><span role="cell">Rescheduling after departure</span><strong role="cell">from ₦50,000</strong></div>
        </div>
      </div>
      <div className="media-pricing-policies"><article><h3>Travel and mobilisation</h3>{pricing.travelPolicy.map((item) => <p key={item}>{item}</p>)}</article><article><h3>Cancellation</h3>{pricing.cancellation.map((item) => <p key={item}>{item}</p>)}</article><article><h3>Permits and raw files</h3><p>{pricing.dronePolicy}</p><p>Raw files are not included. Optional unedited raw-media handover starts at ₦100,000 and may require specialist software.</p></article></div>
    </section>
  );
}

function BookingForm({ pricing }) {
  const firstPackage = pricing.packages[0].id;
  const [form, setForm] = useState({ packageId: firstPackage, preferredDate: "", alternateDate: "", distanceKm: 0, permitAllowanceNgn: 0, extras: {}, droneRequested: false, tour360Requested: false });
  const [estimate, setEstimate] = useState(null);
  const [estimating, setEstimating] = useState(false);
  const [estimateError, setEstimateError] = useState("");
  const [booking, setBooking] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handler = (event) => setForm((current) => ({ ...current, packageId: pricing.packages.some((item) => item.id === event.detail) ? event.detail : current.packageId }));
    window.addEventListener("nestora:media-package", handler);
    return () => window.removeEventListener("nestora:media-package", handler);
  }, [pricing.packages]);

  useEffect(() => {
    if (form.preferredDate) return;
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + 7);
    setForm((current) => ({ ...current, preferredDate: date.toISOString().slice(0, 10) }));
  }, [form.preferredDate]);

  useEffect(() => {
    if (!form.preferredDate) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      setEstimating(true); setEstimateError("");
      try {
        const response = await fetch("/api/property-media/estimate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ packageId: form.packageId, preferredDate: form.preferredDate, distanceKm: Number(form.distanceKm || 0), permitAllowanceNgn: Number(form.permitAllowanceNgn || 0), extras: form.extras }) });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "The estimate could not be calculated.");
        if (active) setEstimate(payload.estimate);
      } catch (nextError) { if (active) { setEstimate(null); setEstimateError(nextError.message); } }
      finally { if (active) setEstimating(false); }
    }, 300);
    return () => { active = false; window.clearTimeout(timer); };
  }, [form]);

  function update(name, value) { setForm((current) => ({ ...current, [name]: value })); }
  function updateExtra(id, value) { setForm((current) => ({ ...current, extras: { ...current.extras, [id]: value } })); }

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true); setError(""); setBooking(null);
    const data = new FormData(event.currentTarget);
    const payload = {
      customerName: data.get("customerName"), email: data.get("email"), phone: data.get("phone"), whatsapp: data.get("whatsapp"),
      customerType: data.get("customerType"), propertyType: data.get("propertyType"), propertyAddress: data.get("propertyAddress"),
      mapLocation: data.get("mapLocation"), packageId: form.packageId, extras: form.extras,
      rooms: Number(data.get("rooms")), unitTypes: Number(data.get("unitTypes")), approximateSizeSqm: Number(data.get("approximateSizeSqm")),
      distanceKm: Number(form.distanceKm), permitAllowanceNgn: Number(form.permitAllowanceNgn), droneRequested: form.droneRequested,
      tour360Requested: form.tour360Requested, preferredDate: form.preferredDate, alternateDate: form.alternateDate,
      accessInstructions: data.get("accessInstructions"), occupancyStatus: data.get("occupancyStatus"),
      specialRequirements: data.get("specialRequirements"), listingId: data.get("listingId"), consent: data.get("consent") === "on",
    };
    try {
      const response = await fetch("/api/property-media/bookings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "The booking request could not be saved.");
      setBooking(result.booking);
    } catch (nextError) { setError(nextError.message); }
    finally { setSubmitting(false); }
  }

  return (
    <section className="section media-booking" id="booking">
      <div className="shell media-booking__grid">
        <form className="media-booking-form" onSubmit={submit}>
          <header><p className="eyebrow"><Clock3 size={17} />Request a production date</p><h2>Build your property-media brief.</h2><p>Your final total is recalculated and validated by Nestora’s server. Browser-supplied prices are never trusted.</p></header>
          <fieldset><legend>Contact</legend><label>Customer name<input name="customerName" required minLength={2} maxLength={140} autoComplete="name" /></label><label>Email<input name="email" type="email" required autoComplete="email" /></label><label>Phone<input name="phone" type="tel" required autoComplete="tel" /></label><label>WhatsApp number<input name="whatsapp" type="tel" required /></label><label>Customer type<select name="customerType">{customerTypes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></fieldset>
          <fieldset><legend>Property</legend><label>Property type<input name="propertyType" required placeholder="Three-bedroom apartment" /></label><label className="form-wide">Property address<textarea name="propertyAddress" required minLength={5} /></label><label className="form-wide">Map link or coordinates<input name="mapLocation" placeholder="Optional Google Maps link or coordinates" /></label><label>Rooms<input name="rooms" type="number" min="0" max="1000" defaultValue="3" required /></label><label>Unit types<input name="unitTypes" type="number" min="0" max="1000" defaultValue="1" required /></label><label>Approximate size (m²)<input name="approximateSizeSqm" type="number" min="0" max="10000000" defaultValue="180" required /></label><label>Distance from central Abuja (km)<input type="number" min="0" max="5000" value={form.distanceKm} onChange={(event) => update("distanceKm", event.target.value)} /></label><label className="form-wide">Connect a listing ID<input name="listingId" placeholder="Optional; sign in to connect an owned listing" /></label></fieldset>
          <fieldset><legend>Package and extras</legend><label className="form-wide">Package<select value={form.packageId} onChange={(event) => update("packageId", event.target.value)}>{pricing.packages.map((item) => <option value={item.id} key={item.id}>{item.name} — {item.startingFrom ? "from " : ""}{money(item.priceNgn)}</option>)}</select></label><div className="media-booking-extras form-wide">{pricing.extras.map((extra) => extra.mode === "quantity" ? <label key={extra.id}><span>{extra.name}<small>{extra.startingFrom ? "From " : ""}{money(extra.priceNgn)} / {extra.unit}</small></span><input type="number" min="0" max="100" value={form.extras[extra.id] || 0} onChange={(event) => updateExtra(extra.id, Number(event.target.value))} /></label> : <label className="media-extra-check" key={extra.id}><input type="checkbox" checked={Boolean(form.extras[extra.id])} onChange={(event) => updateExtra(extra.id, event.target.checked)} /><span>{extra.name}<small>{extra.percentage ? `+${extra.percentage}%` : `From ${money(extra.priceNgn)}`}</small></span></label>)}</div><label>Permit allowance (₦)<input type="number" min="0" max="100000000" value={form.permitAllowanceNgn} onChange={(event) => update("permitAllowanceNgn", event.target.value)} /></label><label className="media-extra-check"><input type="checkbox" checked={form.droneRequested} onChange={(event) => update("droneRequested", event.target.checked)} /><span>Drone requested<small>Subject to safety, airspace and permissions</small></span></label><label className="media-extra-check"><input type="checkbox" checked={form.tour360Requested} onChange={(event) => update("tour360Requested", event.target.checked)} /><span>360° requested<small>Scene count follows selected scope</small></span></label></fieldset>
          <fieldset><legend>Schedule and access</legend><label>Preferred date<input type="date" value={form.preferredDate} onChange={(event) => update("preferredDate", event.target.value)} required /></label><label>Alternate date<input type="date" value={form.alternateDate} onChange={(event) => update("alternateDate", event.target.value)} /></label><label>Occupancy status<select name="occupancyStatus"><option value="vacant">Vacant</option><option value="occupied">Occupied</option><option value="partly_occupied">Partly occupied</option><option value="under_construction">Under construction</option><option value="operational_hospitality">Operational hospitality</option></select></label><label className="form-wide">Access instructions<textarea name="accessInstructions" maxLength={3000} /></label><label className="form-wide">Special requirements<textarea name="specialRequirements" maxLength={3000} /></label></fieldset>
          <label className="media-booking-consent"><input name="consent" type="checkbox" required /><span>I confirm that I can arrange lawful access, have informed occupants where required, and accept the pricing, travel, safety, editing, cancellation and privacy terms.</span></label>
          {error ? <p className="media-booking-error" role="alert">{error}</p> : null}
          {booking ? <div className="media-booking-success" role="status"><Check size={20} /><div><strong>Request saved: {booking.booking_reference}</strong><p>The media operations team has received the brief. A confirmation notification has been queued.</p></div></div> : null}
          <button className="button button--coral" type="submit" disabled={submitting || !estimate}>{submitting ? "Saving request…" : "Submit booking request"}<ArrowRight size={17} /></button>
        </form>
        <aside className="media-estimate" aria-live="polite"><span>Secure live estimate</span>{estimating ? <p>Recalculating…</p> : estimateError ? <p role="alert">{estimateError}</p> : estimate ? <Estimate estimate={estimate} /> : <p>Choose a package and date to calculate the itemised estimate.</p>}<small>The estimate includes the configured deposit and visible surcharges. Permits, specialist access, flights, accommodation and security outside the entered allowance require approval before confirmation.</small></aside>
      </div>
    </section>
  );
}

function Estimate({ estimate }) {
  const rows = useMemo(() => [
    [estimate.package.name, estimate.package.amountNgn],
    ...estimate.extras.map((item) => [`${item.name} × ${item.quantity}`, item.amountNgn]),
    ["Travel", estimate.travel.amountNgn],
    ["Weekend surcharge", estimate.weekend.amountNgn],
    ["Express delivery", estimate.express.amountNgn],
    ["Permit allowance", estimate.permitAllowanceNgn],
    [`Tax (${estimate.tax.percentage}%)`, estimate.tax.amountNgn],
  ].filter(([, amount]) => amount > 0), [estimate]);
  return <><dl>{rows.map(([label, amount]) => <div key={label}><dt>{label}</dt><dd>{money(amount)}</dd></div>)}</dl><div className="media-estimate__total"><span>Estimated total</span><strong>{money(estimate.totalNgn)}</strong></div><div className="media-estimate__split"><div><span>Deposit due</span><strong>{money(estimate.deposit.amountNgn)}</strong></div><div><span>Remaining balance</span><strong>{money(estimate.remainingBalanceNgn)}</strong></div></div><p>{estimate.balancePolicy}</p></>;
}

function BeforeAfter() {
  const [position, setPosition] = useState(52);
  return <section className="section shell media-before-after"><header><div><p className="eyebrow"><Sparkles size={17} />Truthful post-production</p><h2>Correction without misrepresentation.</h2></div><p>Compare a deliberately underexposed source treatment with balanced exposure and colour. Structural details, permanent finishes and dimensions remain unchanged.</p></header><div className="media-comparison" style={{ "--comparison": `${position}%` }}><div className="media-comparison__after"><Image src="/images/property-media/interior-photography.webp" alt="Professionally balanced interior photograph" fill sizes="100vw" /></div><div className="media-comparison__before"><Image src="/images/property-media/interior-photography.webp" alt="The same interior shown with deliberately poor exposure for comparison" fill sizes="100vw" /></div><span>Raw exposure</span><strong>Professional correction</strong><input type="range" min="5" max="95" value={position} onChange={(event) => setPosition(event.target.value)} aria-label="Compare raw and professionally corrected property photograph" /><i aria-hidden="true" /></div><p>{`Editing does not remove defects, add facilities, change finishes or misrepresent room size. Virtual staging starts from ₦25,000 per image and is always disclosed.`}</p></section>;
}

function TrustContent({ pricing }) {
  const checklist = ["Clean and declutter each space", "Open curtains and replace damaged bulbs", "Remove personal documents and secure valuables", "Arrange access and inform occupants", "Prepare outdoor areas", "Confirm parking, security and loading access"];
  return <><section className="section shell media-preparation" id="preparation"><div><p className="eyebrow">Preparation guide</p><h2>Make production day work harder.</h2><p>Good preparation protects privacy, avoids delays and gives the team time to create a complete visual story.</p></div><ol>{checklist.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span>{item}</li>)}</ol></section><section className="section media-terms" id="terms"><div className="shell"><header><p className="eyebrow"><ShieldCheck size={17} />Trust, quality and limitations</p><h2>Clear expectations before the camera arrives.</h2></header><div>{[
    ["Delivery and revisions", "Delivery timing begins after successful capture and receipt of required access or project information. Included correction rounds cover reasonable edits within the agreed scope."],
    ["Weather and rescheduling", "Exterior and drone work may move when rain, wind, visibility, airspace or site safety prevents responsible capture. Mobilisation charges already incurred remain payable."],
    ["Privacy and consent", "The requester must inform occupants, remove private documents and obtain appropriate consent. Nestora restricts media access by listing and tenant ownership."],
    ["Media use and retention", "Final delivered media is licensed for the agreed property marketing use. Raw files are excluded unless purchased. Standard 360° hosting renews at the published annual rate."],
    ["Editing ethics", pricing.editingEthics],
    ["Cancellation", pricing.cancellation.join(" ")],
  ].map(([title, copy]) => <article key={title}><h3>{title}</h3><p>{copy}</p></article>)}</div></div></section></>;
}

function money(value) { return `₦${new Intl.NumberFormat("en-NG").format(Number(value || 0))}`; }
