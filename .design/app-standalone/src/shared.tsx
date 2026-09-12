import * as React from "react";
import * as Router from "react-router-dom";
import * as Icons from "@phosphor-icons/react";
import * as Api from "./api/product-api";

type View =
  | "Dashboard"
  | "Administration Overview"
  | "Operational Execution"
  | "Operational Reliability"
  | "Executions"
  | "Workers"
  | "Operations"
  | "Readiness"
  | "Composition"
  | "Agents"
  | "Roles"
  | "Profiles"
  | "Capabilities"
  | "Skills"
  | "Tools & Plugins"
  | "Memory"
  | "Secret references"
  | "Runtime"
  | "Logs"
  | "Operational Evidence"
  | "Audit"
  | "Economics"
  | "Billing Boundary & Financial Truth"
  | "Pricing & Invoice Boundary"
  | "Payment Rails Boundary"
  | "Tenant Billing & Account Responsibility"
  | "Receipts, Settlement & Reconciliation"
  | "Financial Audit & Compliance"
  | "Billing UX & Operator Acceptance"
  | "Governance & System"
  | "Settings";

type PrimaryDomain = "Dashboard" | "Agents" | "Workforces" | "Runs" | "Evidence" | "Usage & Cost" | "Runtime" | "Administration";
type Domain = PrimaryDomain | "Executions" | "Workers" | "Financial Operations" | "Customers" | "Operations" | "Capabilities" | "Composition" | "Economics" | "Governance" | "System";

type DomainChild = {
  readonly label: string;
  readonly to: string;
  readonly kind?: "canonical" | "compatibility" | "legacy";
  readonly group?: string;
  readonly external?: boolean;
  readonly available?: boolean;
  readonly note?: string;
};

type DomainDef = {
  readonly id: PrimaryDomain;
  readonly icon: React.ReactNode;
  readonly to: string;
  readonly description: string;
  readonly children: readonly DomainChild[];
};

type ConnectivityState =
  | { status: "loading"; health: null; error: null }
  | { status: "ready"; health: Api.ProductApiHealth; error: null }
  | { status: "error"; health: null; error: string };

const viewPaths: Record<View, string> = {
  Dashboard: "/",
  "Administration Overview": "/administration",
  "Operational Execution": "/operational-execution",
  "Operational Reliability": "/system/operational-reliability",
  Executions: "/executions",
  Workers: "/workers",
  Operations: "/operations",
  Readiness: "/readiness",
  Composition: "/composition",
  Agents: "/agents",
  Roles: "/roles",
  Profiles: "/profiles",
  Capabilities: "/capabilities",
  Skills: "/skills",
  "Tools & Plugins": "/plugins",
  Memory: "/memory",
  "Secret references": "/credentials",
  Runtime: "/runtime",
  Logs: "/logs",
  "Operational Evidence": "/operational-evidence",
  Audit: "/audit",
  Economics: "/economics",
  "Billing Boundary & Financial Truth": "/system/billing-boundary",
  "Pricing & Invoice Boundary": "/system/pricing-invoice-boundary",
  "Payment Rails Boundary": "/system/payment-rails-boundary",
  "Tenant Billing & Account Responsibility": "/system/tenant-billing-boundary",
  "Receipts, Settlement & Reconciliation": "/system/settlement-reconciliation",
  "Financial Audit & Compliance": "/system/financial-audit",
  "Billing UX & Operator Acceptance": "/system/billing-acceptance",
  "Governance & System": "/system",
  Settings: "/settings",
};

