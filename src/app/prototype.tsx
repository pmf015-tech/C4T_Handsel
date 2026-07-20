"use client";

import { useEffect, useState } from "react";
import type { Language, Role, Screen } from "./prototype-data";
import { AppShell, DemoModal } from "./prototype-shared";
import { Landing, Onboarding, Dashboard, Builder, TermSheet, Contract, Deal, Milestone, Sales, Payouts, Dispute, TrackRecord, Settings, Admin } from "./prototype-views";
import "./prototype.css";

export default function HandselPrototype() {
  const [screen, setScreen] = useState<Screen>("sales");
  const [language, setLanguage] = useState<Language>("en");
  const [role, setRole] = useState<Role>("creator");
  const [builderStep, setBuilderStep] = useState(0);
  const [draftSaved, setDraftSaved] = useState(false);
  const [signed, setSigned] = useState(false);
  const [approved, setApproved] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [payoutRetried, setPayoutRetried] = useState(false);
  const [disputeResolved, setDisputeResolved] = useState(false);
  const [publicDeal, setPublicDeal] = useState(true);
  const [demoOpen, setDemoOpen] = useState(false);
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  useEffect(() => { document.documentElement.lang = language; }, [language]);
  const navigate = (next: Screen) => setScreen(next);
  const shared = { language, setLanguage, role, setRole, navigate, demoOpen, setDemoOpen, demoSubmitted, setDemoSubmitted };
  const appProps = { ...shared, screen };

  if (screen === "landing") return <><Landing {...shared} /><DemoModal language={language} open={demoOpen} submitted={demoSubmitted} setOpen={setDemoOpen} setSubmitted={setDemoSubmitted} /></>;
  if (screen === "onboarding") return <><Onboarding {...shared} /><DemoModal language={language} open={demoOpen} submitted={demoSubmitted} setOpen={setDemoOpen} setSubmitted={setDemoSubmitted} /></>;
  return <AppShell {...appProps}>
    {screen === "dashboard" && <Dashboard {...shared} approved={approved} reportSent={reportSent} />}
    {screen === "builder" && <Builder {...shared} step={builderStep} setStep={setBuilderStep} draftSaved={draftSaved} onSaveDraft={() => setDraftSaved(true)} />}
    {screen === "term" && <TermSheet {...shared} />}
    {screen === "contract" && <Contract {...shared} signed={signed} onSign={() => setSigned(true)} />}
    {screen === "deal" && <Deal {...shared} approved={approved} reportSent={reportSent} disputeResolved={disputeResolved} />}
    {screen === "milestone" && <Milestone {...shared} approved={approved} onApprove={() => setApproved(true)} />}
    {screen === "sales" && <Sales {...shared} submitted={reportSent} onSubmit={() => setReportSent(true)} />}
    {screen === "payouts" && <Payouts {...shared} retried={payoutRetried} onRetry={() => setPayoutRetried(true)} />}
    {screen === "dispute" && <Dispute {...shared} resolved={disputeResolved} onResolve={() => setDisputeResolved(true)} />}
    {screen === "track" && <TrackRecord {...shared} publicDeal={publicDeal} />}
    {screen === "settings" && <Settings {...shared} publicDeal={publicDeal} setPublicDeal={setPublicDeal} />}
    {screen === "admin" && <Admin {...shared} retried={payoutRetried} onRetry={() => setPayoutRetried(true)} />}
  </AppShell>;
}
