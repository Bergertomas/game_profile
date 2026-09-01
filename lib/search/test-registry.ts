import { RECOGNIZED_GAMES } from "@/content/search-registry";
import {
  recognizedRegistryAdditions,
  TEST_REGISTRY_CORPUS_NAME,
} from "@/content/test-corpus";
import { SITE_ENV } from "@/lib/site";
import type { RegisteredGame } from "./registry";

/**
 * Which recognised registry this build gets.
 *
 * The real one is empty and stays empty (content/search-registry.ts), which
 * makes the recognised-but-unprofiled state unreachable in a browser. This is
 * the same escape hatch `PROFILE_TEST_CORPUS=multi-scope` provides for the
 * scope switcher, driven by the same variable and guarded the same way, because
 * a second mechanism for the same job is a second mechanism to get wrong.
 *
 * A PRODUCTION BUILD REFUSES RATHER THAN IGNORING IT. Silently dropping the
 * variable is the safe-looking choice and the wrong one: it makes a
 * misconfigured production build indistinguishable from a correct one, and what
 * it would publish is invented editorial claims about coverage. `SITE_ENV`
 * folds to a literal at build time, so the synthetic branch is not even
 * reachable in a production bundle.
 */
export function registryForBuild(): readonly RegisteredGame[] {
  return testRegistryRequested() ? recognizedRegistryAdditions() : RECOGNIZED_GAMES;
}

function testRegistryRequested(): boolean {
  const requested = process.env.PROFILE_TEST_CORPUS?.trim();
  if (requested !== TEST_REGISTRY_CORPUS_NAME) return false;

  if (SITE_ENV === "production") {
    throw new Error(
      `PROFILE_TEST_CORPUS=${requested} is set on a production build. That ` +
        "corpus fills the recognised registry with synthetic titles that are " +
        "not games and whose coverage notes are not editorial claims about " +
        "anything. Publishing them would put invented statements about our " +
        "catalogue on the public site. Refusing. Unset it, or build a preview.",
    );
  }

  return true;
}
