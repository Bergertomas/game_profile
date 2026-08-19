export const OPEN_NEXT_CLI: string;
export const WRANGLER_CLI: string;
export const PRODUCTION_BRANCH: string;
export const MANIFEST_PATH: string;

export function run(command: string, args: readonly string[]): void;
export function runOpenNext(args: readonly string[]): void;
export function buildForCloudflare(): void;
export function runCaptured(command: string, args: readonly string[]): string;
export function runOpenNextCaptured(args: readonly string[]): string;
