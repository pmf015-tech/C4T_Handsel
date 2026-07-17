export type Language = "en" | "zh-Hant";

export type Screen =
  | "landing"
  | "onboarding"
  | "dashboard"
  | "builder"
  | "term"
  | "contract"
  | "deal"
  | "milestone"
  | "sales"
  | "payouts"
  | "dispute"
  | "track"
  | "settings"
  | "admin";

export type Role = "creator" | "brand";

export const dealName = "Glow Ritual × Brightside";

export const words = {
  en: {
    dashboard: "Dashboard", deals: "Deals", payouts: "Payouts", profile: "Track record", settings: "Settings", admin: "Ops admin",
    back: "Back", continue: "Continue", saveDraft: "Save draft", active: "Active", completed: "Completed", inReview: "In review",
    sign: "Sign contract", approve: "Approve milestone", request: "Request changes", submit: "Submit report", retry: "Retry", openDispute: "Open dispute",
    creator: "Creator", brand: "Brand", demo: "Book a demo", demoTitle: "See how Handsel makes every promise verifiable.", demoBody: "Tell us a little about your partnership and our team will walk you through the presale prototype.", demoSent: "Thanks — we’ll be in touch shortly.",
  },
  "zh-Hant": {
    dashboard: "主控台", deals: "合作", payouts: "收款", profile: "履歷紀錄", settings: "設定", admin: "營運管理",
    back: "返回", continue: "繼續", saveDraft: "儲存草稿", active: "進行中", completed: "已完成", inReview: "審核中",
    sign: "簽署合約", approve: "批准里程碑", request: "要求修改", submit: "提交報告", retry: "重試", openDispute: "開啟爭議",
    creator: "創作者", brand: "品牌", demo: "預約產品示範", demoTitle: "了解 Handsel 如何令每個承諾都可驗證。", demoBody: "告訴我哋少少你嘅合作需要，我哋會帶你睇預售版原型。", demoSent: "多謝你，我哋好快會聯絡你。",
  },
} as const;

export const builderSteps = ["Parties & product", "Creator & deliverables", "Commercial terms", "Dispute terms"];

export const activity = {
  en: [
    ["12 Jul, 14:02", "Contract signed", "Both parties signed the current agreement."],
    ["20 Jul, 09:40", "Milestone 1 released", "NT$60,000 released after approval."],
    ["28 Jul, 11:02", "Sales report submitted", "Brightside submitted the July report."],
    ["01 Aug, 09:41", "Milestone 2 delivered", "Waiting for the brand to review evidence."],
  ],
  "zh-Hant": [
    ["7 月 12 日 14:02", "合約已簽署", "雙方已簽署目前版本嘅協議。"],
    ["7 月 20 日 09:40", "里程碑 1 款項已發放", "批准後已發放 NT$60,000。"],
    ["7 月 28 日 11:02", "銷售報告已提交", "Brightside 已提交 7 月銷售報告。"],
    ["8 月 1 日 09:41", "里程碑 2 已交付", "等待品牌審核交付證明。"],
  ],
} as const;

export type AgentEventTone = "blue" | "green" | "amber";

export type AgentEvent = {
  readonly id: string;
  readonly time: string;
  readonly title: string;
  readonly summary: string;
  readonly input: string;
  readonly reasoning: string;
  readonly output: string;
  readonly tone: AgentEventTone;
};

export const agentEvents = {
  en: [
    {
      id: "contract-parsed",
      time: "12 Jul, 14:04",
      title: "Contract parsed → 4 settlement rules extracted",
      summary: "Signed agreement converted into reviewable rules.",
      input: "Creator Partnership Agreement v3",
      reasoning: "Gemini identified revenue share, deadlines, grace period, and payout triggers.",
      output: "4 rules ready for one-time human confirmation.",
      tone: "blue",
    },
    {
      id: "csv-reconciled",
      time: "01 Aug, 09:42",
      title: "July CSV reconciled → 1 discrepancy flagged",
      summary: "Reported revenue needs a quick human review.",
      input: "July sales report CSV · 14 rows",
      reasoning: "The reported total differs from the signed rule calculation by NT$1,260.",
      output: "Flagged for review; no payout action taken.",
      tone: "amber",
    },
    {
      id: "statement-generated",
      time: "01 Aug, 09:43",
      title: "Statement #007 generated",
      summary: "Draft statement is ready after reconciliation.",
      input: "Verified settlement rules + July CSV",
      reasoning: "The draft uses the deterministic revenue-share calculation as its source of truth.",
      output: "Statement #007 · payable amount pending review.",
      tone: "green",
    },
  ],
  "zh-Hant": [
    {
      id: "contract-parsed",
      time: "7 月 12 日 14:04",
      title: "合約已解析 → 抽出 4 條結算規則",
      summary: "已將簽署協議轉成可以審核嘅規則。",
      input: "創作者合作協議 v3",
      reasoning: "Gemini 識別收入分成、期限、寬限期同款項發放條件。",
      output: "4 條規則已準備好，等待人手一次確認。",
      tone: "blue",
    },
    {
      id: "csv-reconciled",
      time: "8 月 1 日 09:42",
      title: "7 月 CSV 已對賬 → 發現 1 項差異",
      summary: "報告入面嘅收入需要人手快速檢查。",
      input: "7 月銷售報告 CSV · 14 行",
      reasoning: "報告總額同已簽署規則計算結果相差 NT$1,260。",
      output: "已標示待審核，未有觸發任何款項操作。",
      tone: "amber",
    },
    {
      id: "statement-generated",
      time: "8 月 1 日 09:43",
      title: "結算單 #007 已生成",
      summary: "對賬完成後，草稿結算單已準備好。",
      input: "已驗證結算規則 + 7 月 CSV",
      reasoning: "草稿以 deterministic revenue-share 計算作為唯一數學來源。",
      output: "結算單 #007 · 應付金額等待審核。",
      tone: "green",
    },
  ],
} as const satisfies Record<Language, readonly AgentEvent[]>;

export const settlementRules = {
  en: [
    "18% creator share on net sales",
    "Monthly report due 7 Aug with a 7-day grace period",
    "Milestone 2 releases NT$57,300 after approval",
    "Generate a statement before any payout action",
  ],
  "zh-Hant": [
    "淨銷售額嘅創作者分成為 18%",
    "每月報告 8 月 7 日到期，設有 7 日寬限期",
    "里程碑 2 批准後發放 NT$57,300",
    "任何款項操作前先生成結算單",
  ],
} as const;

export const reconciliationResult = {
  en: {
    matched: "3 of 4 fields matched",
    issue: "CSV row 14 differs by NT$1,260 from the signed rule calculation.",
    verified: "Verified against domain math",
  },
  "zh-Hant": {
    matched: "4 個欄位有 3 個吻合",
    issue: "CSV 第 14 行同規則計算相差 NT$1,260。",
    verified: "已對照 domain math 驗證",
  },
} as const;
