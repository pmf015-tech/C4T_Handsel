"use client";

import { SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/nextjs";

import type { Language } from "./prototype-data";

type LandingAuthProps = {
  readonly language: Language;
  readonly setLanguage: (language: Language) => void;
  readonly openDemo: () => void;
};

export function LandingAuth({
  language,
  setLanguage,
  openDemo,
}: LandingAuthProps) {
  const { isSignedIn } = useAuth();
  const zh = language === "zh-Hant";

  return (
    <div className="landing-actions">
      <div className="language-toggle" aria-label={zh ? "語言" : "Language"}>
        <button
          className={zh ? "is-current" : ""}
          aria-pressed={zh}
          onClick={() => setLanguage("zh-Hant")}
        >
          中
        </button>
        <span>/</span>
        <button
          className={!zh ? "is-current" : ""}
          aria-pressed={!zh}
          onClick={() => setLanguage("en")}
        >
          EN
        </button>
      </div>
      <div
        className="clerk-auth"
        aria-label={zh ? "帳戶操作" : "Account actions"}
      >
        {isSignedIn ? (
          <UserButton />
        ) : (
          <>
            <SignInButton mode="modal" fallbackRedirectUrl="/dashboard">
              <button type="button" className="nav-demo">
                {zh ? "登入" : "Sign in"}
              </button>
            </SignInButton>
            <SignUpButton
              mode="modal"
              fallbackRedirectUrl="/onboarding?role=creator"
            >
              <button type="button" className="nav-signup">
                {zh ? "註冊" : "Get started"}
              </button>
            </SignUpButton>
          </>
        )}
      </div>
      <button className="nav-demo" onClick={openDemo}>
        {zh ? "預約示範" : "Book a demo"}
      </button>
    </div>
  );
}
