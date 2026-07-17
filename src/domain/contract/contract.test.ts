import { describe, expect, it } from "vitest";

import {
  ContractExpiredError,
  ContractHashMismatchError,
  canSignContract,
  hasAllPartySignatures,
  nextContractVersion,
  type ContractSignature,
} from "./contract";

const hash = "a".repeat(64);
const signatures: readonly ContractSignature[] = [
  { partyRole: "creator", contentHash: hash },
  { partyRole: "brand", contentHash: hash },
];

describe("contract signing rules", () => {
  it("rejects a signature against a stale content hash", () => {
    expect(() =>
      canSignContract(
        hash,
        "b".repeat(64),
        new Date("2026-07-17T00:00:00Z"),
        new Date("2026-07-18T00:00:00Z"),
      ),
    ).toThrow(ContractHashMismatchError);
  });

  it("rejects signing after the 14-day window", () => {
    expect(() =>
      canSignContract(
        hash,
        hash,
        new Date("2026-07-19T00:00:00Z"),
        new Date("2026-07-18T00:00:00Z"),
      ),
    ).toThrow(ContractExpiredError);
  });

  it("requires one current-hash signature from each party", () => {
    expect(hasAllPartySignatures(signatures, hash)).toBe(true);
    expect(hasAllPartySignatures(signatures.slice(0, 1), hash)).toBe(false);
    expect(
      hasAllPartySignatures(
        [
          { partyRole: "creator", contentHash: "b".repeat(64) },
          { partyRole: "brand", contentHash: hash },
        ],
        hash,
      ),
    ).toBe(false);
  });

  it("increments the version and starts with no signatures after a redline", () => {
    expect(nextContractVersion(3)).toBe(4);
  });
});
