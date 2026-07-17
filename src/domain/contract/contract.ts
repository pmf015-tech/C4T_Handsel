export type ContractPartyRole = "creator" | "brand";

export type ContractSignature = Readonly<{
  readonly partyRole: ContractPartyRole;
  readonly contentHash: string;
}>;

export class ContractHashMismatchError extends Error {
  readonly name = "ContractHashMismatchError";
  constructor(
    readonly expectedHash: string,
    readonly currentHash: string,
  ) {
    super("Contract terms changed; review the latest version before signing.");
  }
}

export class ContractExpiredError extends Error {
  readonly name = "ContractExpiredError";
  constructor(readonly signingExpiresAt: Date) {
    super("The contract signing window has expired.");
  }
}

export function canSignContract(
  currentHash: string,
  expectedHash: string,
  now: Date,
  signingExpiresAt: Date,
): void {
  if (expectedHash !== currentHash) {
    throw new ContractHashMismatchError(expectedHash, currentHash);
  }
  if (now.getTime() > signingExpiresAt.getTime()) {
    throw new ContractExpiredError(signingExpiresAt);
  }
}

export function hasAllPartySignatures(
  signatures: readonly ContractSignature[],
  currentHash: string,
): boolean {
  return ["creator", "brand"].every((partyRole) =>
    signatures.some(
      (signature) =>
        signature.partyRole === partyRole &&
        signature.contentHash === currentHash,
    ),
  );
}

export function nextContractVersion(currentVersion: number): number {
  return currentVersion + 1;
}
