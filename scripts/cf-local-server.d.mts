import type { ChildProcess } from "node:child_process";

export function parseVerifyPort(value: string | undefined): number;

export function assertPortAvailable(
  port: number,
  host?: string,
): Promise<void>;

export function stopProcessTree(
  child: ChildProcess,
  options?: { readonly timeoutMs?: number },
): Promise<void>;
