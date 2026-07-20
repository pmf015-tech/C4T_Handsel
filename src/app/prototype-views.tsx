import { useState, type Dispatch, type SetStateAction, type ReactNode } from "react";
import type { Language, Role, Screen } from "./prototype-data";
import { activity, agentEvents, builderSteps, dealName, reconciliationResult, settlementRules, words } from "./prototype-data";
import { LandingAuth } from "./landing-auth";
import { Badge, Button, Clock, Logo } from "./prototype-shared";
import AnimatedContent from "@/components/AnimatedContent";
import BlurText from "@/components/BlurText";
import CountUp from "@/components/CountUp";
import SpotlightCard from "@/components/SpotlightCard";

type Core = { language: Language; setLanguage: Dispatch<SetStateAction<Language>>; role: Role; setRole: Dispatch<SetStateAction<Role>>; navigate: (screen: Screen) => void; demoOpen: boolean; setDemoOpen: Dispatch<SetStateAction<boolean>>; demoSubmitted: boolean; setDemoSubmitted: Dispatch<SetStateAction<boolean>> };

function Intro({ eyebrow, title, body, action }: { eyebrow: string; title: string; body: string; action?: ReactNode }) {
  return <AnimatedContent distance={20} duration={0.55}><div className="page-intro"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{body}</p>{action}</div></AnimatedContent>;
}

function Reveal({ children, delay = 0, distance = 18, className }: { children: ReactNode; delay?: number; distance?: number; className?: string }) {
  return <AnimatedContent distance={distance} duration={0.5} delay={delay} className={className}>{children}</AnimatedContent>;
}

function HeroLogo({ language, onHome }: { language: Language; onHome: () => void }) {
  return <div className="hero-logo"><button type="button" className="hero-logo-home" onClick={onHome} aria-label={language === "zh-Hant" ? "返回 Handsel 首頁" : "Back to Handsel home"}><Logo inverse /></button><span>{language === "zh-Hant" ? <>信任、條款同收款，<br />一個平台全部處理。</> : <>Trust, terms, and<br />payouts in one place.</>}</span></div>;
}

export function Landing({ language, setLanguage, setRole, navigate, setDemoOpen, setDemoSubmitted }: Omit<Core, "role" | "demoOpen" | "demoSubmitted"> & { setDemoOpen: Dispatch<SetStateAction<boolean>>; setDemoSubmitted: Dispatch<SetStateAction<boolean>> }) {
  const zh = language === "zh-Hant";
  const begin = (nextRole: Role) => {
    setRole(nextRole);
    window.location.assign(`/onboarding?role=${nextRole}`);
  };
  const openDemo = () => { setDemoSubmitted(false); setDemoOpen(true); };
  const copy = zh ? {
    eyebrow: "創作者 × 品牌合作",
    title: "將每個承諾，變成可以證明的進度。",
    body: "Handsel 為創作者與品牌合作提供清晰合約、共享時間線，以及按里程碑推進的款項。",
    demo: "預約產品示範",
    how: "了解運作方式 ↓",
    calmer: "一個更從容嘅合作方式",
    space: "由握手承諾，到完成合作之間嘅清晰空間。",
    spaceBody: "Handsel 將散落嘅訊息、不清晰嘅條款同尷尬嘅付款跟進，整合成雙方都睇得明、信得過嘅流程。",
    flowLabel: "HANDSEL 合作流程",
    flowTitle: "由第一份條款，到最後一筆款項",
    both: "為雙方而設",
    bothTitle: "更好嘅合作，由雙方睇到同一份協議開始。",
    creator: "創作者",
    brand: "品牌",
    creatorBody: "少啲時間追問進度，清楚知道要交付乜、邊啲已批准，以及下一筆款項幾時到。",
    brandBody: "由合作簡報到可核對嘅交付，令合作夥伴保持同步，唔使再增加更多試算表。",
    presale: "現正預售",
    closeTitle: "令下一次合作，更容易答應。",
    closeBody: "用一個 20 分鐘嘅示範，了解 Handsel 點樣配合你嘅創作者或品牌合作流程。"
  } : {
    eyebrow: "THE DEAL-TO-PAYOUT PLATFORM",
    title: "Turn every promise into progress you can prove.",
    body: "Handsel gives creator-brand partnerships a clear contract, a shared timeline, and payouts that move when milestones are met.",
    demo: "Book a demo",
    how: "See how it works ↓",
    calmer: "A calmer way to collaborate",
    space: "The space between a handshake and a finished deal.",
    spaceBody: "Handsel replaces scattered messages, uncertain terms, and awkward payment follow-ups with one visible flow both sides can trust.",
    flowLabel: "THE HANDSEL FLOW",
    flowTitle: "From first terms to final payout",
    both: "BUILT FOR BOTH SIDES",
    bothTitle: "Better partnerships start with the same view of the deal.",
    creator: "For creators",
    brand: "For brands",
    creatorBody: "Spend less time chasing clarity. Know what is due, what is approved, and when the next payout is expected.",
    brandBody: "Move from campaign brief to accountable delivery. Keep partners aligned without adding more spreadsheets.",
    presale: "PRESELLING NOW",
    closeTitle: "Make the next partnership easier to say yes to.",
    closeBody: "See how Handsel could fit your creator or brand workflow in a focused, 20-minute demo."
  };
  const flow = zh ? [
    ["01", "整理合作條款", "設定交付內容、日期、分成，以及計劃改變時嘅處理方式。"],
    ["02", "放心簽署", "將雙方同意嘅版本變成清晰、可驗證嘅合約。"],
    ["03", "追蹤重要進度", "將銷售、證據、批准同下一步放喺同一條時間線。"],
    ["04", "按進度收款", "里程碑款項跟住工作進度發放，令合作一直清晰。"]
  ] : [
    ["01", "Structure the deal", "Define deliverables, dates, revenue share, and what happens if plans change."],
    ["02", "Sign with confidence", "Turn the agreed version into a clear, tamper-evident contract."],
    ["03", "Track what matters", "See sales, evidence, approvals, and the next action in one timeline."],
    ["04", "Get paid on progress", "Milestone payouts follow the work, so momentum stays visible."]
  ];
  return <div className="landing" id="top">
    <header className="landing-header"><a href="#top" aria-label={zh ? "Handsel 首頁" : "Handsel home"}><Logo /></a><nav aria-label={zh ? "主要導覽" : "Main navigation"}><a href="#how-it-works">{zh ? "運作方式" : "How it works"}</a><button onClick={() => begin("creator")}>{zh ? "創作者" : "For creators"}</button><button onClick={() => begin("brand")}>{zh ? "品牌" : "For brands"}</button></nav><LandingAuth language={language} setLanguage={setLanguage} openDemo={openDemo} /></header>
    <main className="landing-main">
      <section className="landing-hero landing-hero--editorial"><div><span className="eyebrow">{copy.eyebrow}</span><h1><BlurText text={copy.title} animateBy="words" delay={90} stepDuration={0.3} /></h1><p>{copy.body}</p><div className="button-row"><Button onClick={openDemo}>{copy.demo} →</Button><a className="text-link" href="#how-it-works">{copy.how}</a></div><div className="landing-proof"><span>↗ <b>{zh ? "結構化條款" : "Structured terms"}</b><small>{zh ? "清晰交付、日期及報酬。" : "Clear deliverables, dates, and compensation."}</small></span><span>◫ <b>{zh ? "追蹤進度" : "Tracked progress"}</b><small>{zh ? "每個里程碑都有共同事實來源。" : "Every milestone has one shared source of truth."}</small></span><span>✓ <b>{zh ? "放心付款" : "Confident payouts"}</b><small>{zh ? "工作完成後先發放款項。" : "Release funds when the work is done."}</small></span></div></div><div className="landing-preview landing-preview--hero" aria-label={zh ? "Handsel 產品預覽" : "Handsel product preview"}><div className="preview-side"><span className="preview-kicker">{zh ? "條款表" : "TERM SHEET"} <b>v3 · {zh ? "即時" : "Live"}</b></span><Logo inverse /><span>{zh ? "創作者分成" : "Creator share"}<strong>18%</strong></span><span>{zh ? "里程碑" : "Milestones"}<strong>05</strong></span></div><div className="preview-content"><div className="preview-status"><span>✓ {zh ? "雙方已簽署" : "Signed by both parties"}</span><span>● {zh ? "合作進行中" : "Live deal workspace"}</span></div><h3>Glow Ritual × Brightside</h3><div className="preview-timeline"><p><b>✓</b><span><strong>{zh ? "合約已簽署" : "Contract signed"}</strong><small>{zh ? "已完成" : "Completed"}</small></span></p><p><b>✓</b><span><strong>{zh ? "內容已發佈" : "Content published"}</strong><small>{zh ? "已完成" : "Completed"}</small></span></p><p><b>3</b><span><strong>{zh ? "第 3 / 5 個里程碑" : "Milestone 3 of 5"}</strong><small>{zh ? "銷售目標 · 67%" : "Sales target · 67%"}</small></span></p><p><b>4</b><span><strong>{zh ? "下一個銷售目標" : "Next sales target"}</strong><small>{zh ? "即將開始" : "Upcoming"}</small></span></p></div><div className="preview-payout"><span>{zh ? "下一筆款項" : "Next payout"}<strong>$<CountUp to={7500} separator="," duration={1.6} /></strong><small>{zh ? "批准後持有並發放" : "Held until approval"}</small></span><i>$</i></div></div></div></section>
      <section className="landing-story"><AnimatedContent distance={48} duration={0.9}><span className="eyebrow">{copy.calmer}</span><h2>{copy.space}</h2><p>{copy.spaceBody}</p></AnimatedContent></section>
      <section className="flow-strip flow-strip--cards" id="how-it-works"><div className="flow-heading"><span className="eyebrow">{copy.flowLabel}</span><h2>{copy.flowTitle}</h2></div>{flow.map(([number, title, body], index) => <AnimatedContent key={number} className="card-reveal" distance={40} duration={0.7} delay={index * 0.1}><article><span className="flow-number">{number}</span><h3>{title}</h3><p>{body}</p><span className="flow-arrow">↗</span></article></AnimatedContent>)}</section>
      <section className="landing-roles"><span className="eyebrow">{copy.both}</span><h2>{copy.bothTitle}</h2><div className="role-cards"><SpotlightCard><article id="for-creators"><span className="role-card-label">✦ {copy.creator}</span><span>01 / {zh ? "創作者" : "CREATOR"}</span><h3>{copy.creator}</h3><p>{copy.creatorBody}</p><Button tone="secondary" onClick={() => begin("creator")}>{zh ? "以創作者身份開始" : "I’m a creator →"}</Button></article></SpotlightCard><SpotlightCard><article id="for-brands"><span className="role-card-label">◌ {copy.brand}</span><span>02 / {zh ? "品牌" : "BRAND"}</span><h3>{copy.brand}</h3><p>{copy.brandBody}</p><Button tone="secondary" onClick={() => begin("brand")}>{zh ? "以品牌身份開始" : "I’m a brand →"}</Button></article></SpotlightCard></div></section>
      <section className="landing-close"><AnimatedContent distance={48} duration={0.9}><span className="eyebrow">{copy.presale}</span><h2>{copy.closeTitle}</h2><p>{copy.closeBody}</p><Button onClick={openDemo}>{copy.demo} →</Button></AnimatedContent></section>
    </main>
    <footer className="landing-footer"><a href="#top"><Logo /></a><p>{zh ? "Handsel 係 C4T Center For Transformation 旗下產品。" : "Handsel is a product under C4T Center For Transformation."}</p><span>{zh ? "將信任變得可見。" : "Trust, made visible."}</span></footer>
  </div>;
}