const domainDefs: readonly DomainDef[] = [
  { id: "Dashboard", icon: <Icons.Gauge size={18} weight="duotone" />, to: "/", description: "Global attention, readiness and recent activity.", children: [] },
  { id: "Agents", icon: <Icons.Robot size={18} weight="duotone" />, to: "/agents", description: "Governed Agent identity, lifecycle, revisions and configuration.", children: [{ label: "All Agents", to: "/agents" }, { label: "Create Agent", to: "/agents/new" }, { label: "Credential references", to: "/credentials", kind: "compatibility" }] },
  { id: "Workforces", icon: <Icons.UsersThree size={18} weight="duotone" />, to: "/workforces", description: "Reusable Agent composition with canonical revision and admission semantics.", children: [
    { label: "Overview / List", to: "/workforces" },
    { label: "Members", to: "/workforces", available: false, note: "Select a Workforce" },
    { label: "Revisions", to: "/workforces", available: false, note: "Select a Workforce" },
    { label: "Runs", to: "/workforces", available: false, note: "Select a Workforce" },
    { label: "Operations", to: "/workforces", available: false, note: "Select a Workforce" },
  ] },
  { id: "Runs", icon: <Icons.PlayCircle size={18} weight="duotone" />, to: "/executions", description: "Cross-Agent execution history and governed planning.", children: [{ label: "All Runs", to: "/executions" }, { label: "Execution planning", to: "/operational-execution", kind: "compatibility" }] },
  { id: "Evidence", icon: <Icons.Pulse size={18} weight="duotone" />, to: "/operational-evidence", description: "Cross-Agent evidence, audit and operational activity.", children: [{ label: "Evidence", to: "/operational-evidence" }, { label: "Audit", to: "/audit" }, { label: "Logs", to: "/logs", kind: "compatibility" }] },
  { id: "Usage & Cost", icon: <Icons.CurrencyDollar size={18} weight="duotone" />, to: "/economics", description: "Operational usage and cost visibility with explicit financial boundaries.", children: [{ label: "Overview", to: "/economics" }, { label: "Reservations & settlement", to: "/system/settlement-reconciliation", kind: "compatibility" }, { label: "Financial audit", to: "/system/financial-audit", kind: "compatibility" }, { label: "Boundary reports", to: "/system/billing-boundary", kind: "compatibility", group: "Boundaries" }, { label: "Pricing & invoice", to: "/system/pricing-invoice-boundary", kind: "compatibility", group: "Boundaries" }, { label: "Payment rails", to: "/system/payment-rails-boundary", kind: "compatibility", group: "Boundaries" }, { label: "Tenant accountability", to: "/system/tenant-billing-boundary", kind: "compatibility", group: "Boundaries" }, { label: "Acceptance & claims", to: "/system/billing-acceptance", kind: "compatibility", group: "Boundaries" }] },
  { id: "Runtime", icon: <Icons.HardDrives size={18} weight="duotone" />, to: "/runtime", description: "Runtime, workers, deployments and operational support.", children: [{ label: "Runtime", to: "/runtime" }, { label: "Operations status", to: "/operations", kind: "compatibility" }, { label: "Deployments", to: "/operational-execution", kind: "compatibility" }, { label: "Workers", to: "/workers", kind: "compatibility" }, { label: "Diagnostics", to: "/logs", kind: "compatibility" }] },
  { id: "Administration", icon: <Icons.ShieldCheck size={18} weight="duotone" />, to: "/administration", description: "Organization access, governance, catalogs, readiness and settings.", children: [{ label: "Overview", to: "/administration" }, { label: "Readiness", to: "/readiness" }, { label: "Organizations", to: Api.productApiConfig.tenantAdministrationUrl, external: true }, { label: "Identity & access", to: "/credentials" }, { label: "Governance", to: "/system" }, { label: "Providers & catalogs", to: "/engines" }, { label: "Capabilities", to: "/composition" }, { label: "System reliability", to: "/system/operational-reliability" }, { label: "Settings", to: "/settings" }] },
];

const domainByPath = (path: string): PrimaryDomain => {
  if (path === "/") return "Dashboard";
  if (path.startsWith("/agents")) return "Agents";
  if (path.startsWith("/workforces")) return "Workforces";
  if (path.startsWith("/executions")) return "Runs";
  if (path.startsWith("/economics") || path.startsWith("/system/billing-boundary") || path.startsWith("/system/pricing-invoice-boundary") || path.startsWith("/system/payment-rails-boundary") || path.startsWith("/system/tenant-billing-boundary") || path.startsWith("/system/settlement-reconciliation") || path.startsWith("/system/financial-audit") || path.startsWith("/system/billing-acceptance")) return "Usage & Cost";
  if (path.startsWith("/operational-evidence") || path.startsWith("/audit")) return "Evidence";
  if (path.startsWith("/operational-execution") || path.startsWith("/runtime") || path.startsWith("/operations") || path.startsWith("/workers") || path.startsWith("/logs")) return "Runtime";
  return "Administration";
};

function childActive(pathname: string, to: string) {
  return pathname === to || (to !== "/" && pathname.startsWith(to + "/"));
}

const viewOfPath = (path: string): View | null => {
  const exact = (Object.entries(viewPaths) as [View, string][]).find(([, p]) => p === path)?.[0];
  if (exact) return exact;
  const prefix = `/${path.split("/")[1] ?? ""}`;
  return (Object.entries(viewPaths) as [View, string][]).find(([, p]) => p === prefix)?.[0] ?? null;
};

const SAFE_IDENTIFIER = /^[a-zA-Z0-9._:-]+$/;

function apiErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const candidate = error as { message?: unknown; reason?: unknown; code?: unknown };
    const message = candidate.message;
    if (typeof message === "string" && message) return message;
    if (typeof candidate.code === "string" && candidate.code) return `API error ${candidate.code}`;
    if (typeof candidate.reason === "string" && candidate.reason) return candidate.reason;
  }
  return error instanceof Error ? error.message : "An unexpected API error occurred";
}

