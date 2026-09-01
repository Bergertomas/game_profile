export type StorefrontRelationship = "ordinary" | "affiliate";
export type DestinationAvailability = "verified" | "unavailable" | "unknown";

/** Provider-independent launch action; live price/offers are a later record. */
export interface StorefrontDestination {
  readonly id: string;
  readonly gameId: string;
  readonly scopeId?: string;
  readonly edition?: string;
  readonly platform: string;
  readonly region: string;
  readonly storefront: string;
  readonly officialUrl: string;
  readonly affiliateUrl?: string;
  readonly relationship: StorefrontRelationship;
  readonly disclosure?: string;
  readonly availability: DestinationAvailability;
  readonly source: string;
  readonly verifiedAt: string;
  /** Once reached, the destination must be re-verified before it can render. */
  readonly staleAfter?: string;
}

export interface PublicStorefrontAction {
  readonly id: string;
  readonly href: string;
  /** Retained so an affiliate destination never erases the ordinary route. */
  readonly ordinaryHref: string;
  readonly storefront: string;
  readonly platform: string;
  readonly region: string;
  readonly relationship: StorefrontRelationship;
  readonly disclosure?: string;
}

function isHttps(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isIsoTimestamp(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) && Number.isFinite(Date.parse(value))
  );
}

export function validateStorefrontDestination(
  destination: StorefrontDestination,
): readonly string[] {
  const errors: string[] = [];
  for (const field of [
    "id",
    "gameId",
    "platform",
    "region",
    "storefront",
    "source",
    "verifiedAt",
  ] as const) {
    if (!destination[field].trim()) errors.push(`${field} is required.`);
  }
  if (!isHttps(destination.officialUrl)) {
    errors.push("officialUrl must be an absolute https URL.");
  }
  if (!isIsoTimestamp(destination.verifiedAt)) {
    errors.push("verifiedAt must be an ISO timestamp.");
  }
  if (destination.staleAfter) {
    if (!isIsoTimestamp(destination.staleAfter)) {
      errors.push("staleAfter must be an ISO timestamp.");
    } else if (
      isIsoTimestamp(destination.verifiedAt) &&
      Date.parse(destination.staleAfter) <= Date.parse(destination.verifiedAt)
    ) {
      errors.push("staleAfter must be later than verifiedAt.");
    }
  }
  if (destination.relationship === "affiliate") {
    if (!destination.affiliateUrl || !isHttps(destination.affiliateUrl)) {
      errors.push("An affiliate destination requires an https affiliateUrl.");
    }
    if (!destination.disclosure?.trim()) {
      errors.push("An affiliate destination requires public disclosure.");
    }
  }
  return errors;
}

/** Hide an unavailable/unverifiable action; never manufacture a destination. */
export function toPublicStorefrontAction(
  destination: StorefrontDestination,
  asOf: string = new Date().toISOString(),
): PublicStorefrontAction | null {
  const errors = validateStorefrontDestination(destination);
  if (errors.length > 0) {
    throw new Error(`${destination.id}: ${errors.join(" ")}`);
  }
  if (destination.availability !== "verified") return null;
  if (!isIsoTimestamp(asOf)) {
    throw new Error("asOf must be an ISO timestamp.");
  }
  if (
    destination.staleAfter &&
    Date.parse(destination.staleAfter) <= Date.parse(asOf)
  ) {
    return null;
  }

  return {
    id: destination.id,
    href:
      destination.relationship === "affiliate"
        ? destination.affiliateUrl!
        : destination.officialUrl,
    ordinaryHref: destination.officialUrl,
    storefront: destination.storefront,
    platform: destination.platform,
    region: destination.region,
    relationship: destination.relationship,
    ...(destination.disclosure
      ? { disclosure: destination.disclosure }
      : {}),
  };
}
