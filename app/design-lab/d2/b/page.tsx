import { notFound } from "next/navigation";
import { StudyB } from "@/components/design-lab/d2/StudyB";
import { designLabProfileFor } from "@/lib/design-lab/profile";

export const metadata = { title: "D2-B — Profile As Game Object" };

/**
 * Identity study, not a page proposal. Same profile and same underlying
 * structure as D2-A; what differs is how much room the artwork gets, how the
 * radar is drawn, and whether the page is carried by surfaces or by an image.
 *
 * Renders third-party artwork held for evaluation only. See
 * public/design-lab/evaluation-art/PROVENANCE.md. Development-only: the
 * /design-lab layout 404s this whole segment in production.
 */
export default function Page() {
  const profile = designLabProfileFor("alan-wake-2");
  if (!profile) notFound();
  return <StudyB profile={profile} />;
}