export function Onboarding({ language, role, setRole, navigate }: Core) {
  const [rate, setRate] = useState("0.5");
  const zh = language === "zh-Hant";
  const invalid = role === "creator" && Number(rate) < 1;
  return <div className="onboarding"><HeroLogo language={language} onHome={() => navigate("landing")} /><AnimatedContent distance={24} duration={0.6}><section className="onboard-form"><div className="step-label">{zh ? "第 2 步，共 2 步" : "Step 2 of 2"}</div><h1>{zh ? "介紹一下你自己" : "Tell us about you"}</h1><p>{zh ? "完成個人資料，讓合作夥伴更容易找到你。" : "Complete your profile so partners can find and work with you."}</p><div className="role-switch"><span>{zh ? "身份" : "Role"}</span><button onClick={() => setRole(role === "creator" ? "brand" : "creator")}>{role === "creator" ? (zh ? "創作者" : "Creator") : (zh ? "品牌" : "Brand")}</button></div><label>{zh ? "顯示名稱" : "Display name"}<input defaultValue={role === "creator" ? "Kaia Rivera" : "Brightside Brands"} /></label><div className="field-grid"><label>{role === "creator" ? (zh ? "內容類別" : "Niche") : (zh ? "產品類別" : "Product category")}<input defaultValue={role === "creator" ? (zh ? "美容及護膚" : "Beauty & skincare") : (zh ? "護膚" : "Skincare")} /></label><label>{role === "creator" ? (zh ? "追蹤人數" : "Follower count") : (zh ? "網站" : "Website")}<input defaultValue={role === "creator" ? "48,500" : "brightside.co"} /></label></div>{role === "creator" && <label>{zh ? "互動率 (%)" : "Engagement rate (%)"}<input value={rate} onChange={(event) => setRate(event.target.value)} className={invalid ? "input-error" : ""} />{invalid && <small className="field-error">{zh ? "互動率必須至少為 1%" : "Engagement rate must be at least 1%"}</small>}</label>}<label>{zh ? "偏好語言" : "Preferred language"}<select defaultValue={zh ? "zh" : "en"}><option value="en">English</option><option value="zh">繁體中文</option></select></label><Button onClick={() => !invalid && navigate("dashboard")}>{zh ? "進入 Handsel →" : "Enter Handsel →"}</Button></section></AnimatedContent></div>;
}

