import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-6xl font-semibold">404</p>
      <p className="text-ink-soft">We couldn&apos;t find that page.</p>
      <Link href="/" className="text-sm underline">
        Back to your workspace
      </Link>
    </main>
  );
}
