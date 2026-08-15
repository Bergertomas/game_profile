import { DirectionC } from "@/components/design-lab/DirectionC";
import { designLabProfile } from "@/lib/design-lab/profile";

export const metadata = { title: "Direction C — design lab" };

export default function Page() {
  return <DirectionC profile={designLabProfile()} />;
}
