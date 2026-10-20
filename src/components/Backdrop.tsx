import Image from "next/image";
import painting from "../public/bg/fjord-day.jpg";

/** Full-bleed painting behind every page, darkened so text over it meets WCAG AA. */
export function Backdrop({ eager = false }: { eager?: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-canvas">
      <Image
        src={painting}
        alt=""
        fill
        sizes="100vw"
        placeholder="blur"
        fetchPriority={eager ? "high" : "auto"}
        loading={eager ? "eager" : "lazy"}
        // Slight scale hides the painting's dark frame at the edges.
        className="scale-[1.04] object-cover object-[50%_40%]"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, oklch(0.12 0.02 142 / 0.82) 0%, oklch(0.12 0.02 142 / 0.66) 45%, oklch(0.12 0.02 142 / 0.8) 100%)",
        }}
      />
    </div>
  );
}
