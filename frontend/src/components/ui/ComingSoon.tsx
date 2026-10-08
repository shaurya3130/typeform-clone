import type { LucideIcon } from "lucide-react";

export default function ComingSoon({
  icon: Icon,
  title,
  description,
  items = [],
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  items?: string[];
}) {
  return (
    <div className="flex flex-1 items-center justify-center bg-canvas p-8">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
          <Icon size={26} />
        </div>
        <span className="mb-3 inline-block rounded-full bg-[#fbe5a6] px-2.5 py-0.5 text-xs font-semibold text-[#6b4e00]">
          Coming soon
        </span>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-ink-soft">{description}</p>
        {items.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-2 text-left">
            {items.map((i) => (
              <div key={i} className="rounded-md border border-line bg-white px-3 py-2.5 text-sm text-ink-soft">
                {i}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
