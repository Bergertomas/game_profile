export type PreviewAccessVerdict = "protected" | "open" | "unknown";

export function classifyAccessResponse(response: Response): PreviewAccessVerdict;
export function checkPreviewAccess(
  url: string,
  fetchImpl?: typeof fetch,
): Promise<PreviewAccessVerdict>;
export function previewUrlFrom(output: string): string | null;
export function reportAccess(url: string, verdict: PreviewAccessVerdict): void;
