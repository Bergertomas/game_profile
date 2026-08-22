import type { Metadata } from "next";
import Link from "next/link";
import { SITE_EDITOR, SITE_NAME, absoluteUrl } from "@/lib/site";

const OG_DESCRIPTION =
  "Who writes Should I Play?, how a Game Profile is scored, what the evidence states mean, and why there is deliberately no overall score.";

export const metadata: Metadata = {
  title: "What this is — and what it refuses to be",
  description:
    "Should I Play? gives every game a Game Profile: eight fixed dimensions scored against a published rubric. Who writes them, how scoring works, what each evidence state means, and why there is no overall score.",
  alternates: { canonical: "/about" },
  openGraph: {
    type: "article",
    url: absoluteUrl("/about"),
    title: "What this is — and what it refuses to be",
    description: OG_DESCRIPTION,
    // Declaring `openGraph` replaces the root object wholesale, so the
    // site-level card has to be named again rather than inherited.
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "What this is — and what it refuses to be",
    description: OG_DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

/**
 * About — the trust page.
 *
 * ── Why this page exists at all ────────────────────────────────────────────
 *
 * Until now nobody was named anywhere on this site. A product whose entire
 * proposition is "an editorial judgement you can check" published eight scored
 * dimensions, a rubric version and an evidence cut-off, and never said who made
 * the judgement. That is the shape of an aggregator, and readers correctly
 * distrust it.
 *
 * ── What it is not ─────────────────────────────────────────────────────────
 *
 * Not a marketing page and not a mission statement. Every section answers a
 * question a sceptical reader actually has — who wrote this, how are the
 * numbers made, what does "Provisional" mean, why is there no single score,
 * who pays for it, how do I report an error — and the answers are checkable
 * against the rubric, the profiles and the revision history rather than
 * against this page's own tone.
 *
 * ── Two sections are deliberately unfinished ───────────────────────────────
 *
 * Funding/independence and the corrections route ship only in wording the
 * owner confirms, so they say plainly that they are unconfirmed rather than
 * asserting an independence fact that may not be true. An unstated position is
 * honest; a borrowed one is not.
 */
export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-[46rem] px-5 py-12 sm:px-8 sm:py-16">
      <h1 className="sip-display text-[2.25rem] sm:text-[3rem]">
        What this is — and what it refuses to be
      </h1>
      <p className="sip-prose mt-4 max-w-[60ch] text-[1.125rem] leading-[1.55] text-ink-soft">
        {SITE_NAME} gives games a <strong className="text-ink">Game Profile</strong>:
        eight fixed dimensions, each scored 0–10 against a published rubric, so
        you can tell what kind of experience a game is — and whether it fits{" "}
        <em>you</em> — before spending money and time on it.
      </p>

      <Section title="Who writes it">
        <WhoWritesIt />
      </Section>

      <Section title="How scoring works">
        <p>
          Each dimension&rsquo;s 0–10 derives from five public subcriteria worth
          0–2 each — totals are computed, never typed. Every scored subcriterion
          carries a written rationale, every dimension carries its own
          confidence, and the whole method is public:{" "}
          <Prose href="/methodology">the rubric</Prose> is the product&rsquo;s
          constitution, not a marketing page.
        </p>
      </Section>

      <Section title="What &ldquo;Verified&rdquo; means">
        <p>
          <strong className="text-ink">Verified</strong>: substantial
          post-release evidence and a reasonably stable product.{" "}
          <strong className="text-ink">Provisional</strong>: released, but the
          evidence or the game is still moving.{" "}
          <strong className="text-ink">Pre-release</strong>: preview-grade
          evidence only — those profiles use ranges, &ldquo;Not scored&rdquo;,
          and never claim High confidence. A status describes evidence, never
          quality.
        </p>
      </Section>

      <Section title="Direct play">
        <p>
          Every profile states whether it rests on direct play (&ldquo;Direct
          play: Yes / Not yet&rdquo;). Both states are honest: a profile built
          from strong post-release sources says so; one built on our own hours
          says that instead. Nothing pretends.
        </p>
      </Section>

      <Section title="Why there is no overall score">
        <p>
          Because the average of eight honest numbers is a dishonest ninth. Two
          profiles that look equally strong can describe completely different
          purchases — a beautifully written but mechanically clumsy RPG, and a
          nearly storyless, mechanically exact action game. The profile keeps
          the eight apart so <em>you</em> can weigh the one that decides it for
          you.
        </p>
      </Section>

      <Section title="Independence and funding">
        <p className="text-ink-quiet">
          <Pending /> This site does not yet publish a funding and independence
          statement. Read that as unstated rather than as a claim in either
          direction — the section will say what is actually true, in the
          owner&rsquo;s words, before it says anything.
        </p>
      </Section>

      <Section title="Corrections">
        <p>
          Found something wrong — a fact, a score&rsquo;s rationale, a broken
          source? <Pending /> The contact route is not published yet. What
          already holds: a material correction creates a new evaluation version,
          the superseded one stays in history, and nothing is silently
          rewritten.
        </p>
      </Section>

      <Section title="What this will not become">
        <p>
          No user accounts, no comment sections, no aggregate score, no
          affiliate pressure, no &ldquo;top 10 games like…&rdquo; content
          farming. The catalogue grows one evidenced profile at a time, and
          every indexed page corresponds to a real evaluation.
        </p>
      </Section>
    </div>
  );
}