export function Dashboard({ language, navigate, approved, reportSent }: Core & { approved: boolean; reportSent: boolean }) {
  const w = words[language];
  const zh = language === "zh-Hant";
  return <><Intro eyebrow={zh ? "工作區" : "Workspace"} title={zh ? "早晨，Kaia" : "Good morning, Kaia"} body={zh ? "每個合作的下一步、時限及最新狀態都在同一個地方。" : "Every next action, deadline, and deal status in one place."} /><section className="dashboard-grid"><div className="wide-panel"><div className="panel-head"><h2>{zh ? "需要處理" : "Action required"}</h2><Button onClick={() => navigate("builder")}>{zh ? "開始合作" : "Start a deal"}</Button></div><button className="action-row" onClick={() => navigate("contract")}><span><Badge tone="red">!</Badge>{dealName}</span><b>{w.sign}</b><Clock urgent>{zh ? "剩餘 2 日" : "2 days left"}</Clock></button><button className="action-row" onClick={() => navigate("milestone")}><span><Badge tone="amber">!</Badge>Luma Skin × Serein</span><b>{approved ? w.completed : (zh ? "批准交付內容" : "Approve deliverable")}</b><Clock>{zh ? "剩餘 3 日" : "3 days left"}</Clock></button><button className="action-row" onClick={() => navigate("sales")}><span><Badge tone="amber">!</Badge>Halo Hair × Nova Beauty</span><b>{reportSent ? (zh ? "報告已提交" : "Report submitted") : (zh ? "銷售報告到期" : "Sales report due")}</b><Clock>{zh ? "剩餘 5 日" : "5 days left"}</Clock></button></div><SpotlightCard className="track-card-spotlight"><aside className="track-card"><span>{zh ? "合作履歷" : "Track record"}</span><b><CountUp to={4} duration={1.1} /></b><small>{zh ? "個已完成合作" : "completed deals"}</small><div>★ 4.9</div></aside></SpotlightCard></section><section><div className="panel-head"><h2>{zh ? "進行中合作" : "Active deals"}</h2></div><div className="deal-cards">{[["Sunrae Skincare × Launch", "Active", zh ? "剩餘 2 日" : "2 days left"], [dealName, "In review", zh ? "剩餘 3 日" : "3 days left"], ["Halo Hair × Nova Beauty", "Pending", zh ? "剩餘 5 日" : "5 days left"]].map(([name, status, clock], index) => <Reveal key={name} delay={index * 0.06}><button className="deal-card" onClick={() => navigate("deal")}><b>{name}</b><Badge tone={status === "Active" ? "green" : status === "In review" ? "blue" : "gray"}>{zh ? (status === "Active" ? "進行中" : status === "In review" ? "審核中" : "待處理") : status}</Badge><span>{zh ? "等待：" : "Waiting on: "}<strong>{zh ? "品牌" : "Brand"}</strong></span><Clock>{clock}</Clock><div className="progress-dots"><i /><i /><i /><i /><i /></div></button></Reveal>)}</div></section></>;
}

export function Builder({ language, navigate, step, setStep, draftSaved, onSaveDraft }: Core & { step: number; setStep: Dispatch<SetStateAction<number>>; draftSaved: boolean; onSaveDraft: () => void }) {
  const zh = language === "zh-Hant";
  const isTerms = step === 2;
  const stepLabels = zh ? ["雙方與產品", "創作者與交付內容", "商業條款", "爭議條款"] : builderSteps;
  const title = stepLabels[step] ?? stepLabels[0] ?? (zh ? "雙方與產品" : "Parties & product");
  return <><button className="back-link" onClick={() => navigate("dashboard")}>← {zh ? "返回主控台" : "Back to dashboard"}</button><Intro eyebrow={zh ? "新合作" : "New deal"} title={title} body={isTerms ? (zh ? "設定收入分成及里程碑付款。" : "Define how revenue is shared and milestones are paid.") : (zh ? "填寫雙方需要確認嘅資料，建立一份可驗證嘅合作協議。" : "Capture the information both parties need to agree on a verifiable partnership.")} /><div className="wizard-progress">{stepLabels.map((label, index) => <button className={index === step ? "current" : index < step ? "done" : ""} key={label} onClick={() => setStep(index)}><i>{index < step ? "✓" : index + 1}</i>{label}</button>)}</div><section className="builder-layout"><Reveal className="form-panel">{isTerms ? <CommercialTerms language={language} /> : <BuilderForm step={step} language={language} />}{draftSaved && <div className="success-notice">{zh ? "草稿已儲存，你可以稍後從主控台返回呢份合作。" : "Draft saved. You can return to this deal from the dashboard."}</div>}<div className="sticky-actions"><Button tone="secondary" onClick={() => setStep(Math.max(0, step - 1))}>{zh ? "返回" : "Back"}</Button><Button tone="secondary" onClick={onSaveDraft}>{zh ? "儲存草稿" : "Save draft"}</Button><Button onClick={() => step === 3 ? navigate("term") : setStep(step + 1)}>{step === 3 ? (zh ? "產生條款表" : "Generate term sheet") : (zh ? "繼續" : "Continue")}</Button></div></Reveal><TermPreview language={language} /></section></>;
}

function BuilderForm({ step, language }: { step: number; language: Language }) { const zh = language === "zh-Hant"; const firstLabel = step === 0 ? (zh ? "品牌／創作者邀請" : "Brand / creator invite") : step === 1 ? (zh ? "創作者資料" : "Creator profile") : (zh ? "預設處理結果" : "Default outcome"); const secondLabel = step === 0 ? (zh ? "產品類別" : "Product category") : step === 1 ? (zh ? "交付內容 1" : "Deliverable 1") : (zh ? "協商時限" : "Negotiation window"); const firstValue = step === 0 ? "brightside@brand.co" : step === 1 ? (zh ? "Kaia Chen · 48,500 位追蹤者" : "Kaia Chen · 48,500 followers") : (zh ? "按實際交付比例分配" : "Split by delivered proportion"); const secondValue = step === 0 ? (zh ? "護膚" : "Skincare") : step === 1 ? (zh ? "1 段發佈短片及 3 則限時動態" : "1 launch Reel + 3 Stories") : (zh ? "14 日" : "14 days"); return <div className="builder-form"><label>{firstLabel}<input defaultValue={firstValue} /></label><label>{secondLabel}<input defaultValue={secondValue} /></label><p className="helper-copy">{zh ? "呢啲資料會保存到合作草稿，並帶入下一個合作狀態。" : "These inputs are saved as a deal draft and feed the next state of the partnership."}</p></div>; }

function CommercialTerms({ language }: { language: Language }) { const zh = language === "zh-Hant"; return <div className="commercial"><div className="term-row"><div><b>{zh ? "收入分成" : "Revenue share"}</b><p>{zh ? "設定創作者所得嘅淨收入比例。" : "Set the creator’s share of net revenue."}</p></div><div><strong>{zh ? "創作者分成：18%" : "Creator share: 18%"}</strong><input type="range" min="0" max="100" defaultValue="18" /></div><input className="number-input" defaultValue="18" /></div><div className="term-row"><div><b>{zh ? "預計每月收入" : "Projected monthly revenue"}</b><p>{zh ? "估算平均每月總收入。" : "Your best estimate of average monthly gross revenue."}</p></div><input defaultValue="NT$ 200,000" /></div><div><b>{zh ? "里程碑付款" : "Milestone payments"}</b><table><thead><tr><th>{zh ? "里程碑名稱" : "Milestone title"}</th><th>{zh ? "金額" : "Amount"}</th><th>{zh ? "到期日" : "Due date"}</th></tr></thead><tbody><tr><td>{zh ? "推出活動" : "Launch campaign"}</td><td>NT$ 100,000</td><td>2026/08/15</td></tr><tr><td>{zh ? "首次銷售目標" : "First sales target"}</td><td>NT$ 50,000</td><td>2026/09/30</td></tr><tr><td>{zh ? "第二次銷售目標" : "Second sales target"}</td><td>NT$ 150,000</td><td>2026/10/31</td></tr></tbody></table></div></div>; }

