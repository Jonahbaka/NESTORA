import { Suspense } from "react";
import { SearchResults } from "@/components/search-results";

export const metadata = { title: "Explore places" };

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="page-loading shell" aria-live="polite">Finding current places…</div>}>
      <SearchResults />
    </Suspense>
  );
}
