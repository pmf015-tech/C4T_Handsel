"use client";

import ky, { TimeoutError } from "ky";
import { useState, type FormEvent } from "react";

import { ONBOARDING_COPY } from "@/lib/i18n/onboarding";
import { createOnboardingPayload } from "@/lib/profile/browser-payload";
import {
  OnboardingApiResponseSchema,
  type BilingualFieldMessage,
  type OnboardingFieldErrors,
} from "@/lib/profile/onboarding";
import styles from "./onboarding.module.css";

type Role = "creator" | "brand";
type Language = "en" | "zh-Hant";

type OnboardingFormProps = {
  readonly defaultRole: Role;
};

type FormFailure = {
  readonly message: BilingualFieldMessage;
  readonly correlationId?: string;
};

const GENERIC_FAILURE = {
  en: ONBOARDING_COPY.en.genericError,
  zhHant: ONBOARDING_COPY["zh-Hant"].genericError,
} as const;

export function OnboardingForm({ defaultRole }: OnboardingFormProps) {
  const [role, setRole] = useState<Role>(defaultRole);
  const [language, setLanguage] = useState<Language>("en");
  const [displayName, setDisplayName] = useState("");
  const [niche, setNiche] = useState("");
  const [followerCount, setFollowerCount] = useState("");
  const [engagementRate, setEngagementRate] = useState("");
  const [social, setSocial] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<OnboardingFieldErrors>({});
  const [failure, setFailure] = useState<FormFailure | null>(null);
  const [saving, setSaving] = useState(false);
  const copy = ONBOARDING_COPY[language];

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    setFailure(null);

    const payload = createOnboardingPayload({
      role,
      displayName,
      language,
      niche,
      followerCount,
      engagementRate,
      social,
      productCategory,
      website,
    });

    try {
      const response = await ky.post("/api/onboarding/profile", {
        json: payload,
        throwHttpErrors: false,
      });
      const result = OnboardingApiResponseSchema.parse(await response.json());
      if (!result.ok) {
        setErrors(result.fields);
        setFailure(
          result.correlationId
            ? { message: result.message, correlationId: result.correlationId }
            : { message: result.message },
        );
        return;
      }
      window.location.assign("/dashboard");
    } catch (error) {
      if (error instanceof TypeError || error instanceof TimeoutError) {
        setFailure({ message: GENERIC_FAILURE });
      } else {
        throw error;
      }
    } finally {
      setSaving(false);
    }
  }

  function fieldError(field: string): string | undefined {
    const error = errors[field];
    return error ? messageForLanguage(error, language) : undefined;
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.languageToggle}>
          <button type="button" onClick={() => setLanguage("zh-Hant")}>
            中
          </button>
          <span>/</span>
          <button type="button" onClick={() => setLanguage("en")}>
            EN
          </button>
        </div>
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p>{copy.body}</p>

        <form onSubmit={submit} className={styles.form}>
          <fieldset className={styles.rolePicker}>
            <legend>{copy.role}</legend>
            <button
              className={role === "creator" ? styles.selected : ""}
              type="button"
              onClick={() => setRole("creator")}
            >
              {copy.creator}
            </button>
            <button
              className={role === "brand" ? styles.selected : ""}
              type="button"
              onClick={() => setRole("brand")}
            >
              {copy.brand}
            </button>
          </fieldset>

          <Field
            error={fieldError("displayName")}
            label={copy.displayName}
            onChange={setDisplayName}
            value={displayName}
          />

          {role === "creator" ? (
            <>
              <Field
                error={fieldError("niche")}
                label={copy.niche}
                onChange={setNiche}
                value={niche}
              />
              <Field
                error={fieldError("followerCount")}
                inputMode="numeric"
                label={copy.followerCount}
                onChange={setFollowerCount}
                value={followerCount}
              />
              <Field
                error={fieldError("engagementRateBasisPoints")}
                inputMode="decimal"
                label={copy.engagementRate}
                onChange={setEngagementRate}
                value={engagementRate}
              />
              <Field
                error={fieldError("socials")}
                label={copy.socials}
                onChange={setSocial}
                type="url"
                value={social}
              />
            </>
          ) : (
            <>
              <Field
                error={fieldError("productCategory")}
                label={copy.productCategory}
                onChange={setProductCategory}
                value={productCategory}
              />
              <Field
                error={fieldError("website")}
                label={copy.website}
                onChange={setWebsite}
                type="url"
                value={website}
              />
            </>
          )}

          <label>
            {copy.language}
            <select
              value={language}
              onChange={(event) =>
                setLanguage(event.target.value === "zh-Hant" ? "zh-Hant" : "en")
              }
            >
              <option value="en">English</option>
              <option value="zh-Hant">繁體中文</option>
            </select>
          </label>

          {failure ? (
            <p className={styles.formError}>
              {messageForLanguage(failure.message, language)}
              {failure.correlationId
                ? ` ${copy.reference}: ${failure.correlationId}`
                : null}
            </p>
          ) : null}
          <button className={styles.submit} disabled={saving} type="submit">
            {saving ? copy.saving : copy.save}
          </button>
        </form>
      </section>
    </main>
  );
}

type FieldProps = {
  readonly error: string | undefined;
  readonly inputMode?: "decimal" | "numeric";
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly type?: "text" | "url";
  readonly value: string;
};

function messageForLanguage(
  message: BilingualFieldMessage,
  language: Language,
): string {
  switch (language) {
    case "en":
      return message.en;
    case "zh-Hant":
      return message.zhHant;
    default:
      return assertNeverLanguage(language);
  }
}

class InvalidLanguageError extends Error {
  readonly name = "InvalidLanguageError";

  constructor() {
    super("Language is outside the supported onboarding domain");
  }
}

function assertNeverLanguage(_language: never): never {
  throw new InvalidLanguageError();
}

function Field({
  error,
  inputMode,
  label,
  onChange,
  type = "text",
  value,
}: FieldProps) {
  return (
    <label>
      {label}
      <input
        aria-invalid={Boolean(error)}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
      {error ? <small className={styles.fieldError}>{error}</small> : null}
    </label>
  );
}
