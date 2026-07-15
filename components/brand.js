import Link from "next/link";

export function Brand({ inverse = false, compact = false }) {
  return (
    <Link href="/" className={`brand ${inverse ? "brand--inverse" : ""}`} aria-label="Nestora home">
      <span className="brand__mark" aria-hidden="true"><i /><b /></span>
      <span>
        <strong>Nestora</strong>
        {!compact ? <small>Find your place. Feel at home.</small> : null}
      </span>
    </Link>
  );
}
