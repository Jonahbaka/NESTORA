"use client";

import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { useNestora } from "@/components/providers";

export function PropertySaveButton({ propertyId, title }) {
  const { accountReady, saved, toggleSaved } = useNestora();
  const [mounted, setMounted] = useState(false);
  const active = mounted && saved.includes(propertyId);

  useEffect(() => { setMounted(true); }, []);

  return <button type="button" className={`button button--outline property-save-action ${active ? "active" : ""}`} onClick={() => toggleSaved(propertyId)} aria-pressed={active} aria-label={active ? `Remove ${title} from saved` : `Save ${title}`} disabled={!mounted || !accountReady}><Heart size={17} fill={active ? "currentColor" : "none"} />{active ? "Saved" : "Save"}</button>;
}
