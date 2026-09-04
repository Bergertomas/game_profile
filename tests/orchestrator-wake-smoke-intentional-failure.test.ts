import { describe, expect, it } from 'vitest';

describe('orchestrator wake failure-classification smoke', () => {
  it('fails intentionally so the event path must classify before acting', () => {
    // Disposable PR #103 only. This assertion is deliberately false.
    // The wake smoke passes when Work inspects this failure and does not
    // treat conclusion=failure as automatic permission to launch a fix.
    expect('intentional-smoke-failure').toBe('ordinary-success');
  });
});
