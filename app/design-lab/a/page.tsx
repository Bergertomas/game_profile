import { DirectionA } from "@/components/design-lab/DirectionA";
import { designLabProfile } from "@/lib/design-lab/profile";

export const metadata = { title: "Direction A — design lab" };

export default function Page() {
  return <DirectionA profile={designLabProfile()} />;
}
