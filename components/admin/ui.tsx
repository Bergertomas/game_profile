import Link from "next/link";

/**
 * `Link`'s own href type, with its type parameter preserved.
 *
 * `typedRoutes` is on, so `Link` is generic and validates a template literal
 * against the generated route table. Writing `React.ComponentProps<typeof Link>`
 * instantiates that parameter as `unknown` and rejects `/admin/games/<uuid>` —
 * the one shape every link in this tool has. Threading the parameter through
 * keeps the route checking that makes `typedRoutes` worth having.
 */
type AdminHref<T extends string> = React.ComponentProps<typeof Link<T>>["href"];

/**
 * Presentational parts of the editorial tool.
 *
 * Plain components with no state and no client boundary, so they can be used
 * from server components directly. Anything that needs `useActionState` or
 * `useFormStatus` lives in `forms.tsx`, which is a client module.
 */

export function Panel({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="mb-8 rounded-sm border border-rule bg-page">
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-rule px-5 py-3">
        <h2 className="sip-display m-0 text-[1.05rem]">{title}</h2>
        {actions ? <div className="ml-auto">{actions}</div> : null}
        {description ? (
          <p className="m-0 w-full text-[0.82rem] leading-relaxed text-ink-soft">
            {description}
          </p>
        ) : null}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

/**
 * A statement of a rule the editor has just run into, or is about to.
 *
 * `tone="blocked"` is for a database invariant that will refuse the action —
 * §8.3 requires an editor to "see why a scope cannot be published before the
 * primary", and meeting that rule as a sentence beforehand is the difference
 * between a tool and a constraint violation.
 */
export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "blocked" | "warning";
  children: React.ReactNode;
}) {
  const palette = {
    info: "border-rule bg-page-sunk text-ink-soft",
    warning: "border-signal/50 bg-signal/10 text-signal-ink",
    blocked: "border-rule-strong bg-page-sunk text-ink",
  }[tone];

  return (
    <p
      className={`m-0 mb-3 rounded-sm border px-3 py-2 text-[0.82rem] leading-relaxed ${palette}`}
    >
      {children}
    </p>
  );
}

export function DefinitionRow({
  term,
  children,
}: {
  term: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-0.5 border-b border-rule py-1.5 last:border-b-0">
      <dt className="w-40 shrink-0 text-[0.78rem] uppercase tracking-wide text-ink-quiet">
        {term}
      </dt>
      <dd className="m-0 min-w-0 flex-1 text-[0.9rem]">{children}</dd>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="m-0 text-[0.85rem] italic text-ink-quiet">{children}</p>;
}

/** A short, non-decorative state label. Never the only carrier of meaning. */
export function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "live" | "draft" | "past";
}) {
  const palette = {
    neutral: "border-rule text-ink-soft",
    live: "border-signal-ink/40 bg-signal/15 text-signal-ink",
    draft: "border-rule-strong text-ink",
    past: "border-rule text-ink-quiet",
  }[tone];
  return (
    <span
      className={`inline-block rounded-sm border px-1.5 py-0.5 text-[0.72rem] uppercase tracking-wide ${palette}`}
    >
      {children}
    </span>
  );
}

export function AdminLink<T extends string>({
  href,
  children,
}: {
  href: AdminHref<T>;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-ink underline decoration-rule-strong underline-offset-2 hover:decoration-ink"
    >
      {children}
    </Link>
  );
}

/**
 * The public address of a profile, shown as the editor will have to reason
 * about it. Primary scopes own the bare game URL; siblings carry their key.
 */
export function PublicAddress({
  slug,
  scopeKey,
  isPrimary,
}: {
  slug: string;
  scopeKey: string;
  isPrimary: boolean;
}) {
  return (
    <code className="text-[0.82rem] text-ink-soft">
      /games/{slug}
      {isPrimary ? "" : `/${scopeKey}`}
    </code>
  );
}
