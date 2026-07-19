import Stripe from "stripe";

let cached: Stripe | null = null;

export class StripeConfigurationError extends Error {
  readonly name = "StripeConfigurationError";
  constructor() {
    super(
      "STRIPE_SECRET_KEY is not set. Add the Stripe TEST secret key to the environment before using payout features.",
    );
  }
}

/** Lazy singleton so builds and non-payout routes never require the key. */
export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new StripeConfigurationError();
  cached = new Stripe(key);
  return cached;
}
