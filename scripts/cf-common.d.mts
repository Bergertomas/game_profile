export const OPEN_NEXT_CLI: string;
export const WRANGLER_CLI: string;

export function run(command: string, args: readonly string[]): void;
export function runOpenNext(args: readonly string[]): void;
export function buildForCloudflare(): void;
