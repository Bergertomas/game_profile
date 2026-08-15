import { DirectionB } from "@/components/design-lab/DirectionB";
import { designLabProfile } from "@/lib/design-lab/profile";

export const metadata = { title: "Direction B — design lab" };

export default function Page() {
  return <DirectionB profile={designLabProfile()} />;
}
