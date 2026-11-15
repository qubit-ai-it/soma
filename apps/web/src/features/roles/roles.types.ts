export const ROLES = ["astronaut", "cmo", "commander", "earth"] as const;
export type Role = (typeof ROLES)[number];

export const LEVELS = ["F0", "F1", "F2", "F3", "NOT_EVALUABLE"] as const;
export type Level = (typeof LEVELS)[number];

export const RESOURCES = [
  "clinical_detail",
  "operational_summary",
  "f3_notification",
  "alert_list",
  "alert_acknowledge",
  "alert_close",
  "audit_log",
  "earth_console",
  "plan_review",
] as const;
export type Resource = (typeof RESOURCES)[number];

export type AccessContext = {
  level?: Level;
  ownData?: boolean;
};

export type F3Notification = {
  status: "F3";
  action: string;
  subjectRef: string;
  issuedAt: string;
};

export type OperationalAvailability = "available" | "limited" | "unavailable" | "unknown";

export type OperationalSummary = {
  total: number;
  availability: Record<OperationalAvailability, number>;
  members: { memberId: string; availability: OperationalAvailability }[];
};

export type DemoActor = {
  id: string;
  label: string;
  memberId?: string;
};
