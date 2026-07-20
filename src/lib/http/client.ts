import ky from "ky";

/**
 * Shared browser HTTP client. ky's 10s default timeout is shorter than a cold
 * serverless start (observed >11s), which aborts requests the server then
 * completes — the worst failure mode for money actions. 30s keeps slow-path
 * requests alive while still failing eventually.
 */
export const api = ky.create({ timeout: 30_000 });