function TermPreview({ language }: { language: Language }) { const zh = language === "zh-Hant"; return <aside className="term-preview"><div className="panel-head"><h3>{zh ? "條款表預覽" : "Term sheet preview"}</h3><Badge tone="green">{zh ? "即時" : "Live"}</Badge></div><Logo /><hr /><b>{zh ? "合作概覽" : "Deal overview"}</b><dl><dt>{zh ? "創作者" : "Creator"}</dt><dd>Kaia</dd><dt>{zh ? "品牌" : "Brand"}</dt><dd>Luma Skin</dd><dt>{zh ? "產品" : "Product"}</dt><dd>Serein</dd><dt>{zh ? "創作者分成" : "Creator share"}</dt><dd>18%</dd></dl><b>{zh ? "里程碑付款" : "Milestone payments"}</b><ol><li>{zh ? "推出活動" : "Launch campaign"}</li><li>{zh ? "首次銷售目標" : "First sales target"}</li><li>{zh ? "第二次銷售目標" : "Second sales target"}</li></ol><small>{zh ? "呢份只係非約束性預覽。" : "This is a non-binding preview."}</small></aside>; }

export function TermSheet({ language, navigate }: Core) { const zh = language === "zh-Hant"; return <><div className="guest-bar">{zh ? "你正以訪客身份查看，請登入後回應" : "You’re viewing as guest — sign in to respond"}</div><section className="term-sheet-layout"><Reveal><div className="version-tabs"><Button tone="secondary" onClick={() => undefined}>v1</Button><Button tone="secondary" onClick={() => undefined}>v2</Button><Button onClick={() => undefined}>v3 {zh ? "（目前版本）" : "(current)"}</Button></div><article className="term-sheet"><h1>{zh ? "條款表" : "TERM SHEET"}</h1><p>{zh ? "非約束性參考條款 · 2026 年 7 月 12 日" : "Non-binding Indicative Terms · 12 Jul 2026"}</p><TermSheetBody language={language} /></article><div className="button-row centered-row"><Button tone="secondary" onClick={() => navigate("builder")}>{zh ? "要求修改" : "Request changes"}</Button><Button onClick={() => navigate("contract")}>{zh ? "接受條款" : "Accept terms"}</Button></div></Reveal><aside className="comments"><h2>{zh ? "留言" : "Comments"}</h2><Comment title={zh ? "收入分成" : "Revenue split"} body={zh ? "聯盟銷售嘅創作者分成可唔可以由 20% 提高到 22%？" : "Can we increase affiliate sales creator share from 20% to 22%?"} time={zh ? "Kaia · 2 小時前" : "Kaia · 2 hours ago"} /><Comment title={zh ? "里程碑時間表" : "Milestone schedule"} body={zh ? "可以將第二個銷售目標嘅到期日改到 8 月 15 日嗎？" : "Can we move Sales Target 2 due date to August 15?"} time={zh ? "Kaia · 2 小時前" : "Kaia · 2 hours ago"} /><textarea placeholder={zh ? "加入留言…" : "Add a comment..."} /></aside></section></>;
}

function TermSheetBody({ language }: { language: Language }) { const zh = language === "zh-Hant"; return <><h2>{zh ? "1. 合作雙方" : "1. Parties"}</h2><div className="party-grid"><div><b>{zh ? "品牌（賣方）" : "Brand (Seller)"}</b><br />Luma Skin Inc.<br />Sarah Chen, {zh ? "行政總裁" : "CEO"}</div><div><b>{zh ? "創作者（合作夥伴）" : "Creator (Partner)"}</b><br />Kaia Chen Media LLC<br />Kaia Chen</div></div><h2>{zh ? "2. 產品線" : "2. Product line"}</h2><p><b>Luma Skin × Serein Collection</b><br />{zh ? "保濕護膚系列，包括潔面、精華及保濕產品。" : "Hydrating skincare line featuring cleanser, serum, and moisturizer."}</p><h2>{zh ? "3. 收入分成" : "3. Revenue split"}</h2><table><thead><tr><th>{zh ? "收入來源" : "Source"}</th><th>{zh ? "創作者分成" : "Creator share"}</th><th>{zh ? "品牌分成" : "Brand share"}</th></tr></thead><tbody><tr><td>{zh ? "聯盟銷售" : "Affiliate sales"}</td><td>20%</td><td>80%</td></tr><tr><td>{zh ? "折扣碼銷售" : "Discount code sales"}</td><td>18%</td><td>82%</td></tr></tbody></table><h2>{zh ? "4. 里程碑時間表" : "4. Milestone schedule"}</h2><table><tbody><tr><td>1</td><td>{zh ? "內容發佈" : "Content launch"}</td><td>NT$100,000</td></tr><tr><td>2</td><td>{zh ? "銷售目標" : "Sales target"}</td><td>NT$50,000</td></tr><tr><td>3</td><td>{zh ? "第二個銷售目標" : "Second sales target"}</td><td>NT$150,000</td></tr></tbody></table><h2>{zh ? "5. 爭議處理" : "5. Dispute resolution"}</h2><p>{zh ? "任何爭議會先經雙方真誠協商；如未能解決，先套用預先協議嘅預設處理結果。" : "Any dispute is resolved through good-faith negotiation before the pre-agreed default outcome applies."}</p></>; }

function Comment({ title, body, time }: { title: string; body: string; time: string }) { return <article className="comment"><b>{title}</b><p>{body}</p><small>{time}</small></article>; }

