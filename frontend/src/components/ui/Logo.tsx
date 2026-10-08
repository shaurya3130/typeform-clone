import Link from "next/link";

/** Simple wordmark — original artwork, styled after Typeform's minimal brand. */
export default function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-ink" aria-label="Home">
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ink text-[13px] font-bold text-white">
        Tf
      </span>
      {!compact && <span className="text-[17px]">typeform<span className="text-ink-soft font-normal"> clone</span></span>}
    </Link>
  );
}
