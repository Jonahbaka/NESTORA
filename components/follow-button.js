"use client";
import { Check, Plus } from "lucide-react";
import { useNestora } from "@/components/providers";
export function FollowButton({ id }) { const { following, toggleFollow } = useNestora(); const active = following.includes(id); return <button type="button" className={`button ${active ? "button--outline" : "button--coral"}`} onClick={() => toggleFollow(id)}>{active ? <><Check size={17} />Following</> : <><Plus size={17} />Follow</>}</button>; }