export function Contract({ language, navigate, signed, onSign }: Core & { signed: boolean; onSign: () => void }) {
  const zh = language === "zh-Hant";
  return <>
    <div className="breadcrumb">{zh ? "合作" : "Deals"} › {dealName} › <b>{zh ? "合約及電子簽署" : "Contract & e-sign"}</b></div>
    <section className="contract-layout">
      <Reveal className="contract-document" distance={22}><article><h1>{zh ? "創作者合作協議" : "Creator Partnership Agreement"}</h1><small>SHA-256: 9f2a…c41d</small><p>{zh ? "本創作者合作協議由 Brightside Brands Ltd 與 Kaia Chen 於 2026 年 7 月 12 日訂立。" : "This Creator Partnership Agreement is entered into between Brightside Brands Ltd and Kaia Chen on 12 July 2026."}</p><h2>{zh ? "1. 合作" : "1. Partnership"}</h2><p>{zh ? "雙方同意按照合作簡報所述，共同創作、推廣及發佈內容。" : "The parties agree to collaborate on the creation, promotion, and distribution of content as described in the Campaign Brief."}</p><h2>{zh ? "2. 交付內容" : "2. Deliverables"}</h2><p>{zh ? "創作者會按指定日期交付合作簡報列明嘅內容及服務。" : "Creator will deliver the content and services set out in the Campaign Brief by the dates specified."}</p><h2>{zh ? "3. 報酬" : "3. Compensation"}</h2><p>{zh ? <>品牌會按照里程碑時間表向創作者支付合共 NT$<CountUp to={128450} separator="," duration={1.4} />.00。</> : <>Brand will pay Creator a total amount of NT$<CountUp to={128450} separator="," duration={1.4} />.00 in accordance with the Milestone Schedule.</>}</p><div className="signature-grid"><div className="signature signed"><b>{zh ? "創作者" : "Creator"}</b><strong>Kaia Chen</strong><small>{zh ? "已於 7 月 12 日 14:02 簽署" : "Signed 12 Jul, 14:02"}</small></div><div className={signed ? "signature signed" : "signature"}><b>{zh ? "品牌" : "Brand"}</b>{signed ? <><strong>Brightside Brands</strong><small>{zh ? "剛剛已簽署" : "Signed just now"}</small></> : <button onClick={onSign}>{zh ? "按此簽署" : "Click to sign"}</button>}</div></div></article></Reveal>
      <aside className="signing-panel">
        <h2>{zh ? "簽署狀態" : "Signing status"}</h2>
        <p>Kaia Chen <Badge tone="green">{zh ? "已簽署" : "Signed"}</Badge></p>
        <p>Brightside Brands {signed ? <Badge tone="green">{zh ? "已簽署" : "Signed"}</Badge> : <Badge tone="amber">{zh ? "待簽署" : "Pending"}</Badge>}</p>
        {!signed ? <Button onClick={onSign}>{zh ? "簽署合約" : "Sign contract"}</Button> : <Button onClick={() => navigate("deal")}>{zh ? "開啟進行中合作" : "Open active deal"}</Button>}
        <Clock>{zh ? "簽署期限：剩餘 11 日" : "Signing window: 11 days left"}</Clock>
        <article className="ai-terms-card">
          <div className="ai-card-heading"><div><span className="eyebrow">{zh ? "Gemini 結算代理人" : "Gemini settlement agent"}</span><h3>{zh ? "AI 已抽取條款" : "Terms extracted by AI"}</h3></div><Badge tone="amber">{zh ? "待你確認" : "Pending review"}</Badge></div>
          <p>{zh ? "由目前合約草稿抽出 4 條結算規則。" : "4 settlement rules extracted from the current agreement."}</p>
          <ul>{settlementRules[language].map((rule) => <li key={rule}>{rule}</li>)}</ul>
          <button type="button" className="text-link" onClick={() => navigate("deal")}>{zh ? "查看 AI Agent 紀錄 →" : "View AI Agent log →"}</button>
        </article>
        <h3>{zh ? "版本紀錄" : "Version history"}</h3>
        <p>{zh ? "v3 · 已建立，所有簽署已重設" : "v3 · created — all signatures reset"}</p>
        <p>{zh ? "v2 · 條款已更新" : "v2 · terms updated"}</p>
      </aside>
    </section>
  </>;
}
function AgentConsole({ language }: { language: Language }) {
  const zh = language === "zh-Hant";
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rulesConfirmed, setRulesConfirmed] = useState(false);
  const events = agentEvents[language];

  return <section className="agent-console" aria-label={zh ? "AI 結算代理人主控台" : "AI settlement agent console"}>
    <div className="agent-console__intro">
      <div>
        <span className="eyebrow">{zh ? "Gemini 結算代理人" : "Gemini settlement agent"}</span>
        <h2>{zh ? "AI 工作紀錄" : "Agent activity"}</h2>
        <p>{zh ? "每一步建議都可以打開查看，並由人手確認後先進入結算流程。" : "Every proposal is reviewable before it can move into settlement."}</p>
      </div>
      <Badge>Gemini · Vertex AI</Badge>
    </div>
    <div className="agent-console__grid">
      <div className="agent-feed">
        <div className="panel-head"><h3>{zh ? "活動時間線" : "Activity feed"}</h3><Badge tone="green">{zh ? "運作中" : "Live"}</Badge></div>
        {events.map((event) => {
          const expanded = expandedId === event.id;
          const detailId = `agent-event-${event.id}`;
          return <article className={expanded ? "agent-event is-expanded" : "agent-event"} key={event.id}>
            <button type="button" className="agent-event__trigger" aria-expanded={expanded} aria-controls={detailId} onClick={() => setExpandedId(expanded ? null : event.id)}>
              <span className={`agent-event__marker agent-event__marker--${event.tone}`} aria-hidden="true">{event.tone === "amber" ? "!" : "✓"}</span>
              <span className="agent-event__copy"><small>{event.time}</small><strong>{event.title}</strong><span>{event.summary}</span></span>
              <span className="agent-event__toggle" aria-hidden="true">{expanded ? "−" : "+"}</span>
            </button>
            <div id={detailId} className="agent-event__details" hidden={!expanded}>
              <dl>
                <div><dt>{zh ? "輸入" : "Input"}</dt><dd>{event.input}</dd></div>
                <div><dt>{zh ? "判斷" : "Reasoning"}</dt><dd>{event.reasoning}</dd></div>
                <div><dt>{zh ? "輸出" : "Output"}</dt><dd>{event.output}</dd></div>
              </dl>
              <span className="agent-verified"><span aria-hidden="true">✓</span>{zh ? "已對照 domain math 驗證" : "Verified against domain math"}</span>
            </div>
          </article>;
        })}
      </div>
      <aside className="agent-review-card">
        <div className="agent-review-card__head"><div><span className="eyebrow">{zh ? "待你確認" : "Pending review"}</span><h3>{zh ? "抽出嘅結算規則" : "Extracted settlement rules"}</h3></div><Badge tone={rulesConfirmed ? "green" : "amber"}>{rulesConfirmed ? (zh ? "已確認" : "Confirmed") : (zh ? "待確認" : "Needs review")}</Badge></div>
        <p>{zh ? "Gemini 從已簽署合約整理出以下規則，確認一次後先可以供對賬使用。" : "Gemini read the signed contract and prepared these rules for one-time human confirmation."}</p>
        <ul>{settlementRules[language].map((rule) => <li key={rule}>{rule}</li>)}</ul>
        {rulesConfirmed ? <div className="success-notice" role="status" aria-live="polite">{zh ? "規則已確認，之後嘅對賬會以呢份版本為準。" : "Rules confirmed. Future reconciliations will use this version."}</div> : <Button onClick={() => setRulesConfirmed(true)}>{zh ? "確認結算規則" : "Confirm settlement rules"}</Button>}
        <small className="agent-audit-note">{zh ? "確認動作會寫入合作事件紀錄。" : "The confirmation is written to the deal event log."}</small>
      </aside>
    </div>
  </section>;
}

type DealTab = "overview" | "agent";

export function Deal({ language, navigate, approved, reportSent, disputeResolved }: Core & { approved: boolean; reportSent: boolean; disputeResolved: boolean }) {
  const zh = language === "zh-Hant";
  const [activeTab, setActiveTab] = useState<DealTab>("overview");
  return <>
    <button className="back-link" onClick={() => navigate("dashboard")}>← {zh ? "返回合作列表" : "Back to deals"}</button>
    <AnimatedContent distance={18} duration={0.5}><section className="deal-header"><div><h1>{dealName} <Badge>{zh ? "進行中" : "ACTIVE"}</Badge></h1><p>Brightside, Luma Skin, Handsel</p></div><div><b>{zh ? "下一步：" : "Next: "}{approved ? (zh ? "銷售報告到期" : "Sales report due") : (zh ? "品牌批准里程碑 2" : "Brand approves Milestone 2")}</b><Clock urgent>{approved ? (zh ? "7 日寬限期" : "7-day grace") : (zh ? "4 日後自動批准" : "Auto-approve in 4 days")}</Clock></div></section></AnimatedContent>
    <div className="deal-tabs">
      <button className={activeTab === "overview" ? "is-tab-active" : ""} onClick={() => setActiveTab("overview")}>{zh ? "概覽" : "Overview"}</button>
      <button onClick={() => navigate("milestone")}>{zh ? "里程碑" : "Milestones"}</button>
      <button onClick={() => navigate("sales")}>{zh ? "銷售報告" : "Sales reports"}</button>
      <button onClick={() => navigate("payouts")}>{zh ? "收款" : "Payouts"}</button>
      <button onClick={() => navigate("dispute")}>{zh ? "爭議" : "Dispute"}</button>
      <button className={activeTab === "agent" ? "is-tab-active" : ""} onClick={() => setActiveTab("agent")}>{zh ? "AI Agent" : "AI Agent"}</button>
    </div>
    {activeTab === "agent" ? <AgentConsole language={language} /> : <section className="deal-overview"><div className="activity-panel"><h2>{zh ? "活動時間線" : "Activity timeline"}</h2>{activity[language].map(([date, title, body], index) => <Reveal key={title} delay={index * 0.06}><article className="activity"><i>✓</i><div><small>{date}</small><h3>{title}</h3><p>{body}</p></div></article></Reveal>)}</div><div className="metric-grid"><Reveal delay={0}><Metric label={zh ? "已支付總額" : "Total paid out"} value={<>NT$<CountUp to={120000} separator="," duration={1.2} /></>} note={zh ? "合約總值嘅 50%" : "50% of total contract value"} /></Reveal><Reveal delay={0.06}><Metric label={zh ? "下一個里程碑" : "Next milestone"} value={<>NT$<CountUp to={approved ? 0 : 60000} separator="," duration={1.2} /></>} note={approved ? (zh ? "已批准" : "Approved") : (zh ? "款項已保留" : "Funds held")} /></Reveal><Reveal delay={0.12}><Metric label={zh ? "收入分成" : "Revenue share"} value={<><CountUp to={18} duration={1} />%</>} note={zh ? "淨銷售額" : "of net sales"} /></Reveal><Reveal delay={0.18}><Metric label={zh ? "準時報告" : "Reports on time"} value={reportSent ? "4 / 4" : "3 / 3"} note={disputeResolved ? (zh ? "爭議已解決" : "Dispute resolved") : (zh ? "100% 準時" : "100% on time")} /></Reveal></div></section>}
  </>;
}

