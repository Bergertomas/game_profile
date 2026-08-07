import { notFound } from "next/navigation";
import { StudyA } from "@/components/design-lab/d2/StudyA";
import { designLabProfileFor } from "@/lib/design-lab/profile";

export const metadata = { title: "D2-A — Game-Led Editorial" };

/**
 * Identity study, not a page proposal. Alan Wake 2 only: the question is
 * whether real game media, a graphite profile band and a game-coloured polygon
 * make the page read as a game profile — and that question is answered with one
 * game before it is answered with three.
 *
 * Renders third-party artwork held for evaluation only. See
 * public/design-lab/evaluation-art/PROVENANCE.md. Development-only: the
 * /design-lab layout 404s this whole segment in production.
 */
export default function Page() {
  const profile = designLabProfileFor("alan-wake-2");
  if (!profile) notFound();
  return <StudyA profile={profile} />;
}
