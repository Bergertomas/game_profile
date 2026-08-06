import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-6xl items-baseline justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="group flex items-baseline gap-2.5">
          <span className="display text-lg leading-none text-bone">
            Game Profile
          </span>
          <span className="label-micro hidden text-bone-faint sm:inline">
            What kind of good is it?
          </span>
        </Link>
        <nav>
          <Link
            href="/methodology"
            className="label-micro text-bone-dim transition-colors hover:text-bone"
          >
            Methodology
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p className="max-w-2xl text-[0.8125rem] leading-relaxed text-bone-faint">
          Game Profile describes games across eight fixed dimensions so you can
          tell what kind of experience one is before you buy it. It does not
          publish an overall score, and it is not a review aggregator.
        </p>
        <p className="mt-4 text-xs text-bone-faint">
          Scoring Rubric v1.0 · Profiles are editorial judgements against a
          published methodology.
        </p>
      </div>
    </footer>
  );
}