function Metric({ label, value, note }: { label: string; value: ReactNode; note: string }) { return <article className="metric"><span>{label}</span><b>{value}</b><small>{note}</small></article>; }

export function Milestone({ language, navigate, approved, onApprove }: Core & { approved: boolean; onApprove: () => void }) { const zh = language === "zh-Hant"; const items = zh ? ["首批生產已完成", "品質檢查報告", "最終產品相片"] : ["Production run completed", "Quality inspection report", "Final product photos"]; return <section className="drawer-view"><AnimatedContent distance={20} duration={0.55}><div className="drawer-heading"><div><span className="eyebrow">{zh ? "里程碑 2" : "Milestone 2"}</span><h1>{zh ? "首批產品已完成交付" : "First production run delivered"}</h1><p>NT$<CountUp to={60000} separator="," duration={1.2} /> · {zh ? "7 月 28 日到期" : "Due 28 Jul"}</p></div><button onClick={() => navigate("deal")} aria-label={zh ? "關閉" : "Close"}>×</button></div></AnimatedContent><div className="funding-strip"><span>✓ {zh ? "預付款已扣款" : "Prefund charged"}</span><span>→</span><span>✓ {zh ? "款項已保留" : "Funds held"}</span><span>→</span><span>{approved ? (zh ? "✓ 款項已發放" : "✓ Released") : (zh ? "3 批准後發放" : "3 Release on approval")}</span></div><div className="drawer-columns"><article><h2>{zh ? "交付項目" : "Deliverables"}</h2>{items.map((item, index) => <p className={index < 2 ? "check-row done" : "check-row"} key={item}>{index < 2 ? "✓" : "○"} <span><b>{item}</b><small>{index < 2 ? (zh ? "證明已提交" : "Evidence submitted") : (zh ? "上載最終證明" : "Upload final proof")}</small></span></p>)}<h2>{zh ? "證明文件" : "Evidence"}</h2><div className="file-row">{zh ? "首批生產相片.jpg" : "Production run photo.jpg"} <small>JPG · 2.4 MB</small></div><div className="file-row">{zh ? "品質檢查報告.pdf" : "QA report.pdf"} <small>PDF · 1.1 MB</small></div></article><aside className="review-panel"><h2>{zh ? "以品牌身份審核" : "Review as brand"}</h2><p>{zh ? "審核交付證明，批准後款項會發放。" : "Review the evidence and approve to release funds."}</p><Clock>{zh ? "4 日後自動批准" : "Auto-approves in 4 days"}</Clock><label>{zh ? "原因（選填）" : "Reason (optional)"}<textarea placeholder={zh ? "加入給創作者嘅備註" : "Add a note for the creator"} /></label>{approved ? <div className="success-notice">{zh ? "里程碑已批准，款項正發放畀創作者。" : "Milestone approved. Funds are releasing to the creator."}</div> : <><Button onClick={onApprove}>{zh ? "批准里程碑" : "Approve milestone"}</Button><Button tone="secondary" onClick={() => navigate("deal")}>{zh ? "要求修改" : "Request changes"}</Button></>}</aside></div></section>;
}

export function Sales({ language, navigate, submitted, onSubmit }: Core & { submitted: boolean; onSubmit: () => void }) {
  const zh = language === "zh-Hant";
  const reconciliation = reconciliationResult[language];
  const rows = [[zh ? "2026 年 6 月" : "Jun 2026", "NT$152,999", "NT$27,540", "on-time"], [zh ? "2026 年 5 月" : "May 2026", "NT$138,500", "NT$24,930", "on-time"], [zh ? "2026 年 4 月" : "Apr 2026", "NT$121,200", "NT$21,816", "on-time"], [zh ? "2026 年 7 月" : "Jul 2026", submitted ? "NT$153,000" : "—", submitted ? "NT$27,540" : "—", submitted ? "submitted" : "late"]];
  return <section className="sales-layout">
    <Reveal className="sales-form" distance={18}><h1>{zh ? "2026 年 7 月報告" : "July 2026 report"} <Badge>{zh ? "品牌檢視" : "Brand view"}</Badge></h1>
      <Clock>{zh ? "8 月 7 日前提交（7 日寬限期）" : "Due by 7 Aug (7-day grace)"}</Clock>
      <article className="ai-reconciliation-card" aria-label={zh ? "AI 對賬結果" : "AI reconciliation result"}>
        <div className="ai-card-heading"><div><span className="eyebrow">{zh ? "Gemini 對賬代理人" : "Gemini agent"}</span><h2>{zh ? "AI 對賬結果" : "AI reconciliation"}</h2></div><Badge tone="amber">{zh ? "發現差異" : "Flagged"}</Badge></div>
        <div className="reconciliation-stats"><div><strong>3/4</strong><span>{reconciliation.matched}</span></div><div><strong>1</strong><span>{zh ? "項目待審核" : "item for review"}</span></div></div>
        <p><Badge tone="amber">{zh ? "需要確認" : "Review needed"}</Badge> {reconciliation.issue}</p>
        <div className="ai-verified-line"><span aria-hidden="true">✓</span>{reconciliation.verified}</div>
        <button type="button" className="text-link" onClick={() => navigate("deal")}>{zh ? "查看 Agent 紀錄 →" : "View agent log →"}</button>
      </article>
      <label>{zh ? "售出數量" : "Units sold"}<input placeholder={zh ? "輸入售出數量" : "Enter units sold"} /></label>
      <label>{zh ? "總收入（TWD）" : "Gross revenue (TWD)"}<input placeholder={zh ? "輸入金額" : "Enter amount"} /></label>
      <label>{zh ? "證明文件（選填）" : "Evidence (optional)"}<input type="file" /></label>
      <div className="share-card"><span>{zh ? "創作者分成（18%）" : "Creator share (18%)"}</span><b>NT$<CountUp to={27540} separator="," duration={1.3} /></b><small>{zh ? "提交時計算，並從已儲存嘅卡扣款。" : "Calculated on submission, charged to your saved card."}</small></div>
      {submitted ? <div className="success-notice">{zh ? "報告已提交，創作者而家可以確認或標示差異。" : "Report submitted — creator can now acknowledge or flag a discrepancy."}</div> : <Button onClick={onSubmit}>{zh ? "提交報告" : "Submit report"}</Button>}
    </Reveal>
    <article className="history"><h2>{zh ? "報告紀錄" : "Report history"}</h2>{rows.map(([month, revenue, share, status], index) => <Reveal key={month} delay={index * 0.05}><button className="history-row" onClick={() => status === "late" && navigate("dispute")}><b>{month}</b><span>{revenue}</span><span>{share}</span><Badge tone={status === "late" ? "amber" : "green"}>{status === "late" ? (zh ? "逾期" : "Late") : status === "submitted" ? (zh ? "已提交" : "Submitted") : (zh ? "準時" : "On time")}</Badge></button></Reveal>)}<button className="alert-row" onClick={() => navigate("dispute")}>{zh ? "連續兩次遲交報告會自動開啟爭議。標示差異 →" : "Two consecutive late reports open a dispute automatically. Flag discrepancy →"}</button></article>
  </section>;
}