function isApiConflict(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && (error as { status?: unknown }).status === 409);
}

function statusTone(status: string): "good" | "warn" | "muted" {
  const normalized = status.trim().toLowerCase();
  if (/warning|attention|updating|degraded|failed|unavailable|blocked|partial|pending|restricted|unvalidated|incompatible|credential|required|error|expired|cancelled|released/.test(normalized)) return "warn";
  if (/healthy|connected|installed|active|available|ready|validated|compatible|assigned|deployed|running|issued|settled/.test(normalized)) return "good";
  return "muted";
}

function Status({ status }: { status: string }) {
  return <span className={`status ${statusTone(status)}`}><i />{status}</span>;
}

function Badge({ tone, children }: { tone: "good" | "warn" | "muted"; children: React.ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function StateBadge({ label, dimension = "State" }: { label: string; dimension?: string }) {
  return <span className="state-badge" aria-label={`${dimension}: ${label}`}><span className={`state-badge-dot ${statusTone(label)}`} aria-hidden="true" />{label}</span>;
}

function FindingSeverity({ severity }: { severity: "error" | "warning" | "info" | string }) {
  const label = severity === "error" ? "error" : severity === "warning" ? "warning" : "info";
  return <span className={`finding-severity finding-severity-${label}`}>{label}</span>;
}

function ReadinessBadge({ summary }: { summary: Api.AgentListItem["readinessSummary"] }) {
  const tone = summary.state === "ready" ? "good" : summary.state === "partial" || summary.state === "blocked" ? "warn" : "muted";
  return <Badge tone={tone}>{summary.state}</Badge>;
}

function Time({ value }: { value: number }) {
  return <time dateTime={new Date(value).toISOString()}>{new Date(value).toLocaleString()}</time>;
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return <article className="metric"><div className="metric-top"><span>{label}</span><span className="metric-mark">↗</span></div><strong>{value}</strong><small>{note}</small></article>;
}

type DashboardLoadState = "loading" | "refreshing" | "ready" | "error";
type DashboardCardState = DashboardLoadState | "empty";

function useOperationalSummary<T>(
  fetcher: () => Promise<T>,
  emptyError: string,
  isStale: (data: T) => boolean,
) {
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [data, setData] = React.useState<T | null>(null);
  const [loadState, setLoadState] = React.useState<DashboardLoadState>("loading");
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [stale, setStale] = React.useState(false);
  const hasDataRef = React.useRef(false);
  const fetcherRef = React.useRef(fetcher);
  const isStaleRef = React.useRef(isStale);
  const emptyErrorRef = React.useRef(emptyError);
  fetcherRef.current = fetcher;
  isStaleRef.current = isStale;
  emptyErrorRef.current = emptyError;

  React.useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    setLoadState(hasDataRef.current ? "refreshing" : "loading");
    fetcherRef.current()
      .then(next => {
        if (!cancelled) {
          hasDataRef.current = true;
          setData(next);
          setStale(isStaleRef.current(next));
          setLoadState("ready");
        }
      })
      .catch(() => {
        if (!cancelled) {
          if (hasDataRef.current) {
            setStale(true);
            setLoadState("ready");
            setLoadError(emptyErrorRef.current.replace("Unable to load", "Refresh failed; keeping previous"));
          } else {
            setLoadError(emptyErrorRef.current);
            setLoadState("error");
          }
        }
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return {
    data,
    loadState,
    loadError,
    stale,
    refresh: () => setRefreshKey(k => k + 1),
  };
}

function OperationalModeNotice({ guardrails }: { guardrails?: Api.ProductApiOperationalGuardrails }) {
  if (!guardrails) return null;
  return <div className="mode-notice" role="note">
    {guardrails.inspectionMode && <span>Inspection mode</span>}
    {guardrails.readOnly && <span>Read-only</span>}
    {guardrails.sandboxOnly && <span>Sandbox only</span>}
    {!guardrails.mutableOperations && <span>No mutable operations</span>}
  </div>;
}

function AgentGuardrailBanner({ guardrails }: { guardrails: Api.AgentSurfaceGuardrails }) {
  return <div className="guardrail-banner" role="note">
    <span>Inspection / control-plane mode</span>
    <span>Sandbox only</span>
    <span>Production ready = false</span>
    <span>{guardrails.mutationScope} — mutations governed by Product API</span>
  </div>;
}

function DashboardCard({ title, meta, state, emptyMessage, children }: {
  title: string;
  meta: string;
  state: DashboardCardState;
  emptyMessage?: string;
  children?: React.ReactNode;
}) {
  const label = state === "loading" ? "..." : state === "refreshing" ? "refresh" : state === "error" ? "error" : state === "empty" ? "empty" : "ready";
  return <section className={`panel dashboard-card state-${state}`}>
    <div className="panel-head"><div><h2>{title}</h2><p>{meta}</p></div><span className="card-state">{label}</span></div>
    <div className="card-body">
      {state === "loading" && <div className="state-line">Loading operational state...</div>}
      {state === "refreshing" && <div className="state-line">Refreshing operational state...</div>}
      {state === "error" && <div className="state-line error">Unable to load this card. Check Product API connectivity and retry.</div>}
      {state === "empty" && <div className="state-line empty">{emptyMessage ?? "No data available"}</div>}
      {(state === "ready" || state === "refreshing") && children}
    </div>
  </section>;
}

type DashboardAccent = "agents" | "executions" | "customers" | "usage" | "workers" | "attention" | "success" | "info";

function CockpitPanel({ title, meta, state, className = "", accent = "info", action, children }: {
  title: string;
  meta: string;
  state: DashboardCardState;
  className?: string;
  accent?: DashboardAccent;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return <section className={`cockpit-panel cockpit-panel-${accent} state-${state} ${className}`.trim()}>
    <header className="cockpit-panel-head">
      <div><h2>{title}</h2><p>{meta}</p></div>
      {action}
    </header>
    <div className="cockpit-panel-body">
      {state === "loading" && <div className="cockpit-loading">Loading operational state...</div>}
      {state === "error" && <div className="cockpit-error">This operational section is temporarily unavailable.</div>}
      {(state === "ready" || state === "refreshing" || state === "empty") && children}
    </div>
  </section>;
}

function DashboardMetric({ label, value, context, action, to, icon, accent, progress }: {
  label: string;
  value: string | number;
  context: string;
  action: string;
  to: string;
  icon: React.ReactNode;
  accent: DashboardAccent;
  progress?: number | null;
}) {
  const normalizedProgress = progress === null || progress === undefined ? null : Math.max(0, Math.min(100, progress));
  const body = <>
    <div className="dashboard-metric-top"><span className="dashboard-metric-icon" aria-hidden="true">{icon}</span><span>{label}</span></div>
    <strong>{value}</strong>
    <small>{context}</small>
    <div className={`dashboard-metric-signal${normalizedProgress === null ? " is-neutral" : ""}`} aria-hidden="true"><span style={normalizedProgress === null ? undefined : { width: `${normalizedProgress}%` }} /></div>
    <span className="dashboard-metric-link">{action}<Icons.ArrowRight size={13} weight="bold" aria-hidden="true" /></span>
  </>;
  return to.startsWith("http")
    ? <a className={`dashboard-metric dashboard-metric-${accent}`} href={to}>{body}</a>
    : <Router.Link className={`dashboard-metric dashboard-metric-${accent}`} to={to}>{body}</Router.Link>;
}

function SummaryRow({ label, value, tone }: { label: string; value: string | number; tone?: "good" | "warn" | "muted" }) {
  return <div className="summary-row"><span>{label}</span><strong className={tone ?? ""}>{value}</strong></div>;
}

function FindingRow({ finding }: { finding: Api.DashboardFinding }) {
  return <div className={`finding-row ${finding.severity}`}><FindingSeverity severity={finding.severity} /><p>{finding.message}</p></div>;
}

/* ---------------------------------------------------------------------------
 * Milestone F — shared operational state patterns
 * ------------------------------------------------------------------------- */

function PanelStateLine({ state, error, emptyMessage }: {
  state: DashboardLoadState;
  error: string | null;
  emptyMessage?: string;
}) {
  if (state === "loading") return <div className="state-line">Loading operational state...</div>;
  if (state === "error") return <div className="state-line error">{error ?? "Unable to load this surface from the Product API."}</div>;
  return <div className="state-line empty">{emptyMessage ?? "No data available"}</div>;
}

function ErrorBanner({ error }: { error: string | null }) {
  if (!error) return null;
  return <div className="error-banner" role="alert">{error}</div>;
}

function EmptyState({ message, children }: { message: string; children?: React.ReactNode }) {
  return <div className="state-line empty">{message}{children}</div>;
}

function SummaryCard({ title, meta, state, emptyMessage, children }: {
  title: string;
  meta: string;
  state?: DashboardCardState;
  emptyMessage?: string;
  children: React.ReactNode;
}) {
  return <section className={`panel summary-card${state ? ` state-${state}` : ""}`}>
    <div className="panel-head"><div><h2>{title}</h2><p>{meta}</p></div></div>
    <div className="panel-body">{state === "empty" ? <EmptyState message={emptyMessage ?? "No data available"} /> : children}</div>
  </section>;
}

function BlockedPanel({ title, note, reason }: { title: string; note: string; reason: string }) {
  return <section className="panel blocked-panel">
    <div className="panel-head"><div><h2>{title}</h2><p>{note}</p></div><Badge tone="warn">blocked</Badge></div>
    <p className="panel-note">{reason}</p>
  </section>;
}

function UnsupportedPanel({ title, note, reason }: { title: string; note: string; reason: string }) {
  return <section className="panel unsupported-panel">
    <div className="panel-head"><div><h2>{title}</h2><p>{note}</p></div><Badge tone="muted">unsupported</Badge></div>
    <p className="panel-note">{reason}</p>
  </section>;
}

type TimelineItem = {
  id: string;
  title: string;
  meta?: string;
  detail?: string;
  tone?: "good" | "warn" | "muted";
};

function TimelineList({ items, limit }: { items: TimelineItem[]; limit?: number }) {
  const visible = limit !== undefined ? items.slice(0, limit) : items;
  if (visible.length === 0) return <div className="state-line empty">No records available from the Product API.</div>;
  return <div className="timeline">
    {visible.map((item, index) => (
      <article className="timeline-row" key={`${item.id}-${index}`}>
        <div className="timeline-row-top"><b>{item.title}</b>{item.tone ? <StateBadge label={item.tone === "good" ? "normal" : item.tone === "warn" ? "attention" : "informational"} dimension="Presentation" /> : null}</div>
        {item.meta && <small>{item.meta}</small>}
        {item.detail && <p>{item.detail}</p>}
      </article>
    ))}
  </div>;
}

function EntityRefList({ refs }: { refs?: readonly Api.EntityReference[] }) {
  if (!refs || refs.length === 0) return null;
  return <div className="entity-ref-list"><span>References</span><div>
    {refs.map(ref => <code key={`${ref.entityType}:${ref.entityId}`} className="mono">{ref.entityType}:{ref.entityId}</code>)}
  </div></div>;
}

function CrossLinks({ links }: { links: { to: string; label: string }[] }) {
  if (links.length === 0) return null;
  return <div className="cross-links" role="navigation">
    {links.map(link => <Router.Link className="detail-link" to={link.to} key={link.to}>{link.label} →</Router.Link>)}
  </div>;
}

function SectionDisclosure({ title, summary, tier, defaultOpen = false, children }: {
  title: string;
  summary: string;
  tier: "Secondary" | "Diagnostic" | "Administrative" | "Raw";
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const tierClass = tier.toLowerCase().replace(/[^a-z]+/g, "-");
  return <details className={`disclosure disclosure-${tierClass}`} open={defaultOpen}>
    <summary><div><strong>{title}</strong><small>{summary}</small></div><span className="disclosure-tier">{tier}</span></summary>
    <div className="disclosure-body">{children}</div>
  </details>;
}

function DomainHeader({ domain, title, description, entityLabel, actions, titleAdornment, children }: {
  domain: Domain;
  title: string;
  description: string;
  entityLabel?: string;
  actions?: React.ReactNode;
  titleAdornment?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return <>
    <header className="domain-header">
      <div className="domain-header-copy"><p className="eyebrow">{domain.toUpperCase()}</p><div className="title-status"><h1>{title}</h1>{titleAdornment}</div><p>{description}</p></div>
      <div className="domain-context-inline" aria-label="Current context">
        <span>Workspace: <strong>{Api.productApiConfig.environment}</strong></span>
        {entityLabel && <span>Entity: <strong>{entityLabel}</strong></span>}
      </div>
      {actions && <div className="domain-header-actions">{actions}</div>}
    </header>
    {children}
  </>;
}

function ContextTabs({ title, tabs }: {
  title: string;
  tabs: readonly { label: string; to: string; available?: boolean; note?: string }[];
}) {
  const location = Router.useLocation();
  const active = [...tabs].sort((left, right) => right.to.length - left.to.length).find(tab => childActive(location.pathname, tab.to))?.to;
  return <div className="context-tabs-wrap">
    <div className="context-tabs-head"><strong>{title}</strong><small>Entity context</small></div>
    <nav className="context-tabs" aria-label={title}>
      {tabs.map(tab => tab.available === false
        ? <span key={tab.to} className="context-tab unavailable" aria-disabled="true">{tab.label}<small>{tab.note ?? "Unavailable"}</small></span>
        : <Router.Link key={tab.to} className={`context-tab ${active === tab.to ? "active" : ""}`} to={tab.to}>{tab.label}</Router.Link>)}
    </nav>
  </div>;
}

export function ReportSectionNav({ sections }: {
  sections: readonly { id: string; label: string }[];
}) {
  return <nav className="report-section-nav" aria-label="Sections in this report">
    <span className="report-section-nav-title">In this report</span>
    <div>{sections.map(section => <a key={section.id} href={`#${section.id}`}>{section.label}</a>)}</div>
  </nav>;
}

type WorkforceNavigationContext = {
  workforceId: string;
  name: string | null;
};

function workforceContextChildren(workforceId: string): readonly DomainChild[] {
  const base = `/workforces/${encodeURIComponent(workforceId)}`;
  return [
    { label: "Overview", to: base },
    { label: "Members", to: `${base}/members` },
    { label: "Revisions", to: `${base}/revisions` },
    { label: "Runs", to: `${base}/runs` },
    { label: "Operations", to: `${base}/operations` },
  ];
}

function SidebarNavigation({ pathname, activeDomain, onNavigate, collapsed, workforceContext }: {
  pathname: string;
  activeDomain: PrimaryDomain;
  onNavigate: () => void;
  collapsed: boolean;
  workforceContext: WorkforceNavigationContext | null;
}) {
  return <nav className="sidebar-navigation" aria-label="Control Plane navigation">
    {domainDefs.map(domain => {
      const expanded = domain.id === activeDomain;
      const visibleChildren = domain.id === "Workforces" && workforceContext
        ? domain.children.filter(child => child.to === "/workforces" && child.available !== false)
        : domain.children;
      const groups = visibleChildren.reduce<Record<string, DomainChild[]>>((acc, child) => {
        const group = child.group ?? "";
        (acc[group] ??= []).push(child);
        return acc;
      }, {});
      if (domain.id === "Workforces" && workforceContext) {
        groups[`Workforce: ${workforceContext.name ?? workforceContext.workforceId}`] = [...workforceContextChildren(workforceContext.workforceId)];
      }
      const activeWorkforceChild = domain.id === "Workforces" && workforceContext
        ? [...workforceContextChildren(workforceContext.workforceId)]
          .sort((left, right) => right.to.length - left.to.length)
          .find(child => childActive(pathname, child.to))?.to
        : undefined;
      return <section className={`sidebar-domain ${expanded ? "expanded" : ""}`} key={domain.id}>
        <Router.Link className={`domain-link ${expanded ? "active" : ""}`} to={domain.to} onClick={onNavigate} aria-current={expanded ? "page" : undefined} title={collapsed ? domain.id : undefined}>
          <span aria-hidden="true">{domain.icon}</span><span className="domain-label">{domain.id}</span><i className="sidebar-chevron" aria-hidden="true">{expanded ? "⌄" : "›"}</i>
        </Router.Link>
        {!collapsed && expanded && <div className="sidebar-children">
          {Object.entries(groups).map(([group, children]) => <div className="sidebar-child-group" key={group || "root"}>
            {group && <span className="sidebar-group-label">{group}</span>}
            {children.map(child => {
              const active = domain.id === "Workforces"
                ? child.to === "/workforces"
                  ? pathname === child.to
                  : child.to === activeWorkforceChild
                : childActive(pathname, child.to);
              return child.available === false
                ? <span key={child.label} className="sidebar-child-link unavailable" aria-disabled="true">{child.label}<small>{child.note ?? "Select a Workforce"}</small></span>
                : child.external
                ? <a key={child.to} className="sidebar-child-link" href={child.to} onClick={onNavigate}>{child.label} ↗</a>
                : <Router.Link key={child.to} className={`sidebar-child-link ${active ? "active" : ""}`} to={child.to} onClick={onNavigate} aria-current={active ? "page" : undefined}>{child.label}</Router.Link>;
            })}
          </div>)}
        </div>}
      </section>;
    })}
  </nav>;
}

function EntityContextNav({ pathname, workforceContext }: { pathname: string; workforceContext: WorkforceNavigationContext | null }) {
  if (pathname === "/agents/new") return null;
  const agentMatch = pathname.match(/^\/agents\/([^/]+)(?:\/[^/]+)?/);
  if (agentMatch) {
    const agentId = agentMatch[1];
    return <ContextTabs title={`Agent / ${agentId}`} tabs={[
      { label: "Overview", to: `/agents/${agentId}` },
      { label: "Configuration", to: `/agents/${agentId}/configuration` },
      { label: "Validate", to: `/agents/${agentId}/validate` },
      { label: "Runs", to: `/agents/${agentId}/runs` },
      { label: "Revisions", to: `/agents/${agentId}/revisions` },
      { label: "Evidence", to: `/agents/${agentId}/evidence` },
      { label: "Usage & Cost", to: `/agents/${agentId}/usage-cost` },
      { label: "Advanced", to: `/agents/${agentId}/advanced` },
    ]} />;
  }
  const workforceMatch = pathname.match(/^\/workforces\/([^/]+)(?:\/[^/]+)?/);
  if (workforceMatch) {
    const workforceId = decodeURIComponent(workforceMatch[1]);
    return <ContextTabs title={`Workforce: ${workforceContext?.name ?? workforceId}`} tabs={workforceContextChildren(workforceId)} />;
  }
  const resourceMatch = pathname.match(/^\/(roles|profiles|capabilities|skills|plugins|tools|engines|providers)\/([^/]+)/);
  if (resourceMatch) {
    const parentByResource: Record<string, string> = { roles: "/roles", profiles: "/profiles", capabilities: "/capabilities", skills: "/skills", plugins: "/plugins", tools: "/plugins", engines: "/engines", providers: "/engines" };
    return <ContextTabs title={`${resourceMatch[1]} / ${resourceMatch[2]}`} tabs={[
      { label: "Detail", to: pathname },
      { label: "Catalog", to: parentByResource[resourceMatch[1]] },
      { label: "Agent usage", to: "/agents" },
    ]} />;
  }
  return null;
}

/* ---------------------------------------------------------------------------
 * Milestone C — Composition surface helpers
 * ------------------------------------------------------------------------- */

function CompositionCard({ title, meta, count, state, to }: {
  title: string;
  meta: string;
  count: number | undefined;
  state: DashboardCardState;
  to: string;
}) {
  return <section className={`panel dashboard-card composition-card state-${state}`}>
    <div className="panel-head"><div><h2>{title}</h2><p>{meta}</p></div><span className="card-state">{state === "ready" ? count : state}</span></div>
    <div className="card-body">
      {state === "loading" && <div className="state-line">Loading operational state...</div>}
      {state === "refreshing" && <div className="state-line">Refreshing operational state...</div>}
      {state === "error" && <div className="state-line error">Unable to load this block.</div>}
      {state === "empty" && <div className="state-line empty">No items available from the Product API.</div>}
      {state === "ready" && <strong className="composition-count">{count}</strong>}
      <Router.Link className="surface-link" to={to}>Open {title.toLowerCase()} catalog →</Router.Link>
    </div>
  </section>;
}

function CatalogPage({ domain, title, description, loadState, loadError, stale, refresh, children }: {
  domain: Domain;
  title: string;
  description: string;
  loadState: DashboardLoadState;
  loadError: string | null;
  stale: boolean;
  refresh: () => void;
  children: React.ReactNode;
}) {
  return <>
    <DomainHeader domain={domain} title={title} description={description} actions={<button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadError ? "Retry" : loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>} />
    <div className="guardrail-banner" role="note"><span>Inspection mode</span><span>Sandbox only</span><span>Read-only</span><span>Composition governed by Product API</span></div>
    {stale && <div className="stale-banner" role="status">Showing a stale composition snapshot. Refresh to recover live state.</div>}
    {loadState === "refreshing" && <div className="refresh-banner" role="status">Refreshing composition...</div>}
    {loadError && <div className="error-banner" role="alert">{loadError}</div>}
    {children}
  </>;
}

function CatalogLoading({ message }: { message: string }) {
  return <div className="loading-screen">{message}</div>;
}

function CatalogError({ message }: { message: string }) {
  return <section className="panel"><div className="empty-state">{message}</div></section>;
}

function CapabilityBadges({ capabilities }: { capabilities: readonly string[] }) {
  if (capabilities.length === 0) return <span className="unavailable">none</span>;
  return <span className="capability-badges">{capabilities.map(capability => <code key={capability} className="capability-badge">{capability}</code>)}</span>;
}

function UnsupportedActionsPanel({ actions, note }: { actions: readonly Api.CompositionActionView[]; note: string }) {
  if (actions.length === 0) return null;
  return <section className="panel wide">
    <div className="panel-head"><div><h2>Composition actions</h2><p>{note}</p></div><Badge tone="muted">unsupported</Badge></div>
    <div className="action-grid">
      {actions.map(action => (
        <div className="action-tile disabled" key={action.action}>
          <b>{action.label}</b>
          <span className="unsupported-badge">Unsupported · Coming later</span>
          <small className="action-reason">{action.reason}</small>
        </div>
      ))}
    </div>
    <p className="panel-note">Unsupported actions are never simulated. The Product API governs every composition mutation; this milestone is read-only.</p>
  </section>;
}

function CompositionFindingRow({ finding }: { finding: Api.CompositionFinding }) {
  return <div className={`finding-row ${finding.severity}`}><span>{finding.severity}</span><div className="finding-content"><code className="mono finding-code">{finding.code}</code><p>{finding.message}</p></div></div>;
}

function FindingSection({ title, meta, findings, emptyMessage }: {
  title: string;
  meta: string;
  findings: readonly Api.CompositionFinding[];
  emptyMessage: string;
}) {
  return <section className="panel">
    <div className="panel-head"><div><h2>{title}</h2><p>{meta}</p></div><Badge tone={findings.length > 0 ? "warn" : "good"}>{findings.length}</Badge></div>
    <div className="panel-body">
      {findings.length === 0
        ? <div className="state-line empty">{emptyMessage}</div>
        : <div className="finding-list">{findings.map((finding, index) => <CompositionFindingRow key={`${finding.code}-${index}`} finding={finding} />)}</div>}
    </div>
  </section>;
}

function SourceMap({ entries }: { entries: Api.AgentCompositionDetail["effectiveCapabilities"] }) {
  if (entries.length === 0) {
    return <div className="state-line empty">No effective capabilities reported by the Product API.</div>;
  }
  return <div className="source-map">
    {entries.map(entry => (
      <div className="source-map-row" key={entry.capabilityId}>
        <div className="source-map-id"><b>{entry.name}</b><code className="mono">{entry.capabilityId}</code></div>
        <div className="source-map-sources">
          <span>sources</span>
          {entry.sources.length > 0
            ? entry.sources.map(source => <code key={source} className="capability-badge">{source}</code>)
            : <span className="unavailable">none</span>}
        </div>
        <Badge tone={entry.status === "active" ? "good" : entry.status === "warning" ? "warn" : "muted"}>{entry.status}</Badge>
      </div>
    ))}
  </div>;
}

function ReadinessStatus({ status }: { status: string }) {
  return <Status status={status} />;
}

function ReadinessFindingRow({ finding }: { finding: Api.ReadinessFinding }) {
  const severity = finding.severity === "error" ? "error" : finding.severity === "warning" ? "warning" : "info";
  return <div className={`finding-row ${severity}`}>
    <FindingSeverity severity={severity} />
    <div className="finding-content">
      <b>{finding.component}</b>
      <p>{finding.reason}</p>
      <small>{finding.recommendedRemediation}</small>
    </div>
  </div>;
}

type ReadinessFlag = Api.GlobalReadinessSummary["readinessFlags"][number];

function ReadinessFlagCard({ title, meta, flag, state }: {
  title: string;
  meta: string;
  flag?: ReadinessFlag;
  state: DashboardLoadState;
}) {
  return <DashboardCard title={title} meta={meta} state={state}>
    {flag
      ? <div className="readiness-flag"><div className="readiness-flag-top"><b>{flag.label}</b><ReadinessStatus status={flag.status} /></div><p>{flag.detail}</p></div>
      : <div className="state-line empty">Readiness flag unavailable</div>}
  </DashboardCard>;
}


function staleBanner(state: { stale: boolean; loadState: DashboardLoadState; loadError: string | null }, subject: string) {
  return <>
    {state.stale && <div className="stale-banner" role="status">Showing a stale {subject} snapshot. Refresh to recover live state.</div>}
    {state.loadState === "refreshing" && <div className="refresh-banner" role="status">Refreshing {subject}...</div>}
    {state.loadError && <div className="error-banner" role="alert">{state.loadError}</div>}
  </>;
}

function IdList({ label, ids }: { label: string; ids: readonly string[] }) {
  if (ids.length === 0) return null;
  return <div className="id-list"><span>{label}</span><div>{ids.map(id => <code key={id} className="mono">{id}</code>)}</div></div>;
}


export {domainDefs, domainByPath, viewOfPath, childActive, SAFE_IDENTIFIER, apiErrorMessage, isApiConflict, statusTone, Status, Badge, StateBadge, FindingSeverity, ReadinessBadge, Time, Metric, useOperationalSummary, OperationalModeNotice, AgentGuardrailBanner, DashboardCard, CockpitPanel, DashboardMetric, SummaryRow, FindingRow, PanelStateLine, ErrorBanner, EmptyState, SummaryCard, BlockedPanel, UnsupportedPanel, TimelineList, EntityRefList, CrossLinks, SectionDisclosure, DomainHeader, ContextTabs, SidebarNavigation, EntityContextNav, CompositionCard, CatalogPage, CatalogLoading, CatalogError, CapabilityBadges, UnsupportedActionsPanel, CompositionFindingRow, FindingSection, SourceMap, ReadinessStatus, ReadinessFindingRow, ReadinessFlagCard, staleBanner, IdList};
export type {DashboardLoadState, DashboardCardState, View, PrimaryDomain, Domain, DomainChild, DomainDef, ConnectivityState, TimelineItem};
