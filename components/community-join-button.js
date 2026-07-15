"use client";
import { Check, Plus } from "lucide-react";
import { useNestora } from "@/components/providers";
export function CommunityJoinButton({ id }) { const { joinedCommunities, toggleCommunity } = useNestora(); const joined = joinedCommunities.includes(id); return <button type="button" className={`button ${joined ? "button--outline" : "button--coral"}`} onClick={() => toggleCommunity(id)}>{joined ? <><Check size={17} />Joined</> : <><Plus size={17} />Join community</>}</button>; }