export function Payouts({ language, retried, onRetry }: Core & { retried: boolean; onRetry: () => void }) {
  const zh = language === "zh-Hant";
  const [retryRequested, setRetryRequested] = useState(retried);
  const hasRetried = retried || retryRequested;
  const retry = () => { setRetryRequested(true); onRetry(); };
  const rows: ReadonlyArray<readonly [string, string, number, string]> = [
    [zh ? "里程碑 1" : "Milestone 1", zh ? "2026 年 6 月 20 日" : "20 Jun 2026", 64225, "settled"],
    [zh ? "7 月收入分成" : "July rev-share", zh ? "2026 年 7 月 2 日" : "2 Jul 2026", 18720, "settled"],
    [zh ? "里程碑 2" : "Milestone 2", zh ? "2026 年 7 月 14 日" : "14 Jul 2026", 57300, "processing"],
    [zh ? "里程碑 3（預付款）" : "Milestone 3 (prefund)", zh ? "2026 年 8 月 14 日" : "14 Aug 2026", 37500, hasRetried ? "retry" : "failed"]
  ];
  return <><Intro eyebrow="Stripe Connect" title={zh ? "收款" : "Payouts"} body={zh ? "追蹤每筆收款及款項活動。" : "Track your payouts and payment activity."} /><section className="stripe-panel"><b>stripe</b><div><h2>Stripe Connect</h2><p>{zh ? "帳戶已連接，可以接收款項。" : "Your account is connected and ready to receive payouts."}</p></div><Badge tone="green">{zh ? "收款功能已啟用" : "Payouts enabled"} ✓</Badge></section><section className="payout-layout"><article className="ledger"><div className="ledger-heading"><h2>{zh ? "收款紀錄" : "Payout ledger"}</h2><span>{zh ? "每個款項事件都有紀錄。" : "Every money event is recorded."}</span></div>{!hasRetried && <div className="failed-operation" role="status" aria-live="polite"><div><Badge tone="red">{zh ? "操作失敗" : "Failed operation"}</Badge><b>{zh ? "未能收取里程碑 3 預付款。" : "Milestone 3 prefund could not be charged."}</b><p>{zh ? "重試扣款，確保收款時間表繼續運作。" : "Retry the charge to keep the payout schedule moving."}</p></div><button type="button" className="btn btn--primary" data-testid="retry-payout" onClick={retry}>{zh ? "重試" : "Retry"}</button></div>}{hasRetried && <div className="success-notice" role="status" aria-live="polite">{zh ? "已安排重試。品牌已收到通知，收款狀態亦會保留喺審計紀錄。" : "Retry scheduled. The brand has been notified and the payout remains visible in the audit trail."}</div>}{rows.map(([source, date, amount, status], index) => <Reveal key={source} delay={index * 0.06}><div className="ledger-row"><span><b>{source}</b><small>{dealName}</small></span><span>{date}</span><b>NT$<CountUp to={amount} separator="," duration={1.2} />.00</b><Badge tone={status === "failed" ? "red" : status === "settled" ? "green" : "blue"}>{status === "failed" ? (zh ? "失敗" : "Failed") : status === "settled" ? (zh ? "已結算" : "Settled") : status === "processing" ? (zh ? "處理中" : "Processing") : (zh ? "已安排重試" : "Retry scheduled")}</Badge></div></Reveal>)}</article><aside className="upcoming"><h2>{zh ? "即將扣取嘅預付款" : "Upcoming prefunds"}</h2><p>{zh ? "里程碑 3" : "Milestone 3"} · NT$37,500</p><p>{zh ? "2026 年 8 月 14 日扣款" : "Charge on 14 Aug 2026"}</p><p>{zh ? "里程碑 4" : "Milestone 4"} · NT$57,300</p></aside></section></>;
}

export function Dispute({ language, navigate, resolved, onResolve }: Core & { resolved: boolean; onResolve: () => void }) { const zh = language === "zh-Hant"; return <><button className="back-link" onClick={() => navigate("deal")}>← {zh ? "返回合作" : "Back to deal"}</button><section className="dispute-header"><div><h1>{dealName} <Badge tone={resolved ? "green" : "red"}>{resolved ? (zh ? "已解決" : "RESOLVED") : (zh ? "爭議中" : "DISPUTED")}</Badge></h1><p>{zh ? `爭議處理期間，里程碑 3 款項${resolved ? "已解除凍結" : "會被凍結"}。` : `Milestone 3 payout is ${resolved ? "unfrozen" : "frozen"} while this dispute is open.`}</p></div><Clock urgent>{resolved ? (zh ? "結果已記錄" : "Outcome recorded") : (zh ? "協商期限：剩餘 8 日" : "Negotiation window: 8 days left")}</Clock></section>{!resolved ? <div className="dispute-layout"><article className="dispute-thread"><Reveal><DisputePost role={zh ? "品牌" : "Brand"} title={zh ? "交付數量少咗 200 件" : "Delivered quantity short by 200 units"} body={zh ? "我哋嘅品質檢查顯示收到 800 件，但合約列明 1,000 件。" : "Our QA count shows 800 units received vs 1,000 units in the contract."} brand /></Reveal><Reveal delay={0.08}><DisputePost role={zh ? "創作者" : "Creator"} title={zh ? "不同意數量不足，貨件已完整送出" : "Dispute the shortfall — shipment was complete"} body={zh ? "已按合約交付全部 1,000 件，承運商紀錄同包裝相片可以證明。" : "Fulfilled the full 1,000 units as per contract. Carrier logs and packing photos confirm."} /></Reveal><label>{zh ? "加入回應" : "Add your response"}<textarea placeholder={zh ? "解釋你嘅立場、提供詳情同下一步…" : "Explain your position, provide details and next steps…"} /></label><Button onClick={onResolve}>{zh ? "提出解決方案" : "Propose resolution"}</Button></article><aside className="default-outcome"><span>{zh ? "預先協議嘅預設結果" : "Pre-agreed default outcome"}</span><p>{zh ? "如 8 月 20 日前未解決，合約會執行：" : "If unresolved by 20 Aug, contract executes:"}</p><b>{zh ? "按實際交付比例分配" : "split by delivered proportion"}</b><Button tone="secondary" onClick={onResolve}>{zh ? "雙方接受方案" : "Mutually accept proposal"}</Button></aside></div> : <div className="resolution-card"><Badge tone="green">{zh ? "解決方案已接受" : "Resolution accepted"}</Badge><h2>{zh ? "款項會按實際交付比例分配。" : "Payout will be split by delivered proportion."}</h2><p>{zh ? "雙方已接受方案，款項已解除凍結，審計事件亦已記錄。" : "Both parties accepted the proposal. Funds have been unfrozen and an audit event was recorded."}</p><Button onClick={() => navigate("deal")}>{zh ? "返回合作" : "Return to deal"}</Button></div>}</>;
}

