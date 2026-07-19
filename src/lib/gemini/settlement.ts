import { Type } from "@google/genai";
import { z } from "zod";

import { computeRevShare } from "@/domain/money/revShare";

import { GEMINI_MODEL, getGemini } from "./client";

/**
 * E8 settlement agent. Gemini PROPOSES, deterministic domain code DISPOSES:
 * every number the model produces is recomputed with revShare.ts before it is
 * shown or acted on, and the deterministic figure always wins.
 */

export const SettlementRulesSchema = z.object({
  creatorShareBasisPoints: z.number().int().min(0).max(10_000),
  currency: z.string().min(3).max(3),
  reportCadence: z.enum(["MONTHLY", "QUARTERLY"]),
  reportGraceDays: z.number().int().min(0).max(60),
  milestones: z.array(
    z.object({
      title: z.string(),
      amountMinorUnits: z.number().int().positive(),
      dueDate: z.string().nullable(),
    }),
  ),
  notes: z.array(z.string()),
});

export type SettlementRules = z.infer<typeof SettlementRulesSchema>;

export class AgentExtractionError extends Error {
  readonly name = "AgentExtractionError";
  constructor(detail: string) {
    super(`Settlement-rule extraction failed: ${detail}`);
  }
}

/** Contract/term-sheet JSON -> structured settlement rules (human-confirmed later). */
export async function extractSettlementRules(
  contractContent: unknown,
): Promise<{ rules: SettlementRules; model: string }> {
  const response = await getGemini().models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              "You are the settlement-operations agent for Handsel, a creator×brand deal platform. " +
              "Extract the settlement rules from this signed contract JSON. " +
              "Amounts must be integer minor units (cents). Use basis points for shares " +
              "(e.g. 18% = 1800). List anything ambiguous in notes.\n\n" +
              JSON.stringify(contractContent),
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          creatorShareBasisPoints: { type: Type.INTEGER },
          currency: { type: Type.STRING },
          reportCadence: {
            type: Type.STRING,
            enum: ["MONTHLY", "QUARTERLY"],
          },
          reportGraceDays: { type: Type.INTEGER },
          milestones: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                amountMinorUnits: { type: Type.INTEGER },
                dueDate: { type: Type.STRING, nullable: true },
              },
              required: ["title", "amountMinorUnits"],
            },
          },
          notes: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: [
          "creatorShareBasisPoints",
          "currency",
          "reportCadence",
          "reportGraceDays",
          "milestones",
          "notes",
        ],
      },
    },
  });

  const text = response.text;
  if (!text) throw new AgentExtractionError("empty model response");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AgentExtractionError("model returned invalid JSON");
  }
  const rules = SettlementRulesSchema.safeParse(parsed);
  if (!rules.success)
    throw new AgentExtractionError(rules.error.issues[0]?.message ?? "schema");
  return { rules: rules.data, model: GEMINI_MODEL };
}

export type ReconciliationResult = Readonly<{
  grossRevenueMinorUnits: number;
  creatorShareMinorUnits: number;
  brandShareMinorUnits: number;
  flags: readonly string[];
  narrative: string;
  model: string;
}>;

/**
 * Monthly sales report -> settlement statement. The payable amount comes from
 * computeRevShare (deterministic); Gemini only writes the narrative and flags
 * anomalies (under-reporting, math errors, late submission).
 */
export async function reconcileSalesReport(
  rules: SettlementRules,
  report: {
    periodEnd: string;
    units: number;
    grossRevenueMinorUnits: number;
    timing: "ON_TIME" | "LATE";
  },
): Promise<ReconciliationResult> {
  const share = computeRevShare(
    report.grossRevenueMinorUnits,
    rules.creatorShareBasisPoints,
  );

  const response = await getGemini().models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              "You are the reconciliation agent for Handsel. Review this monthly sales report " +
              "against the confirmed settlement rules. The payable amounts below were computed " +
              "deterministically and are authoritative — do NOT recompute them. Flag anomalies " +
              "(suspiciously low units/revenue, late submission, rule mismatches) and write a " +
              "short professional settlement narrative in English then 繁體中文.\n\n" +
              JSON.stringify({ rules, report, authoritative: share }),
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          flags: { type: Type.ARRAY, items: { type: Type.STRING } },
          narrative: { type: Type.STRING },
        },
        required: ["flags", "narrative"],
      },
    },
  });

  const fallback = { flags: [] as string[], narrative: "" };
  let agent = fallback;
  try {
    const text = response.text;
    if (text) {
      const parsed = z
        .object({ flags: z.array(z.string()), narrative: z.string() })
        .safeParse(JSON.parse(text));
      if (parsed.success) agent = parsed.data;
    }
  } catch {
    agent = fallback;
  }

  return {
    grossRevenueMinorUnits: report.grossRevenueMinorUnits,
    creatorShareMinorUnits: share.creatorShareMinorUnits,
    brandShareMinorUnits: share.brandShareMinorUnits,
    flags:
      report.timing === "LATE" && !agent.flags.some((f) => /late/i.test(f))
        ? [...agent.flags, "Report submitted late"]
        : agent.flags,
    narrative: agent.narrative,
    model: GEMINI_MODEL,
  };
}
