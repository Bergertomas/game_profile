import { notFound } from "next/navigation";
import { D3Study } from "@/components/design-lab/d3/Study";
import { designLabProfileFor } from "@/lib/design-lab/profile";

export const metadata = { title: "D3 — Game-Led Profile" };

/**
 * D3 at its canonical route renders Alan Wake 2, so it lines up with the
 * earlier directions for a same-data comparison. The same component renders
 * the other seeded profiles under /design-lab/d3/[slug].
 *
 * Development only: the /design-lab layout 404s this whole segment in
 * production, and the evaluation artwork resolves to null there as well.
 */
export default function Page() {
  const profile = designLabProfileFor("alan-wake-2");
  if (!profile) notFound();
  return <D3Study profile={profile} />;
}
