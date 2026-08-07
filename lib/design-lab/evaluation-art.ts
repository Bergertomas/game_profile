/**
 * Third-party artwork held for internal design evaluation only.
 *
 * Every field here is a rights record as much as a rendering detail. Full
 * provenance, retrieval date, modifications and the conditions this artwork may
 * be used under are in `public/design-lab/evaluation-art/PROVENANCE.md`.
 *
 * NOT CLEARED FOR PRODUCTION. Only `/design-lab/d2/*` may reference this, and
 * those routes 404 in a production build. Nothing in `app/games` or any
 * production component may import it.
 */
export interface EvaluationArt {
  readonly src: string;
  readonly width: number;
  readonly height: number;
  /** Factual description of what the image shows. Not marketing copy. */
  readonly alt: string;
  readonly rightsHolder: string;
  readonly sourceUrl: string;
  readonly retrieved: string;
}

const EVALUATION_ART: Readonly<Record<string, EvaluationArt>> = {
  "alan-wake-2": {
    src: "/design-lab/evaluation-art/alan-wake-2-keyart-eval.webp",
    width: 1600,
    height: 824,
    alt: "Alan Wake 2 key art: Alan Wake stands vast and half-dissolved among red-lit forest, with FBI agent Saga Anderson small and lit at his feet.",
    rightsHolder: "Remedy Entertainment Plc / Epic Games Publishing",
    sourceUrl: "https://alanwake.com",
    retrieved: "7 August 2026",
  },
};

export function evaluationArtFor(slug: string): EvaluationArt | null {
  return EVALUATION_ART[slug] ?? null;
}

/** Shown on every page that renders evaluation artwork. Not optional. */
export function evaluationNotice(art: EvaluationArt): string {
  return `Key art © ${art.rightsHolder}, from ${art.sourceUrl}, retrieved ${art.retrieved}. Reproduced at reduced resolution for internal design evaluation only — not licensed, not cleared for production.`;
}
