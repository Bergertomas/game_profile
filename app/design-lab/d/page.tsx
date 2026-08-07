import { notFound } from "next/navigation";
import { DirectionD } from "@/components/design-lab/DirectionD";
import { LabStrip } from "@/components/design-lab/LabStrip";
import { designLabProfileFor } from "@/lib/design-lab/profile";

export const metadata = { title: "Direction D — Editorial Instrument" };

/**
 * D renders Alan Wake 2 at its canonical route, so it lines up with
 * /design-lab/a, /b and /c for a same-data comparison. The same component
 * renders the other two seeded profiles under /design-lab/d/[slug].
 */
export default function Page() {
  const profile = designLabProfileFor("alan-wake-2");
  if (!profile) notFound();

  return (
    <>
      <DirectionD profile={profile} />
      <LabStrip current="alan-wake-2" />
    </>
  );
}
