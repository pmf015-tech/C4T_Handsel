import type { MinorUnits } from "@/domain/deal/types";

/** Basis points: 0 = 0%, 10_000 = 100%. */
export type BasisPoints = number;

export type RevShareResult = Readonly<{
  creatorShareMinorUnits: MinorUnits;
  brandShareMinorUnits: MinorUnits;
}>;

export class InvalidRevShareInputError extends Error {
  readonly name = "InvalidRevShareInputError";

  constructor(message: string) {
    super(message);
  }
}

const BASIS_POINTS_DENOMINATOR = 10_000n;

/**
 * Rounds a non-negative BigInt fraction (numerator / denominator) to the
 * nearest integer using round-half-to-even ("banker's rounding"), so
 * repeated splits do not systematically drift upward.
 */
function divideRoundHalfEven(numerator: bigint, denominator: bigint): bigint {
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  const twiceRemainder = remainder * 2n;

  if (twiceRemainder < denominator) return quotient;
  if (twiceRemainder > denominator) return quotient + 1n;
  return quotient % 2n === 0n ? quotient : quotient + 1n;
}

/**
 * Splits a gross minor-units amount between creator and brand at the given
 * basis-point share, using exact integer arithmetic (BigInt) so no floating
 * point precision is ever involved. The creator share is rounded with
 * banker's rounding; the brand share is the exact remainder, so the two
 * shares always sum to `grossMinorUnits` with no leftover or overcounted unit.
 */
export function computeRevShare(
  grossMinorUnits: MinorUnits,
  creatorShareBasisPoints: BasisPoints,
): RevShareResult {
  if (!Number.isSafeInteger(grossMinorUnits) || grossMinorUnits < 0) {
    throw new InvalidRevShareInputError(
      "grossMinorUnits must be a non-negative safe integer",
    );
  }
  if (
    !Number.isInteger(creatorShareBasisPoints) ||
    creatorShareBasisPoints < 0 ||
    creatorShareBasisPoints > 10_000
  ) {
    throw new InvalidRevShareInputError(
      "creatorShareBasisPoints must be an integer between 0 and 10000",
    );
  }

  const numerator = BigInt(grossMinorUnits) * BigInt(creatorShareBasisPoints);
  const creatorShareMinorUnits = Number(
    divideRoundHalfEven(numerator, BASIS_POINTS_DENOMINATOR),
  );
  const brandShareMinorUnits = grossMinorUnits - creatorShareMinorUnits;

  return { creatorShareMinorUnits, brandShareMinorUnits };
}
