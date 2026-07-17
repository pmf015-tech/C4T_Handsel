"use client";

import ky, { HTTPError } from "ky";
import { useState } from "react";

import type { ContractView } from "@/lib/db/contracts";
import { CONTRACT_COPY } from "@/lib/i18n/deals";

const copy = CONTRACT_COPY.en;

export function ContractActions({
  dealId,
  userId,
  contract,
}: {
  readonly dealId: string;
  readonly userId: string;
  readonly contract: ContractView;
}) {
  const [current, setCurrent] = useState(contract);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const signedByCurrentUser = current.signatures.some(
    (signature) => signature.clerkUserId === userId,
  );

  async function sign(): Promise<void> {
    setBusy(true);
    setMessage("");
    try {
      const response = await ky
        .post(`/api/deals/${dealId}/contract/sign`, {
          json: { contentHash: current.version.contentHash },
        })
        .json<{ readonly contract: ContractView }>();
      setCurrent(response.contract);
      setMessage(copy.receipt);
    } catch (error) {
      if (error instanceof HTTPError && error.response.status === 409)
        setMessage("Terms changed; review the latest contract version.");
      else setMessage(copy.error);
    } finally {
      setBusy(false);
    }
  }

  async function invite(): Promise<void> {
    setBusy(true);
    try {
      const response = await ky
        .post(`/api/deals/${dealId}/contract/invite`)
        .json<{ readonly invitePath: string }>();
      setMessage(`${window.location.origin}${response.invitePath}`);
    } catch (error) {
      if (error instanceof HTTPError) setMessage(copy.error);
      else throw error;
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="contractActions">
      <div className="contractStatus">
        <h2>{copy.status}</h2>
        {(["creator", "brand"] as const).map((role) => (
          <p key={role}>
            <strong>{role === "creator" ? copy.creator : copy.brand}</strong> ·{" "}
            {current.signatures.some(
              (signature) => signature.partyRole === role,
            )
              ? copy.signed
              : copy.waiting}
          </p>
        ))}
      </div>
      <div className="contractButtons">
        <button
          disabled={busy || signedByCurrentUser}
          onClick={sign}
          type="button"
        >
          {busy ? copy.signing : copy.sign}
        </button>
        <a href={`/api/deals/${dealId}/contract/export`}>{copy.export}</a>
        <button disabled={busy} onClick={invite} type="button">
          {copy.invite}
        </button>
        <a href={`/deals/${dealId}/revise`}>{copy.revision}</a>
      </div>
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