function DisputePost({ role, title, body, brand = false }: { role: string; title: string; body: string; brand?: boolean }) { return <article className="dispute-post"><Badge tone={brand ? "red" : "blue"}>{role}</Badge><h3>{title}</h3><p>{body}</p><div className="file-row">QA_report_shortfall.pdf <small>PDF · 1.2 MB</small></div></article>; }

export function TrackRecord({ language, navigate, publicDeal }: Core & { publicDeal: boolean }) { const zh = language === "zh-Hant"; return <><div className="public-header"><Logo /><Button onClick={() => navigate("dashboard")}>{zh ? "開啟工作區" : "Open workspace"}</Button></div><AnimatedContent distance={20} duration={0.55}><section className="track-profile"><img className="avatar avatar--large" src="/assets/kaia-chen.png" alt="Kaia Chen" /><div><h1>Kaia Chen <Badge>{zh ? "護膚" : "Skincare"}</Badge></h1><p>{zh ? "96.2K 位追蹤者 · Handsel 已驗證合作履歷" : "96.2K followers · Verified deal history on Handsel"}</p></div></section></AnimatedContent><div className="public-deals">{publicDeal ? [[dealName, "completed", "6/6" , 5.0], ["Halo Hair × Nova Beauty", "completed", "5/5", 5.0], ["Sunrae Skincare × Launch", "active", "3/5", 4.8]].map(([name, state, progress, rating], index) => <Reveal key={name} delay={index * 0.08}><SpotlightCard><article className="public-deal"><h2>{name} <Badge tone={state === "completed" ? "green" : "blue"}>{state === "completed" ? (zh ? "已完成" : "COMPLETED") : (zh ? "進行中" : "ACTIVE")}</Badge></h2><p>Kaia Chen ({zh ? "創作者" : "Creator"}) ↔ Brightside ({zh ? "品牌" : "Brand"})</p><p>✓ {progress} {zh ? "個里程碑已完成" : "milestones completed"}</p><footer>{zh ? "雙方評分" : "Mutual rating"} ★★★★★ <CountUp to={rating as number} duration={1.1} /></footer></article></SpotlightCard></Reveal>) : <div className="empty-state">{zh ? "呢位創作者未有公開合作紀錄。" : "This creator has not shared public deal records."}</div>}</div><p className="privacy-note">{zh ? "財務條款永遠唔會公開。" : "Financial terms are never public."}</p></>;
}

export function Settings({ language, setLanguage, publicDeal, setPublicDeal }: Core & { publicDeal: boolean; setPublicDeal: Dispatch<SetStateAction<boolean>> }) { const zh = language === "zh-Hant"; return <><Intro eyebrow={zh ? "帳戶" : "Account"} title={zh ? "設定" : "Settings"} body={zh ? "管理帳戶偏好及應用程式設定。" : "Manage your account preferences and app settings."} /><AnimatedContent distance={16} duration={0.45}><section className="settings-grid"><aside className="settings-menu"><button>{zh ? "個人資料" : "Profile"}</button><button onClick={() => setLanguage(language === "en" ? "zh-Hant" : "en")}>{zh ? "語言" : "Language"}</button><button className="is-active">{zh ? "付款" : "Payments"}</button><button>{zh ? "合作公開設定" : "Deal visibility"}</button><button>{zh ? "通知" : "Notifications"}</button></aside><div><article className="settings-panel"><h2>{zh ? "付款" : "Payments"}</h2><div className="stripe-panel"><b>stripe</b><div><strong>{zh ? "Stripe 帳戶" : "Stripe account"}</strong><p>handsel-inc@company.com</p></div><Badge tone="green">{zh ? "收款功能已啟用" : "Payouts enabled"} ✓</Badge></div></article><article className="settings-panel"><h2>{zh ? "合作公開設定" : "Deal visibility"}</h2><p>{zh ? "選擇邊啲合作會顯示喺公開履歷。" : "Choose which deals are visible on your public track record."}</p><div className="visibility-row"><span>{dealName} <Badge tone="green">{zh ? "已完成" : "Completed"}</Badge></span><button className={publicDeal ? "switch is-on" : "switch"} onClick={() => setPublicDeal(!publicDeal)} aria-label={zh ? "切換公開合作顯示" : "Toggle public deal visibility"}><i /></button></div><div className="visibility-row"><span>BrandCo × Urban Goods <Badge tone="amber">{zh ? "進行中" : "In progress"}</Badge></span><button className="switch" aria-label={zh ? "切換合作顯示" : "Toggle deal visibility"}><i /></button></div></article></div></section></AnimatedContent></>;
}

export function Admin({ language, navigate, retried, onRetry }: Core & { retried: boolean; onRetry: () => void }) {
  const zh = language === "zh-Hant";
  const operations: ReadonlyArray<readonly [string, string, string, string]> = [
    ["Prefund charge", dealName, "StripeChargeDeclined", "2h"],
    ["Transfer", "Luma Skin × Serein", "BankTransferFailed", "2h"],
    ["Prefund charge", "Halo Hair × Nova Beauty", retried ? "RetryScheduled" : "StripeChargeDeclined", "3h"],
    ["Transfer", "June rev-share", "AccountClosed", "5h"],
  ];
  return <div className="admin"><header className="admin-top"><Logo inverse /><b>Handsel Ops</b><input placeholder={zh ? "搜尋操作、合作或客戶…" : "Search by operation, deal, customer…"} /><Button tone="secondary" onClick={() => navigate("dashboard")}>{zh ? "返回應用程式" : "Back to app"}</Button></header><div className="admin-layout"><aside><button className="is-active">{zh ? "失敗操作" : "Failed operations"} <Badge tone="red"><CountUp to={27} duration={0.9} /></Badge></button><button>{zh ? "爭議" : "Disputes"} <Badge><CountUp to={8} duration={0.9} /></Badge></button><button>{zh ? "審計紀錄" : "Audit log"}</button><button>{zh ? "警示" : "Alerts"} <Badge><CountUp to={12} duration={0.9} /></Badge></button></aside><main><Intro eyebrow={zh ? "營運安全網" : "Ops safety net"} title={zh ? "失敗操作" : "Failed operations"} body={zh ? "以下操作失敗並需要處理。" : "Operations that failed and require attention."} /><section className="ops-table">{operations.map(([operation, deal, failure, age], index) => <Reveal key={operation + deal} delay={index * 0.05}><div className="ops-row"><span><b>{zh ? (operation === "Prefund charge" ? "預付款扣款" : "轉帳") : operation}</b><small>{deal}</small></span><Badge tone="red">{failure}</Badge><span>{zh ? age.replace("h", " 小時") : age}</span>{failure === "StripeChargeDeclined" ? <Button onClick={onRetry}>{zh ? "重試" : "Retry"}</Button> : <Badge tone="green">{zh ? "已記錄" : "Logged"}</Badge>}</div></Reveal>)}</section></main><aside className="alerts"><h2>{zh ? "警示動態" : "Alerts feed"}</h2><p>✓ {zh ? "對帳差異已修復" : "Reconciliation mismatch repaired"}</p><p>● {zh ? "偵測到 Webhook 缺漏，已重新執行" : "Webhook gap detected — replayed"}</p><p>! {zh ? "偵測到高失敗率" : "High failure rate detected"}</p><p>✓ {zh ? "銀行帳戶已重新驗證" : "Bank account re-verified"}</p></aside></div></div>;
}
