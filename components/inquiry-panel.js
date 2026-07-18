"use client";

import Link from "next/link";
import { Building2, CalendarDays, ChevronRight, MessageCircle, ShieldCheck, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useNestora } from "@/components/providers";
import { calculateStayTotal, formatNaira, priceLabel } from "@/lib/platform";

export function InquiryPanel({ property, minimumDate }) {
  const { addBooking, addInspection } = useNestora();
  const [ready, setReady] = useState(false);
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState("2");
  const [nights, setNights] = useState(3);
  const [roomTypeId, setRoomTypeId] = useState(property.stayRoomTypes?.[0]?.id || "");
  const [submitted, setSubmitted] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const stay = property.mode === "stay";
  const selectedRoomType = property.stayRoomTypes?.find((item) => item.id === roomTypeId);
  const bookingProperty = selectedRoomType ? { ...property, fees: { ...property.fees, nightly: selectedRoomType.nightlyRate } } : property;
  const total = stay ? calculateStayTotal(bookingProperty, nights) : null;

  useEffect(() => { setReady(true); }, []);

  async function submit(event) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const selectedDate = String(form.get("date") || date);
    if (!selectedDate) return;
    const selectedGuests = Number(form.get("guests") || guests);
    const selectedNights = Math.max(1, Number(form.get("nights") || nights));
    const submittedTotal = stay ? calculateStayTotal(bookingProperty, selectedNights) : null;
    setSubmitting(true);
    try {
      const record = stay
        ? await addBooking({ propertyId: property.id, roomTypeId, title: property.title, date: selectedDate, guests: selectedGuests, nights: selectedNights, total: submittedTotal.total })
        : await addInspection({ propertyId: property.id, title: property.title, date: selectedDate });
      setSubmitted(record);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) return <div className="inquiry-panel inquiry-success"><span><ShieldCheck size={26} /></span><h2>Request received</h2><p>{stay ? "The host has your booking request." : "The advisor has your preferred inspection date."} We will keep every update in My Nestora.</p><strong>{submitted.id}</strong><Link href="/my-nestora" className="button button--ink">Track request <ChevronRight size={16} /></Link></div>;

  return (
    <form className="inquiry-panel" data-inquiry-ready={ready ? "true" : "false"} onSubmit={submit}>
      <div className="inquiry-price"><strong>{priceLabel(property)}</strong><span>{stay ? "Published nightly rate" : "Published price"}</span></div>
      {stay ? <label><span><Building2 size={16} />Room type</span><select name="roomTypeId" aria-label="Room type" value={roomTypeId} onChange={(event) => setRoomTypeId(event.target.value)} required><option value="">Select a room type</option>{(property.stayRoomTypes || []).map((item) => <option value={item.id} key={item.id}>{item.name} · up to {item.capacity} guests · {formatNaira(item.nightlyRate)} / night</option>)}</select></label> : null}
      <label><span><CalendarDays size={16} />{stay ? "Check-in" : "Preferred viewing date"}</span><input name="date" type="date" aria-label={stay ? "Check-in date" : "Preferred viewing date"} value={date} min={minimumDate} onChange={(event) => setDate(event.target.value)} required /></label>
      {stay ? <div className="inquiry-pair"><label><span><CalendarDays size={16} />Nights</span><input name="nights" type="number" aria-label="Number of nights" min="1" max="30" value={nights} onChange={(event) => setNights(Math.max(1, Number(event.target.value)))} /></label><label><span><UsersRound size={16} />Guests</span><select name="guests" aria-label="Number of guests" value={guests} onChange={(event) => setGuests(event.target.value)}><option value="1">1 guest</option><option value="2">2 guests</option><option value="3">3 guests</option><option value="4">4 guests</option></select></label></div> : null}
      <button className="button button--coral inquiry-submit" type="submit" disabled={submitting || (stay && !roomTypeId)}>{submitting ? "Sending request..." : stay ? "Request to book" : "Request an inspection"}</button>
      {error ? <p className="inquiry-error" role="alert">{error} <Link href={`/login?next=/properties/${property.id}`}>Sign in securely</Link></p> : null}
      <p className="inquiry-note">You will not be charged at this step.</p>
      {stay ? <dl className="booking-breakdown"><div><dt>{formatNaira(total.nightly)} × {total.nights} nights</dt><dd>{formatNaira(total.subtotal)}</dd></div><div><dt>Cleaning, service and taxes</dt><dd>{formatNaira(total.extras)}</dd></div><div><dt>Total</dt><dd>{formatNaira(total.total)}</dd></div></dl> : <div className="inspection-note"><ShieldCheck size={17} /><span>Inspection requests and follow-up stay in your secure Nestora conversation.</span></div>}
      <Link href={`/messages?to=${property.hostId}&property=${property.id}`} className="message-host"><MessageCircle size={17} /> Ask {property.host.split(" ")[0]} a question</Link>
    </form>
  );
}
