import { z } from "zod";

const milestoneSchema = z
  .object({
    title: z.string().trim().min(2).max(80),
    amountMinorUnits: z.number().int().safe().positive(),
    dueAt: z.string().datetime(),
  })
  .strict();

export const CreateDealInputSchema = z
  .object({
    title: z.string().trim().min(2).max(80),
    counterpartyName: z.string().trim().min(2).max(80),
    currency: z.enum(["HKD", "TWD", "USD"]),
    creatorShareBasisPoints: z.number().int().min(1).max(9500),
    projectedRevenueMinorUnits: z.number().int().safe().positive(),
    milestones: z.array(milestoneSchema).min(1).max(20),
    disputeClause: z.enum([
      "REFUND_BRAND",
      "SPLIT_BY_DELIVERED_PROPORTION",
      "EXTERNAL_MEDIATION",
    ]),
  })
  .strict()
  .superRefine((input, context) => {
    const titles = input.milestones.map((milestone) =>
      milestone.title.toLocaleLowerCase("en-US"),
    );
    if (new Set(titles).size !== titles.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["milestones"],
        message: "Milestone titles must be unique.",
      });
    }
  });

export type CreateDealInput = z.infer<typeof CreateDealInputSchema>;

export function formatDealErrors(
  error: z.ZodError,
): Record<string, { en: string; zhHant: string }> {
  return Object.fromEntries(
    error.issues.map((issue) => {
      const field = issue.path[0]?.toString() ?? "_form";
      return [field, { en: issue.message, zhHant: "請修正呢個欄位。" }];
    }),
  );
}
