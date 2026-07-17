import type { Dispatch, SetStateAction, ReactNode } from "react";
import type { Language, Role, Screen } from "./prototype-data";
import { words } from "./prototype-data";

type Navigate = (screen: Screen) => void;

export function Logo({ inverse = false }: { inverse?: boolean }) {
  return <img className={inverse ? "logo logo--inverse" : "logo"} src="/handsel-logo.png" alt="Handsel" />;
}

export function Button({ children, onClick, tone = "primary", disabled = false }: { children: ReactNode; onClick: () => void; tone?: "primary" | "secondary" | "danger"; disabled?: boolean }) {
  return <button className={`btn btn--${tone}`} onClick={onClick} disabled={disabled}>{children}</button>;
}

export function Badge({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "green" | "amber" | "red" | "gray" }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

export function Clock({ children, urgent = false }: { children: ReactNode; urgent?: boolean }) {
  return <span className={urgent ? "clock clock--urgent" : "clock"}>◷ {children}</span>;
}

type DemoModalProps = {
  language: Language;
  open: boolean;
  submitted: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  setSubmitted: Dispatch<SetStateAction<boolean>>;
};

export function DemoModal({ language, open, submitted, setOpen, setSubmitted }: DemoModalProps) {
  if (!open) return null;
  const w = words[language];
  const close = () => { setOpen(false); setSubmitted(false); };
  return <div className="modal-backdrop" onMouseDown={close}><section className="demo-modal" role="dialog" aria-modal="true" aria-labelledby="demo-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" aria-label={language === "zh-Hant" ? "關閉" : "Close"} onClick={close}>×</button>{submitted ? <div className="demo-success"><span className="success-mark">✓</span><h2>{w.demoSent}</h2><p>{language === "zh-Hant" ? "Handsel 團隊會根據你嘅合作情況準備示範內容。" : "The Handsel team will prepare a walkthrough around your partnership."}</p><Button onClick={close}>{language === "zh-Hant" ? "完成" : "Done"}</Button></div> : <form onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}><span className="eyebrow">{language === "zh-Hant" ? "預售版預覽" : "PRESALE PREVIEW"}</span><h2 id="demo-title">{w.demoTitle}</h2><p>{w.demoBody}</p><label>{language === "zh-Hant" ? "姓名" : "Name"}<input required autoFocus /></label><label>{language === "zh-Hant" ? "工作電郵" : "Work email"}<input type="email" required /></label><label>{language === "zh-Hant" ? "你係" : "I’m a"}<select defaultValue="creator"><option value="creator">{w.creator}</option><option value="brand">{w.brand}</option></select></label><button className="btn btn--primary" type="submit">{w.demo} →</button><small>{language === "zh-Hant" ? "Handsel 係 C4T Center For Transformation 旗下產品。" : "Handsel is a product under C4T Center For Transformation."}</small></form>}</section></div>;
}

export function AppHeader({ language, setLanguage, role }: { language: Language; setLanguage: Dispatch<SetStateAction<Language>>; role: Role }) {
  const w = words[language];
  return <header className="app-header"><Logo /><div className="app-header__right"><div className="language-toggle"><button className={language === "zh-Hant" ? "is-current" : ""} onClick={() => setLanguage("zh-Hant")}>中</button><span>/</span><button className={language === "en" ? "is-current" : ""} onClick={() => setLanguage("en")}>EN</button></div><span className="role-chip">{role === "creator" ? w.creator : w.brand}</span><img className="avatar avatar--small" src="/assets/kaia-chen.png" alt="Kaia Chen" /></div></header>;
}

export function Sidebar({ screen, navigate, language }: { screen: Screen; navigate: Navigate; language: Language }) {
  const w = words[language];
  const items: Array<[Screen, string]> = [["dashboard", w.dashboard], ["deal", w.deals], ["payouts", w.payouts], ["track", w.profile], ["settings", w.settings]];
  return <aside className="sidebar"><nav>{items.map(([target, label]) => <button className={screen === target ? "nav-link is-active" : "nav-link"} key={target} onClick={() => navigate(target)}>{label}</button>)}</nav><div className="security-card">{language === "zh-Hant" ? <>企業級<br />安全及合規</> : <>Enterprise-grade<br />security & compliance</>}</div></aside>;
}

export function AppShell({ children, screen, navigate, language, setLanguage, role }: { children: ReactNode; screen: Screen; navigate: Navigate; language: Language; setLanguage: Dispatch<SetStateAction<Language>>; role: Role }) {
  return <div className="prototype"><AppHeader language={language} setLanguage={setLanguage} role={role} /><div className="app-layout"><Sidebar screen={screen} navigate={navigate} language={language} /><main className="app-main">{children}</main></div></div>;
}
