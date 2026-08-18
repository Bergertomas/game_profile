import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminForbiddenError } from "@/lib/admin/auth";
import { requireEditor } from "@/lib/admin/guard";

/**
 * The editorial shell.
 *
 * Deliberately not the public design system. This is a tool: dense, sober, no
 * marketing voice, no radar, no brand furniture. The one thing it shares with
 * the public site is its type and colour tokens, so an editor is not looking at
 * a different product while authoring one.
 *
 * ── Never prerendered ───────────────────────────────────────────────────────
 *
 * `force-dynamic` is load-bearing. Without it `next build` would attempt to
 * prerender `/admin`, which means executing an editorial database read during
 * the public build — the exact coupling ADR 0017 keeps out of the build, and it
 * would fail every deployment that has no `ADMIN_DATABASE_URL`, which is all of
 * them by default. Admin pages are per-request by definition: they render one
 * editor's view of mutable draft state.
 */
export const dynamic = "force-dynamic";

/**
 * Belt-and-braces `noindex`, on top of the `X-Robots-Tag` header `proxy.ts`
 * sets and the `Disallow: /admin/` in robots.txt. None of the three is access
 * control (ADR 0012) — Cloudflare Access is. These stop an authenticated
 * editor's browser from handing a draft to a crawler via a toolbar.
 */
export const metadata: Metadata = {
  title: "Editorial — Should I Play?",
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The third enforcement layer, after Cloudflare Access and `proxy.ts`. A
  // refusal here becomes 404 rather than an error page: a deployment without
  // the editorial tool should not report that it has one.
  let editorEmail: string;
  try {
    editorEmail = (await requireEditor()).email;
  } catch (error) {
    if (error instanceof AdminForbiddenError) notFound();
    throw error;
  }

  return (
    <div className="min-h-dvh bg-page-sunk text-ink">
      <header className="border-b border-rule-strong bg-graphite text-bone">
        <div className="mx-auto flex w-full max-w-[78rem] flex-wrap items-baseline gap-x-8 gap-y-2 px-5 py-3 sm:px-8">
          <Link
            href="/admin"
            className="sip-display text-[0.95rem] tracking-wide text-bone no-underline"
          >
            Editorial
          </Link>
          <nav
            aria-label="Editorial sections"
            className="flex gap-6 text-[0.85rem]"
          >
            <Link
              href="/admin"
              className="text-bone-soft no-underline hover:text-bone"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/games"
              className="text-bone-soft no-underline hover:text-bone"
            >
              Games
            </Link>
          </nav>
          <p className="ml-auto text-[0.78rem] text-bone-quiet">
            {editorEmail}
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[78rem] px-5 py-8 sm:px-8">
        {children}
      </main>

      <footer className="mx-auto w-full max-w-[78rem] px-5 pb-10 text-[0.75rem] text-ink-quiet sm:px-8">
        <p className="m-0">
          Editing here changes the database, not the site. A Published profile
          becomes Live only after a rebuild and deploy succeeds — until then
          production still serves the previous version. See the Master Plan on
          editorial publication versus live deployment.
        </p>
      </footer>
    </div>
  );
}
