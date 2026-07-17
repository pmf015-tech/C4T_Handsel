import type { ComponentProps, Dispatch, SetStateAction } from "react";

import styles from "./deal-builder.module.css";
import {
  appendMilestoneRow,
  MAX_MILESTONES,
  removeMilestoneRow,
  updateMilestoneRow,
  type MilestoneRow,
} from "./milestone-rows";

type MilestoneEditorCopy = Readonly<{
  milestonesLabel: string;
  milestoneCount: string;
  milestoneLabel: string;
  milestoneTitleLabel: string;
  milestoneAmountLabel: string;
  dueLabel: string;
  removeMilestone: string;
  milestoneLimit: string;
  addMilestone: string;
}>;

type MilestoneEditorProps = Readonly<{
  copy: MilestoneEditorCopy;
  rows: readonly MilestoneRow[];
  setRows: Dispatch<SetStateAction<readonly MilestoneRow[]>>;
}>;

function MilestoneInput({
  label,
  ...inputProps
}: Readonly<{ label: string }> & ComponentProps<"input">) {
  return (
    <label>
      {label}
      <input {...inputProps} />
    </label>
  );
}

function isoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function MilestoneEditor({ copy, rows, setRows }: MilestoneEditorProps) {
  return (
    <div className={styles.milestones}>
      <div className={styles.milestoneHeading}>
        <h2>{copy.milestonesLabel}</h2>
        <span>
          {rows.length} {copy.milestoneCount}
        </span>
      </div>
      {rows.map((milestone, index) => (
        <fieldset className={styles.milestone} key={index}>
          <legend>
            {copy.milestoneLabel} {index + 1}
          </legend>
          <MilestoneInput
            required
            label={copy.milestoneTitleLabel}
            value={milestone.title}
            onChange={(event) =>
              setRows((currentRows) =>
                updateMilestoneRow(currentRows, index, {
                  title: event.target.value,
                }),
              )
            }
          />
          <div className={styles.row}>
            <MilestoneInput
              required
              label={copy.milestoneAmountLabel}
              min="1"
              step="1"
              type="number"
              value={milestone.amountWholeUnits}
              onChange={(event) =>
                setRows((currentRows) =>
                  updateMilestoneRow(currentRows, index, {
                    amountWholeUnits: event.target.value,
                  }),
                )
              }
            />
            <MilestoneInput
              required
              label={copy.dueLabel}
              type="date"
              value={milestone.dueAt}
              onChange={(event) =>
                setRows((currentRows) =>
                  updateMilestoneRow(currentRows, index, {
                    dueAt: event.target.value,
                  }),
                )
              }
            />
          </div>
          <button
            className={styles.removeMilestone}
            disabled={rows.length === 1}
            type="button"
            onClick={() =>
              setRows((currentRows) => removeMilestoneRow(currentRows, index))
            }
          >
            {copy.removeMilestone}
          </button>
        </fieldset>
      ))}
      <button
        className={styles.addMilestone}
        disabled={rows.length === MAX_MILESTONES}
        type="button"
        onClick={() =>
          setRows((currentRows) => appendMilestoneRow(currentRows, isoDate()))
        }
      >
        {rows.length === MAX_MILESTONES
          ? copy.milestoneLimit
          : copy.addMilestone}
      </button>
    </div>
  );
}