/**
 * The authorship paragraph, in whichever posture `SITE_EDITOR` currently
 * publishes. The three are not stylistic variants of one sentence: a named
 * editor, initials and a role each have to earn trust differently, so each
 * makes its own argument rather than swapping a noun.
 */
function WhoWritesIt() {
  if (SITE_EDITOR.variant === "full_name") {
    return (
      <p>
        Every profile here is researched, scored and written by{" "}
        <strong className="text-ink">{SITE_EDITOR.long}</strong> — one editor,
        deliberately. A single calibrated judgement, applied the same way every
        time, is more comparable than a committee average; the rubric exists so
        you can check the judgement rather than take it on faith.
      </p>
    );
  }

  if (SITE_EDITOR.variant === "initials") {
    return (
      <p>
        Every profile here is researched, scored and written by{" "}
        <strong className="text-ink">{SITE_EDITOR.short}</strong> — one editor,
        deliberately, writing under initials. The judgement is one
        person&rsquo;s and consistently calibrated; the method, the evidence and
        the revision history are public, so the work can be checked without the
        name.
      </p>
    );
  }

  return (
    <>
      <p>
        {SITE_NAME} is written by{" "}
        <strong className="text-ink">one person, deliberately</strong>. Not a
        committee and not an aggregate: one calibrated instrument, applied the
        same way to every game, with the method public enough to argue with.
      </p>
      <p className="mt-3">
        The judgement stays accountable through the rubric, the evidence classes
        and the revision history — all of them on every profile. Writing under a
        role rather than a name is the current position and a reversible one; it
        is not a claim that the work is institutional.
      </p>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-9 grid gap-x-12 gap-y-2 border-t border-rule pt-6 md:grid-cols-[14rem_minmax(0,1fr)]">
      <h2 className="sip-label text-ink-quiet">{title}</h2>
      <div className="sip-prose max-w-[60ch] text-[1.0625rem] leading-[1.6] text-ink">
        {children}
      </div>
    </section>
  );
}

/**
 * Marks copy the owner has not signed off. Visible on the page on purpose:
 * a placeholder a reader cannot see is a placeholder that ships.
 */
function Pending() {
  return (
    <strong className="sip-label mr-1.5 text-ink-quiet">
      Not published yet.
    </strong>
  );
}

function Prose({ href, children }: { href: "/methodology"; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="underline decoration-rule-strong underline-offset-[4px] transition-colors duration-150 hover:decoration-ink"
    >
      {children}
    </Link>
  );
}
