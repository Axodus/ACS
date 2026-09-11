import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowRight,
  ChartBar,
  ChartDonut,
  ChartLineUp,
  CheckCircle,
  ClockCountdown,
  CurrencyDollar,
  Gauge,
  HardDrives,
  PlayCircle,
  Pulse,
  Robot,
  RocketLaunch,
  ShieldCheck,
  UserPlus,
  UsersThree,
  Wallet,
  WarningOctagon,
  Wrench,
  XCircle,
} from "@phosphor-icons/react";
import {
  productApi,
  productApiConfig,
  type AgentCompositionDetail,
  type AgentDefinition,
  type AgentDetail,
  type AgentDuplicateInput,
  type AgentLifecycleActionName,
  type AgentLifecycleActionView,
  type AgentLifecycleStateView,
  type AgentListItem,
  type AgentOperationResult,
  type AgentRevisionSummary,
  type AgentSurfaceGuardrails,
  type AgentReadinessDetail,
  type CapabilitySummary,
  type CompositionActionView,
  type CompositionFinding,
  type CompositionSummary,
  type DashboardFinding,
  type DashboardSummary,
  type EngineSummary,
  type GlobalReadinessSummary,
  type GovernedAgentStatus,
  type CredentialSummary,
  type ProviderConnectionSummary,
  type DeploymentPlan,
  type ExecutionPlan,
  type DeploymentSummary,
  type RuntimeSummary,
  type ExecutionRunSummary,
  type WorkerSummary,
  type ModelSummary,
  type PackageSource,
  type PluginPackage,
  type PluginSummary,
  type ProfileSummary,
  type ProductApiHealth,
  type ProductApiOperationalGuardrails,
  type ProviderSummary,
  type ReadinessFinding,
  type RoleSummary,
  type SkillSummary,
  type ToolSummary,
  type EventRecord,
  type AuditEntry,
  type EconomicSummary,
  type EvidenceRecord,
  type DiagnosticReport,
  type Quote,
  type Reservation,
  type MeteringRecord,
  type Settlement,
  type Receipt,
  type EntityReference,
  type SystemGuardrailsView,
  type SystemConfigurationView,
  type SystemPolicyVisibility,
  type SystemAdministrationView,
  type SystemTenantsView,
  type Epic11AcceptanceReport,
  type BillingBoundaryReport,
  type ProductionReadinessReport,
  type GovernanceBoundaryReport,
  type OperationalReliabilityReport,
  type PricingInvoiceBoundaryReport,
  type PaymentRailsBoundaryReport,
  type TenantBillingBoundaryReport,
  type SettlementReconciliationBoundaryReport,
  type FinancialAuditBoundaryReport,
} from "./api/product-api";
import { AccountControl } from "./auth/AccountControl";
import { CredentialsPage, ExecutionDetailPage, ExecutionsPage, OperationsStatusPage, WorkerDetailPage, WorkersPage } from "./OperationalUx";
import "./operational.css";

type View =
  | "Dashboard"
  | "Administration Overview"
  | "Operational Execution"
  | "Readiness"
  | "Composition"
  | "Agents"
  | "Roles"
  | "Profiles"
  | "Capabilities"
  | "Skills"
  | "Tools & Plugins"
  | "Memory"
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

type PrimaryDomain = "Dashboard" | "Agents" | "Runs" | "Evidence" | "Usage & Cost" | "Runtime" | "Administration";
type Domain = PrimaryDomain | "Executions" | "Workers" | "Financial Operations" | "Customers" | "Operations" | "Capabilities" | "Economics" | "Governance" | "System";

type DomainChild = {
  readonly label: string;
  readonly to: string;
  readonly kind?: "canonical" | "compatibility" | "legacy";
  readonly group?: string;
  readonly external?: boolean;
};

type DomainDef = {
  readonly id: PrimaryDomain;
  readonly icon: string;
  readonly to: string;
  readonly description: string;
  readonly children: readonly DomainChild[];
};

type ConnectivityState =
  | { status: "loading"; health: null; error: null }
  | { status: "ready"; health: ProductApiHealth; error: null }
  | { status: "error"; health: null; error: string };

const viewPaths: Record<View, string> = {
  Dashboard: "/",
  "Administration Overview": "/administration",
  "Operational Execution": "/operational-execution",
  Readiness: "/readiness",
  Composition: "/composition",
  Agents: "/agents",
  Roles: "/roles",
  Profiles: "/profiles",
  Capabilities: "/capabilities",
  Skills: "/skills",
  "Tools & Plugins": "/plugins",
  Memory: "/memory",
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
  { id: "Dashboard", icon: "⌂", to: "/", description: "Global attention, readiness and recent activity.", children: [] },
  { id: "Agents", icon: "◫", to: "/agents", description: "Governed Agent identity, lifecycle, revisions and configuration.", children: [{ label: "All Agents", to: "/agents" }, { label: "Create Agent", to: "/agents/new" }, { label: "Credential references", to: "/credentials", kind: "compatibility" }] },
  { id: "Runs", icon: "▷", to: "/executions", description: "Cross-Agent execution history and governed planning.", children: [{ label: "All Runs", to: "/executions" }, { label: "Execution planning", to: "/operational-execution", kind: "compatibility" }] },
  { id: "Evidence", icon: "◌", to: "/operational-evidence", description: "Cross-Agent evidence, audit and operational activity.", children: [{ label: "Evidence", to: "/operational-evidence" }, { label: "Audit", to: "/audit" }, { label: "Logs", to: "/logs", kind: "compatibility" }] },
  { id: "Usage & Cost", icon: "$", to: "/economics", description: "Operational usage and cost visibility with explicit financial boundaries.", children: [{ label: "Overview", to: "/economics" }, { label: "Reservations & settlement", to: "/system/settlement-reconciliation", kind: "compatibility" }, { label: "Financial audit", to: "/system/financial-audit", kind: "compatibility" }, { label: "Boundary reports", to: "/system/billing-boundary", kind: "compatibility", group: "Boundaries" }, { label: "Pricing & invoice", to: "/system/pricing-invoice-boundary", kind: "compatibility", group: "Boundaries" }, { label: "Payment rails", to: "/system/payment-rails-boundary", kind: "compatibility", group: "Boundaries" }, { label: "Tenant accountability", to: "/system/tenant-billing-boundary", kind: "compatibility", group: "Boundaries" }, { label: "Acceptance & claims", to: "/system/billing-acceptance", kind: "compatibility", group: "Boundaries" }] },
  { id: "Runtime", icon: "⟡", to: "/runtime", description: "Runtime, workers, deployments and operational support.", children: [{ label: "Runtime", to: "/runtime" }, { label: "Operations status", to: "/operations", kind: "compatibility" }, { label: "Deployments", to: "/operational-execution", kind: "compatibility" }, { label: "Workers", to: "/workers", kind: "compatibility" }, { label: "Diagnostics", to: "/logs", kind: "compatibility" }] },
  { id: "Administration", icon: "⚙", to: "/administration", description: "Organization access, governance, catalogs, readiness and settings.", children: [{ label: "Overview", to: "/administration" }, { label: "Readiness", to: "/readiness" }, { label: "Organizations", to: productApiConfig.tenantAdministrationUrl, external: true }, { label: "Identity & access", to: "/credentials" }, { label: "Governance", to: "/system" }, { label: "Providers & catalogs", to: "/engines" }, { label: "Capabilities", to: "/composition" }, { label: "System reliability", to: "/system/operational-reliability" }, { label: "Settings", to: "/settings" }] },
];

const domainByPath = (path: string): PrimaryDomain => {
  if (path === "/") return "Dashboard";
  if (path.startsWith("/agents")) return "Agents";
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

function Badge({ tone, children }: { tone: "good" | "warn" | "muted"; children: ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function StateBadge({ label, dimension = "State" }: { label: string; dimension?: string }) {
  return <span className="state-badge" aria-label={`${dimension}: ${label}`}><span className={`state-badge-dot ${statusTone(label)}`} aria-hidden="true" />{label}</span>;
}

function FindingSeverity({ severity }: { severity: "error" | "warning" | "info" | string }) {
  const label = severity === "error" ? "error" : severity === "warning" ? "warning" : "info";
  return <span className={`finding-severity finding-severity-${label}`}>{label}</span>;
}

function ReadinessBadge({ summary }: { summary: AgentListItem["readinessSummary"] }) {
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
  const [refreshKey, setRefreshKey] = useState(0);
  const [data, setData] = useState<T | null>(null);
  const [loadState, setLoadState] = useState<DashboardLoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const hasDataRef = useRef(false);
  const fetcherRef = useRef(fetcher);
  const isStaleRef = useRef(isStale);
  const emptyErrorRef = useRef(emptyError);
  fetcherRef.current = fetcher;
  isStaleRef.current = isStale;
  emptyErrorRef.current = emptyError;

  useEffect(() => {
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

function OperationalModeNotice({ guardrails }: { guardrails?: ProductApiOperationalGuardrails }) {
  if (!guardrails) return null;
  return <div className="mode-notice" role="note">
    {guardrails.inspectionMode && <span>Inspection mode</span>}
    {guardrails.readOnly && <span>Read-only</span>}
    {guardrails.sandboxOnly && <span>Sandbox only</span>}
    {!guardrails.mutableOperations && <span>No mutable operations</span>}
  </div>;
}

function AgentGuardrailBanner({ guardrails }: { guardrails: AgentSurfaceGuardrails }) {
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
  children?: ReactNode;
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
  action?: ReactNode;
  children: ReactNode;
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
  icon: ReactNode;
  accent: DashboardAccent;
  progress?: number | null;
}) {
  const normalizedProgress = progress === null || progress === undefined ? null : Math.max(0, Math.min(100, progress));
  const body = <>
    <div className="dashboard-metric-top"><span className="dashboard-metric-icon" aria-hidden="true">{icon}</span><span>{label}</span></div>
    <strong>{value}</strong>
    <small>{context}</small>
    <div className={`dashboard-metric-signal${normalizedProgress === null ? " is-neutral" : ""}`} aria-hidden="true"><span style={normalizedProgress === null ? undefined : { width: `${normalizedProgress}%` }} /></div>
    <span className="dashboard-metric-link">{action}<ArrowRight size={13} weight="bold" aria-hidden="true" /></span>
  </>;
  return to.startsWith("http")
    ? <a className={`dashboard-metric dashboard-metric-${accent}`} href={to}>{body}</a>
    : <Link className={`dashboard-metric dashboard-metric-${accent}`} to={to}>{body}</Link>;
}

function SummaryRow({ label, value, tone }: { label: string; value: string | number; tone?: "good" | "warn" | "muted" }) {
  return <div className="summary-row"><span>{label}</span><strong className={tone ?? ""}>{value}</strong></div>;
}

function FindingRow({ finding }: { finding: DashboardFinding }) {
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

function EmptyState({ message, children }: { message: string; children?: ReactNode }) {
  return <div className="state-line empty">{message}{children}</div>;
}

function SummaryCard({ title, meta, state, emptyMessage, children }: {
  title: string;
  meta: string;
  state?: DashboardCardState;
  emptyMessage?: string;
  children: ReactNode;
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

function EntityRefList({ refs }: { refs?: readonly EntityReference[] }) {
  if (!refs || refs.length === 0) return null;
  return <div className="entity-ref-list"><span>References</span><div>
    {refs.map(ref => <code key={`${ref.entityType}:${ref.entityId}`} className="mono">{ref.entityType}:{ref.entityId}</code>)}
  </div></div>;
}

function CrossLinks({ links }: { links: { to: string; label: string }[] }) {
  if (links.length === 0) return null;
  return <div className="cross-links" role="navigation">
    {links.map(link => <Link className="detail-link" to={link.to} key={link.to}>{link.label} →</Link>)}
  </div>;
}

function SectionDisclosure({ title, summary, tier, defaultOpen = false, children }: {
  title: string;
  summary: string;
  tier: "Secondary" | "Diagnostic" | "Administrative" | "Raw";
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const tierClass = tier.toLowerCase().replace(/[^a-z]+/g, "-");
  return <details className={`disclosure disclosure-${tierClass}`} open={defaultOpen}>
    <summary><div><strong>{title}</strong><small>{summary}</small></div><span className="disclosure-tier">{tier}</span></summary>
    <div className="disclosure-body">{children}</div>
  </details>;
}

function DomainHeader({ domain, title, description, entityLabel, actions, children }: {
  domain: Domain;
  title: string;
  description: string;
  entityLabel?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return <>
    <header className="domain-header">
      <div className="domain-header-copy"><p className="eyebrow">{domain.toUpperCase()}</p><h1>{title}</h1><p>{description}</p></div>
      <div className="domain-context-inline" aria-label="Current context">
        <span>Workspace: <strong>{productApiConfig.environment}</strong></span>
        {entityLabel && <span>Entity: <strong>{entityLabel}</strong></span>}
        <span className="context-endpoint" title={productApiConfig.baseUrl}>API: {productApiConfig.baseUrl}</span>
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
  const location = useLocation();
  const active = [...tabs].sort((left, right) => right.to.length - left.to.length).find(tab => childActive(location.pathname, tab.to))?.to;
  return <div className="context-tabs-wrap">
    <div className="context-tabs-head"><strong>{title}</strong><small>Entity context</small></div>
    <nav className="context-tabs" aria-label={title}>
      {tabs.map(tab => tab.available === false
        ? <span key={tab.to} className="context-tab unavailable" aria-disabled="true">{tab.label}<small>{tab.note ?? "Unavailable"}</small></span>
        : <Link key={tab.to} className={`context-tab ${active === tab.to ? "active" : ""}`} to={tab.to}>{tab.label}</Link>)}
    </nav>
  </div>;
}

function SidebarNavigation({ pathname, activeDomain, onNavigate }: {
  pathname: string;
  activeDomain: PrimaryDomain;
  onNavigate: () => void;
}) {
  return <nav className="sidebar-navigation" aria-label="Control Plane navigation">
    {domainDefs.map(domain => {
      const expanded = domain.id === activeDomain;
      const groups = domain.children.reduce<Record<string, DomainChild[]>>((acc, child) => {
        const group = child.group ?? "";
        (acc[group] ??= []).push(child);
        return acc;
      }, {});
      return <section className={`sidebar-domain ${expanded ? "expanded" : ""}`} key={domain.id}>
        <Link className={`domain-link ${expanded ? "active" : ""}`} to={domain.to} onClick={onNavigate} aria-current={expanded ? "page" : undefined}>
          <span>{domain.icon}</span>{domain.id}<i className="sidebar-chevron" aria-hidden="true">{expanded ? "⌄" : "›"}</i>
        </Link>
        {expanded && <div className="sidebar-children">
          {Object.entries(groups).map(([group, children]) => <div className="sidebar-child-group" key={group || "root"}>
            {group && <span className="sidebar-group-label">{group}</span>}
            {children.map(child => child.external
              ? <a key={child.to} className="sidebar-child-link" href={child.to} onClick={onNavigate}>{child.label} ↗</a>
              : <Link key={child.to} className={`sidebar-child-link ${childActive(pathname, child.to) ? "active" : ""}`} to={child.to} onClick={onNavigate} aria-current={childActive(pathname, child.to) ? "page" : undefined}>{child.label}</Link>)}
          </div>)}
        </div>}
      </section>;
    })}
  </nav>;
}

function EntityContextNav({ pathname }: { pathname: string }) {
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
      <Link className="surface-link" to={to}>Open {title.toLowerCase()} catalog →</Link>
    </div>
  </section>;
}

function CatalogPage({ eyebrow, title, description, loadState, loadError, stale, refresh, children }: {
  eyebrow: string;
  title: string;
  description: string;
  loadState: DashboardLoadState;
  loadError: string | null;
  stale: boolean;
  refresh: () => void;
  children: ReactNode;
}) {
  return <>
    <header className="page-head compact">
      <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>
      <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadError ? "Retry" : loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
    </header>
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

function UnsupportedActionsPanel({ actions, note }: { actions: readonly CompositionActionView[]; note: string }) {
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

function CompositionFindingRow({ finding }: { finding: CompositionFinding }) {
  return <div className={`finding-row ${finding.severity}`}><span>{finding.severity}</span><div className="finding-content"><code className="mono finding-code">{finding.code}</code><p>{finding.message}</p></div></div>;
}

function FindingSection({ title, meta, findings, emptyMessage }: {
  title: string;
  meta: string;
  findings: readonly CompositionFinding[];
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

function SourceMap({ entries }: { entries: AgentCompositionDetail["effectiveCapabilities"] }) {
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

function ReadinessFindingRow({ finding }: { finding: ReadinessFinding }) {
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

type ReadinessFlag = GlobalReadinessSummary["readinessFlags"][number];

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

function Readiness() {
  const { data: summary, loadState, loadError, stale, refresh } = useOperationalSummary<GlobalReadinessSummary>(
    () => productApi.getGlobalReadinessSummary(),
    "Unable to load readiness from Product API",
    data => data.stale,
  );

  const cardState = (count: number | undefined): DashboardCardState => {
    if (!summary && loadState === "loading") return "loading";
    if (!summary && loadState === "error") return "error";
    if (summary && loadState === "refreshing") return "refreshing";
    return count !== undefined && count > 0 ? "ready" : "empty";
  };
  const readyState: DashboardLoadState = summary ? (loadState === "refreshing" ? "refreshing" : "ready") : loadState;
  const flag = (id: string) => summary?.readinessFlags.find(item => item.id === id);
  const checkedAt = summary ? new Date(summary.productApi.checkedAt).toLocaleTimeString() : "--";
  const connectivityTone = summary?.runtime.connectivity === "connected" ? "good" : summary?.runtime.connectivity === "degraded" ? "warn" : "muted";
  const blockerTone = summary && summary.readiness.blockerCount > 0 ? "warn" : "good";

  return <>
    <DomainHeader domain="System" title="Global Readiness & Health" description="Read-only inspection of ACS readiness, blockers, evidence and Product API health." actions={<button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadError ? "Retry" : loadState === "refreshing" ? "Rechecking" : "Recheck"}</button>} />
    <OperationalModeNotice guardrails={summary?.guardrails} />
    {stale && <div className="stale-banner" role="status">Showing a stale readiness snapshot. Recheck to recover live state.</div>}
    {loadState === "refreshing" && <div className="refresh-banner" role="status">Rechecking readiness and health...</div>}
    {loadError && <div className="error-banner" role="alert">{loadError}</div>}
    <div className="dashboard-grid readiness-grid">
      <DashboardCard title="Product API health" meta="Boundary and inspection mode" state={readyState}>
        <div className="summary-list">
          <SummaryRow label="Service" value={summary?.productApi.service ?? "--"} />
          <SummaryRow label="Status" value={summary?.productApi.status ?? "--"} tone="good" />
          <SummaryRow label="Mode" value={summary?.productApi.mode ?? "--"} />
          <SummaryRow label="Automation" value={summary?.productApi.automation ?? "--"} />
          <SummaryRow label="Access" value="read-only" />
          <SummaryRow label="Check mode" value={summary?.productApi.checkMode ?? "--"} />
          <SummaryRow label="Checked" value={checkedAt} />
        </div>
      </DashboardCard>
      <DashboardCard title="System dashboard" meta="Operational blockers and warnings" state={readyState}>
        <div className="summary-list">
          <SummaryRow label="Readiness" value={summary?.readiness.status ?? "--"} tone={blockerTone} />
          <SummaryRow label="Blockers" value={summary?.readiness.blockerCount ?? 0} tone={blockerTone} />
          <SummaryRow label="Warnings" value={summary?.readiness.warningCount ?? 0} />
          <SummaryRow label="Evidence domains" value={summary?.readiness.evidenceCount ?? 0} />
        </div>
        <Link className="surface-link" to="/">Open system dashboard →</Link>
      </DashboardCard>
      <DashboardCard title="Runtime connectivity" meta="Engine probe results" state={cardState(summary?.runtime.engines.length)} emptyMessage="No engines probed">
        <div className="summary-list">
          <SummaryRow label="Connectivity" value={summary?.runtime.connectivity ?? "--"} tone={connectivityTone} />
          <SummaryRow label="Engines" value={summary?.runtime.engines.length ?? 0} />
          <SummaryRow label="Checked" value={summary ? new Date(summary.runtime.checkedAt).toLocaleTimeString() : "--"} />
        </div>
        {summary && summary.runtime.engines.length > 0 && <div className="engine-list">{summary.runtime.engines.map(engine => <span key={engine.id}><i />{engine.id}<code>{engine.status}</code></span>)}</div>}
      </DashboardCard>
      <ReadinessFlagCard title="DEV readiness" meta="Local control plane capability" flag={flag("dev")} state={readyState} />
      <ReadinessFlagCard title="Distributed Runtime readiness" meta="Engine and target capability" flag={flag("distributed-runtime")} state={readyState} />
      <ReadinessFlagCard title="Production readiness" meta="Production blockers and evidence" flag={flag("production")} state={readyState} />
    </div>
    <div className="dashboard-grid readiness-grid">
      <DashboardCard title="Health indicators" meta="Live Product API health signals" state={cardState(summary?.healthIndicators.length)} emptyMessage="No health indicators available">
        <div className="health-list">
          {summary?.healthIndicators.map(indicator => <div className="health-row" key={indicator.id}><div><b>{indicator.label}</b><small>{indicator.detail}</small></div><ReadinessStatus status={indicator.status} /></div>)}
        </div>
      </DashboardCard>
      <DashboardCard title="Component status" meta="Consolidated domain readiness" state={cardState(summary?.components.length)} emptyMessage="No component status available">
        <div className="component-list">
          {summary?.components.map(component => <div className="component-row" key={component.domain}><div><b>{component.domain}</b><small>{component.currentState}</small></div><ReadinessStatus status={component.status} /></div>)}
        </div>
      </DashboardCard>
      <DashboardCard title="Snapshot consistency" meta="Refresh and stale-state contract" state={readyState}>
        <div className="summary-list">
          <SummaryRow label="State" value={stale ? "Stale" : "Fresh"} tone={stale ? "warn" : "good"} />
          <SummaryRow label="Refresh window" value={`${summary?.refreshWindowMs ?? 0}ms`} />
          <SummaryRow label="Snapshot age" value={`${summary?.stateAgeMs ?? 0}ms`} />
          <SummaryRow label="Read-only" value="Guaranteed" tone="good" />
        </div>
      </DashboardCard>
      <DashboardCard title="Readiness blockers" meta="Production-blocking findings" state={cardState(summary?.blockers.length)} emptyMessage="No readiness blockers">
        <div className="finding-list">{summary?.blockers.map(finding => <ReadinessFindingRow key={`${finding.domain}-${finding.component}`} finding={finding} />)}</div>
      </DashboardCard>
      <DashboardCard title="Operational warnings" meta="Non-blocking readiness findings" state={cardState(summary?.warnings.length)} emptyMessage="No operational warnings">
        <div className="finding-list">{summary?.warnings.map(finding => <ReadinessFindingRow key={`${finding.domain}-${finding.component}-${finding.reason}`} finding={finding} />)}</div>
      </DashboardCard>
      <DashboardCard title="Readiness evidence" meta="Domain evidence used for status" state={cardState(summary?.evidence.length)} emptyMessage="No readiness evidence available">
        <div className="evidence-list">
          {summary?.evidence.map(domain => <details className="evidence-item" key={domain.domain}><summary><b>{domain.domain}</b><ReadinessStatus status={domain.status} /></summary><p>{domain.currentState}</p><ul>{domain.evidence.map(path => <li key={path} className="mono">{path}</li>)}</ul></details>)}
        </div>
      </DashboardCard>
    </div>
  </>;
}

function CustomerDashboard() {
  const dashboard = useOperationalSummary<DashboardSummary>(
    () => productApi.getDashboardSummary(),
    "Unable to load the customer dashboard from Product API",
    data => data.system.stale,
  );
  const economics = useOperationalSummary<EconomicSummary>(
    () => productApi.getEconomicSummary(),
    "Unable to load financial activity",
    data => data.checkedAt < Date.now() - 60_000,
  );
  const activity = useOperationalSummary<EventRecord[]>(
    () => productApi.listEvents(),
    "Unable to load recent activity",
    records => records.some(record => record.createdAt < Date.now() - 24 * 60 * 60_000),
  );

  const summary = dashboard.data;
  const operationalBlockers = (summary?.blockers ?? []).filter(finding => finding.category === "operational");
  const operationalWarnings = (summary?.warnings ?? []).filter(finding => finding.category === "operational" && finding.code !== "INSPECTION_MODE");
  const attention = [...operationalBlockers, ...operationalWarnings].slice(0, 5);
  const failedOperations = (summary?.executionRuns.failed ?? 0) + (summary?.deployments.failed ?? 0) + (summary?.deployments.rejected ?? 0);
  const unavailableWorkers = (summary?.workers.degraded ?? 0) + (summary?.workers.unavailable ?? 0) + (summary?.workers.stale ?? 0);
  const health = !summary
    ? "UNAVAILABLE"
    : operationalBlockers.length > 0 || failedOperations > 0
      ? "DEGRADED"
      : attention.length > 0 || unavailableWorkers > 0
        ? "ATTENTION"
        : "HEALTHY";
  const completionTotal = (summary?.executionRuns.completed ?? 0) + (summary?.executionRuns.failed ?? 0) + (summary?.executionRuns.cancelled ?? 0);
  const successRate = completionTotal > 0 ? Math.round(((summary?.executionRuns.completed ?? 0) / completionTotal) * 100) : null;
  const economicValue = (value: string | number | undefined, unit?: string) => value === undefined || value === null || value === "" ? "No data" : `${value}${unit ? ` ${unit}` : ""}`;
  const rootState: DashboardLoadState = summary ? (dashboard.loadState === "refreshing" ? "refreshing" : "ready") : dashboard.loadState;
  const events = [...(activity.data ?? [])].sort((left, right) => right.createdAt - left.createdAt).slice(0, 6);
  const agentProgress = summary && summary.agents.total > 0 ? (summary.agents.active / summary.agents.total) * 100 : 0;
  const workerProgress = summary && summary.workers.total > 0 ? (summary.workers.available / summary.workers.total) * 100 : 0;
  const executionProgress = summary && summary.executionRuns.total > 0 ? (summary.executionRuns.completed / summary.executionRuns.total) * 100 : 0;
  const executionLifecycle = [
    { label: "Completed", value: summary?.executionRuns.completed ?? 0, tone: "completed" },
    { label: "Running", value: summary?.executionRuns.running ?? 0, tone: "running" },
    { label: "Failed", value: summary?.executionRuns.failed ?? 0, tone: "failed" },
    { label: "Pending", value: (summary?.executionRuns.pending ?? 0) + (summary?.executionRuns.cancelled ?? 0), tone: "pending" },
  ];
  const maxExecutionLifecycle = Math.max(...executionLifecycle.map(item => item.value), 1);
  const economicStages = [
    { label: "Estimated", value: Number(economics.data?.totalEstimated ?? 0), display: economicValue(economics.data?.totalEstimated, economics.data?.unit) },
    { label: "Reserved", value: Number(economics.data?.totalReserved ?? 0), display: economicValue(economics.data?.totalReserved, economics.data?.unit) },
    { label: "Metered", value: Number(economics.data?.totalMetered ?? 0), display: economicValue(economics.data?.totalMetered, economics.data?.unit) },
    { label: "Settled", value: Number(economics.data?.totalSettled ?? 0), display: economicValue(economics.data?.totalSettled, economics.data?.unit) },
  ];
  const maxEconomicValue = Math.max(...economicStages.map(stage => Number.isFinite(stage.value) ? stage.value : 0), 1);
  const serviceRows = [
    { label: "Control Plane", status: summary?.system.status === "ok" ? "healthy" : "unavailable" },
    { label: "Runtime", status: summary?.runtime.connectivity ?? "unavailable" },
    { label: "Workers", status: (summary?.workers.available ?? 0) > 0 ? "available" : (summary?.workers.total ?? 0) > 0 ? "degraded" : "unavailable" },
    { label: "Deployments", status: (summary?.deployments.failed ?? 0) > 0 ? "degraded" : "healthy" },
  ];

  return <div className="dashboard-canvas">
    <DomainHeader domain="Dashboard" title="Welcome back, Operator" description="Here is what is happening across your ACS environment." actions={<button className="secondary" disabled={dashboard.loadState === "loading" || dashboard.loadState === "refreshing"} onClick={() => { dashboard.refresh(); economics.refresh(); activity.refresh(); }}>{dashboard.loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>} />
    {dashboard.stale && <div className="stale-banner" role="status">Showing a stale operational snapshot. Refresh to recover live state.</div>}
    {dashboard.loadError && <div className="error-banner" role="alert">{dashboard.loadError}</div>}

    <section className={`dashboard-health dashboard-health-${health.toLowerCase()}`} aria-labelledby="dashboard-health-title">
      <span className="dashboard-health-icon" aria-hidden="true">{health === "HEALTHY" ? <ShieldCheck size={25} weight="fill" /> : health === "UNAVAILABLE" ? <Pulse size={25} weight="bold" /> : <WarningOctagon size={25} weight="fill" />}</span>
      <div className="dashboard-health-copy"><span className="dashboard-eyebrow">Overall health</span><h2 id="dashboard-health-title">{health}</h2><p>{health === "HEALTHY" ? "Core operational signals are healthy." : health === "ATTENTION" ? "Operational signals need review; no critical customer-impacting failure is active." : health === "DEGRADED" ? "A customer-impacting execution, deployment or worker condition needs action." : "Operational health is unavailable until the Product API responds."}</p></div>
      <div className="dashboard-health-meta"><span>Environment <b>{summary?.activeProfile.activeProfile ?? "unavailable"}</b></span><span>Last checked <b>{summary ? new Date(summary.system.checkedAt).toLocaleTimeString() : "--"}</b></span></div>
    </section>

    <div className="dashboard-kpis" aria-label="Key operational indicators">
      <DashboardMetric label="Active Agents" value={summary?.agents.active ?? "--"} context={summary ? `${summary.agents.total} total agents` : "Loading current inventory"} action="View Agents" to="/agents" icon={<Robot size={25} weight="fill" />} accent="agents" progress={agentProgress} />
      <DashboardMetric label="Executions" value={summary?.executionRuns.total ?? "--"} context={summary ? `${summary.executionRuns.running} running now` : "Loading execution state"} action="View Executions" to="/executions" icon={<PlayCircle size={25} weight="fill" />} accent="executions" progress={executionProgress} />
      <DashboardMetric label="Active Customers" value="—" context="Tenant count is not exposed by the current read model" action="Tenant Administration" to={productApiConfig.tenantAdministrationUrl} icon={<UsersThree size={25} weight="fill" />} accent="customers" progress={null} />
      <DashboardMetric label="Usage" value={economicValue(economics.data?.totalMetered, economics.data?.unit)} context={economics.loadError ? "Financial data unavailable" : "Current operational metering"} action="View Financial Operations" to="/economics" icon={<CurrencyDollar size={25} weight="fill" />} accent="usage" progress={null} />
      <DashboardMetric label="Workers" value={summary?.workers.available ?? "--"} context={summary ? `${summary.workers.availableSlots} open slots` : "Loading worker capacity"} action="View Workers" to="/workers" icon={<HardDrives size={25} weight="fill" />} accent="workers" progress={workerProgress} />
      <DashboardMetric label="Requires Attention" value={attention.length} context={`${operationalBlockers.length} critical operational findings`} action="Review Operations" to="/operations" icon={<WarningOctagon size={25} weight="fill" />} accent="attention" progress={Math.min(100, (attention.length / 5) * 100)} />
    </div>

    <div className="dashboard-cockpit-grid">
      <CockpitPanel title="Execution Activity" meta="Current execution lifecycle distribution" state={rootState} className="cockpit-execution" accent="executions" action={<Link className="cockpit-action" to="/executions">View all<ArrowRight size={13} weight="bold" /></Link>}>
        <div className="execution-chart" role="img" aria-label={`${summary?.executionRuns.completed ?? 0} completed, ${summary?.executionRuns.running ?? 0} running, ${summary?.executionRuns.failed ?? 0} failed and ${(summary?.executionRuns.pending ?? 0) + (summary?.executionRuns.cancelled ?? 0)} pending or other executions`}>
          <div className="execution-chart-grid" aria-hidden="true"><i /><i /><i /><i /></div>
          <div className="execution-chart-bars">
            {executionLifecycle.map(item => <div className="execution-chart-column" key={item.label}><span className={`execution-chart-bar ${item.tone}${item.value === 0 ? " is-zero" : ""}`} style={{ height: `${item.value === 0 ? 8 : Math.max(20, (item.value / maxExecutionLifecycle) * 100)}%` }}><b>{item.value}</b></span><small>{item.label}</small></div>)}
          </div>
          {(summary?.executionRuns.total ?? 0) === 0 && <div className="chart-empty-copy"><ChartLineUp size={24} weight="duotone" /><b>No execution activity</b><span>The visualization will populate from authoritative execution history.</span></div>}
        </div>
        <div className="execution-legend compact">{executionLifecycle.map(item => <span key={item.label}><i className={item.tone} />{item.label}<b>{item.value}</b></span>)}</div>
      </CockpitPanel>

      <CockpitPanel title="Execution Success" meta="Completed outcomes in the current snapshot" state={rootState} className="cockpit-success" accent="success">
        <div className="success-visual">
          <div className={`success-orbit${successRate === null ? " is-empty" : ""}`}><ChartDonut size={94} weight="duotone" aria-hidden="true" /><div><strong>{successRate === null ? "—" : `${successRate}%`}</strong><span>{successRate === null ? "No data" : "Success"}</span></div></div>
          <div className="success-breakdown"><span><i className="completed" />Success <b>{summary?.executionRuns.completed ?? 0}</b></span><span><i className="failed" />Failed <b>{summary?.executionRuns.failed ?? 0}</b></span><span><i className="pending" />Cancelled <b>{summary?.executionRuns.cancelled ?? 0}</b></span></div>
        </div>
        <p className="visual-footnote">{successRate === null ? "No completed execution outcomes are available yet." : `${summary?.executionRuns.completed ?? 0} of ${completionTotal} completed outcomes succeeded.`}</p>
      </CockpitPanel>

      <CockpitPanel title="Requires Attention" meta="Actionable operational conditions" state={rootState} className="cockpit-attention" accent="attention" action={<span className="attention-count">{attention.length}</span>}>
        {attention.length === 0 ? <div className="attention-empty"><CheckCircle size={42} weight="duotone" /><b>No operational issues require action</b><span>Customer-impacting signals will appear here.</span></div> : <div className="attention-list">{attention.map(finding => <Link to={finding.domain === "worker" ? "/workers" : finding.domain === "execution" ? "/executions" : finding.domain === "deployment" ? "/operational-execution" : "/operations"} key={`${finding.code}-${finding.message}`} className={`attention-item ${finding.severity}`}><span className="attention-icon" aria-hidden="true">{finding.severity === "error" ? <XCircle size={19} weight="fill" /> : <WarningOctagon size={19} weight="fill" />}</span><span><b>{finding.domain}</b>{finding.message}</span><ArrowRight size={14} weight="bold" aria-hidden="true" /></Link>)}</div>}
      </CockpitPanel>

      <CockpitPanel title="Agent & Worker Health" meta="Lifecycle and availability from authoritative inventories" state={rootState} className="cockpit-agent-health" accent="agents">
        <div className="health-visuals">
          <div className="health-visual-block"><div className="health-visual-primary"><span className="health-visual-icon"><Robot size={30} weight="duotone" /></span><div><small>Active Agents</small><strong>{summary?.agents.active ?? 0}<em>/ {summary?.agents.total ?? 0}</em></strong></div></div><progress max="100" value={agentProgress} aria-label={`${Math.round(agentProgress)} percent of agents active`} /><div className="health-visual-legend"><span><i className="completed" />Active {summary?.agents.active ?? 0}</span><span><i className="pending" />Other {(summary?.agents.draft ?? 0) + (summary?.agents.disabled ?? 0) + (summary?.agents.archived ?? 0)}</span></div></div>
          <div className="health-visual-block"><div className="health-visual-primary"><span className="health-visual-icon worker"><HardDrives size={30} weight="duotone" /></span><div><small>Available Workers</small><strong>{summary?.workers.available ?? 0}<em>/ {summary?.workers.total ?? 0}</em></strong></div></div><progress max="100" value={workerProgress} aria-label={`${Math.round(workerProgress)} percent of workers available`} /><div className="health-visual-legend"><span><i className="completed" />Available {summary?.workers.available ?? 0}</span><span><i className="failed" />Unavailable {unavailableWorkers}</span></div></div>
        </div>
      </CockpitPanel>

      <CockpitPanel title="Financial Activity" meta="Existing operational economics" state={economics.data ? "ready" : economics.loadState === "error" ? "error" : economics.loadState} className="cockpit-financial" accent="usage" action={<Link className="cockpit-action" to="/economics">View usage<ArrowRight size={13} weight="bold" /></Link>}>
        <div className="financial-visual" role="img" aria-label={economicStages.map(stage => `${stage.label} ${stage.display}`).join(", ")}>
          <div className="financial-bars" aria-hidden="true">{economicStages.map(stage => <div key={stage.label}><span style={{ height: `${stage.value > 0 && Number.isFinite(stage.value) ? Math.max(18, (stage.value / maxEconomicValue) * 100) : 8}%` }} className={stage.value > 0 ? "" : "is-zero"} /><small>{stage.label}</small></div>)}</div>
          <div className="financial-values">{economicStages.map(stage => <span key={stage.label}><small>{stage.label}</small><b>{stage.display}</b></span>)}</div>
          {economicStages.every(stage => !Number.isFinite(stage.value) || stage.value === 0) && <div className="financial-zero"><Wallet size={24} weight="duotone" /><span>No economic movement in the current snapshot</span></div>}
        </div>
        <p className="visual-footnote">Reconciliation and exception workflows remain DEFERRED_TO_EPIC16.</p>
      </CockpitPanel>

      <CockpitPanel title="Service Health" meta="Customer-relevant service availability" state={rootState} className="cockpit-services" accent="success" action={<Link className="cockpit-action" to="/operations">View all<ArrowRight size={13} weight="bold" /></Link>}>
        <div className="service-health visual">{serviceRows.map(service => { const healthy = /healthy|available|connected/.test(service.status); const warning = /degraded|partial/.test(service.status); return <div key={service.label}><span className={`service-icon ${healthy ? "healthy" : warning ? "warning" : "error"}`}>{healthy ? <CheckCircle size={18} weight="fill" /> : warning ? <Gauge size={18} weight="fill" /> : <XCircle size={18} weight="fill" />}</span><span>{service.label}</span><Status status={service.status} /></div>; })}</div>
      </CockpitPanel>

      <CockpitPanel title="Recent Activity" meta="Latest operational events" state={activity.loadState === "error" ? "error" : activity.loadState} className="cockpit-recent" accent="info" action={<Link className="cockpit-action" to="/operational-evidence">View all activity<ArrowRight size={13} weight="bold" /></Link>}>
        {events.length === 0 ? <div className="recent-empty"><ClockCountdown size={34} weight="duotone" /><b>No recent activity</b><span>Authoritative events will appear here as they occur.</span></div> : <div className="recent-activity-table" role="table" aria-label="Recent operational activity"><div className="recent-activity-head" role="row"><span>Time</span><span>Event</span><span>Detail</span><span>Status</span></div>{events.map(event => <article key={event.eventId} role="row"><time dateTime={new Date(event.createdAt).toISOString()}>{new Date(event.createdAt).toLocaleTimeString()}</time><b>{event.type}</b><span>{event.message}</span><FindingSeverity severity={event.severity === "critical" ? "error" : event.severity} /></article>)}</div>}
      </CockpitPanel>

      <CockpitPanel title="Quick Access" meta="Supported ACS workflows" state="ready" className="cockpit-quick" accent="info">
        <div className="quick-access visual"><Link to="/agents/new"><span><Robot size={23} weight="duotone" /></span><b>Create Agent</b></Link><Link to="/operational-execution"><span><RocketLaunch size={23} weight="duotone" /></span><b>Plan Execution</b></Link><a href={productApiConfig.tenantAdministrationUrl}><span><UserPlus size={23} weight="duotone" /></span><b>Add Tenant</b></a><Link to="/economics"><span><ChartBar size={23} weight="duotone" /></span><b>View Usage</b></Link><Link to="/economics"><span><Wallet size={23} weight="duotone" /></span><b>Reservations</b></Link><Link to="/economics"><span><CurrencyDollar size={23} weight="duotone" /></span><b>Settlements</b></Link><Link to="/administration"><span><ShieldCheck size={23} weight="duotone" /></span><b>Providers</b></Link><Link to="/operations"><span><Wrench size={23} weight="duotone" /></span><b>Operations</b></Link></div>
      </CockpitPanel>
    </div>

    {(summary?.globalCaveats.length ?? 0) > 0 && <aside className="administration-advisory"><div><b>System configuration has advisory notices</b><span>Global certification caveats are tracked separately from current customer health.</span></div><Link to="/administration">View Administration Overview →</Link></aside>}
  </div>;
}

function AdministrationOverview() {
  const { data: summary, loadState, loadError, stale, refresh } = useOperationalSummary<DashboardSummary>(
    () => productApi.getDashboardSummary(),
    "Unable to load dashboard summary from Product API",
    data => data.system.stale,
  );

  const cardState = (count: number | undefined): DashboardCardState => {
    if (!summary && loadState === "loading") return "loading";
    if (!summary && loadState === "error") return "error";
    if (summary && loadState === "refreshing") return "refreshing";
    return count !== undefined && count > 0 ? "ready" : "empty";
  };

  const readyState: DashboardLoadState = summary ? (loadState === "refreshing" ? "refreshing" : "ready") : loadState;
  const generatedAt = summary ? new Date(summary.system.generatedAt).toLocaleTimeString() : "--";
  const checkedAt = summary ? new Date(summary.system.checkedAt).toLocaleTimeString() : "--";
  const connectivityTone = summary?.runtime.connectivity === "connected" ? "good" : summary?.runtime.connectivity === "degraded" ? "warn" : "muted";
  const readinessTone = summary && summary.readiness.blockerCount > 0 ? "warn" : "good";
  const profileTone = summary?.activeProfile.status === "development_profile" ? "muted" : summary?.activeProfile.status === "blocked" ? "warn" : "good";

  return <>
    <DomainHeader domain="Administration" title="Administration Overview" description="Environment profile, active composition, readiness, certified capabilities and global certification boundaries." actions={<button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadError ? "Retry" : loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>} />
    <div className="review-flow" aria-label="Administration review journey">
      <span>Environment</span><span>Composition</span><span>Readiness</span><span>Capabilities</span><span>Global caveats</span>
    </div>
    <OperationalModeNotice guardrails={summary?.system.guardrails} />
    {stale && <div className="stale-banner" role="status">Showing a stale dashboard snapshot. Refresh to recover live state.</div>}
    {loadState === "refreshing" && <div className="refresh-banner" role="status">Refreshing dashboard and readiness...</div>}
    {loadError && <div className="error-banner" role="alert">{loadError}</div>}
    <div className="dashboard-grid">
      <DashboardCard title="Active environment" meta="Current process profile and expected readiness" state={readyState}>
        <div className="summary-list">
          <SummaryRow label="Profile" value={summary?.activeProfile.activeProfile ?? "unavailable"} tone={profileTone} />
          <SummaryRow label="Expectation" value={summary?.activeProfile.expectedReadiness ?? "unavailable"} tone={profileTone} />
          <SummaryRow label="Status" value={summary?.activeProfile.status ?? "unavailable"} tone={profileTone} />
        </div>
        <p className="panel-note">{summary?.activeProfile.message ?? "No active profile was reported."}</p>
      </DashboardCard>
      <DashboardCard title="Attention" meta="Blockers and warnings requiring review" state={readyState}>
        <div className="summary-list">
          <SummaryRow label="Readiness" value={summary?.readiness.state ?? "unknown"} tone={readinessTone} />
          <SummaryRow label="Blockers" value={summary?.readiness.blockerCount ?? "unavailable"} tone={readinessTone} />
          <SummaryRow label="Warnings" value={summary?.readiness.warningCount ?? "unavailable"} />
          <SummaryRow label="Critical findings" value={summary?.blockers.length ?? "unavailable"} tone={(summary?.blockers.length ?? 0) > 0 ? "warn" : "muted"} />
        </div>
        <CrossLinks links={[{ to: "/readiness", label: "Inspect readiness evidence" }, { to: "/operational-execution", label: "Inspect operations" }, { to: "/agents", label: "Inspect affected agents" }]} />
      </DashboardCard>
      <DashboardCard title="Critical blockers" meta="Failures against the active profile expectation" state={cardState(summary?.blockers.length)} emptyMessage="No critical blockers reported for the active profile">
        <div className="finding-list">{summary?.blockers.map(finding => <FindingRow key={`${finding.code}-${finding.message}`} finding={finding} />)}</div>
      </DashboardCard>
      <DashboardCard title="Active composition" meta="Truthful local process configuration" state={readyState}>
        <div className="summary-list">
          <SummaryRow label="Identity" value={summary?.activeComposition.identity ?? "unavailable"} />
          <SummaryRow label="Secrets" value={summary?.activeComposition.secrets ?? "unavailable"} />
          <SummaryRow label="Persistence" value={summary?.activeComposition.persistence ?? "unavailable"} />
          <SummaryRow label="Telemetry" value={summary?.activeComposition.telemetry ?? "unavailable"} />
          <SummaryRow label="Workers" value={summary?.activeComposition.workers ?? "unavailable"} />
          <SummaryRow label="Deployment" value={summary?.activeComposition.deployment ?? "unavailable"} />
        </div>
      </DashboardCard>
      <DashboardCard title="Operational warnings" meta="Non-blocking operational signals and development characteristics" state={cardState(summary?.warnings.filter(finding => finding.category !== "global-caveat").length)} emptyMessage="No operational warnings reported">
        <div className="finding-list">{summary?.warnings.filter(finding => finding.category !== "global-caveat").map(finding => <FindingRow key={`${finding.code}-${finding.message}`} finding={finding} />)}</div>
      </DashboardCard>
      <DashboardCard title="Certified platform capability" meta="Available for documented certified topologies; not necessarily active locally" state={cardState(summary?.certifiedCapabilities.length)} emptyMessage="No certified capability projection reported">
        <div className="finding-list">
          {summary?.certifiedCapabilities.map(capability => <div className="finding-row info" key={capability.id}><FindingSeverity severity="info" /><p><b>{capability.label}</b> — {capability.status} · {capability.topology}<small>{capability.detail}</small></p></div>)}
        </div>
      </DashboardCard>
      <DashboardCard title="Global caveats" meta="Limits on global claims, not active local errors" state={cardState(summary?.globalCaveats.length)} emptyMessage="No global caveats reported">
        <div className="finding-list">{summary?.globalCaveats.map(finding => <FindingRow key={`${finding.code}-${finding.message}`} finding={finding} />)}</div>
      </DashboardCard>
      <DashboardCard title="System context" meta="Product API boundary and freshness" state={readyState}>
        <div className="summary-list">
          <SummaryRow label="Service" value={summary?.system.service ?? "unavailable"} />
          <SummaryRow label="Product API status" value={summary?.system.status ?? "unavailable"} />
          <SummaryRow label="Mode" value={summary?.system.mode ?? "unavailable"} />
          <SummaryRow label="Access" value="read-only inspection" />
          <SummaryRow label="Generated" value={generatedAt} />
          <SummaryRow label="Checked" value={checkedAt} />
          <SummaryRow label="Snapshot" value={stale ? "stale" : "current snapshot"} tone={stale ? "warn" : "muted"} />
        </div>
      </DashboardCard>
      <DashboardCard title="Readiness vs connectivity" meta="These dimensions remain separate" state={readyState}>
        <div className="summary-list">
          <SummaryRow label="Readiness" value={summary?.readiness.state ?? "unknown"} tone={readinessTone} />
          <SummaryRow label="Runtime connectivity" value={summary?.runtime.connectivity ?? "unavailable"} tone={connectivityTone} />
          <SummaryRow label="Evidence domains" value={summary?.readiness.evidenceCount ?? "unavailable"} />
        </div>
        <p className="panel-note">Connected does not mean ready. Ready does not mean healthy. Each label is taken from its Product API field.</p>
        <Link className="surface-link" to="/readiness">Open global readiness →</Link>
      </DashboardCard>
      <DashboardCard title="Agent inventory" meta="Lifecycle counts, not health claims" state={cardState(summary?.agents.total)} emptyMessage="No agents registered">
        <div className="summary-list">
          <SummaryRow label="Total" value={summary?.agents.total ?? 0} />
          <SummaryRow label="Active lifecycle" value={summary?.agents.active ?? 0} />
          <SummaryRow label="Draft" value={summary?.agents.draft ?? 0} />
          <SummaryRow label="Disabled" value={summary?.agents.disabled ?? 0} />
          <SummaryRow label="Archived" value={summary?.agents.archived ?? 0} tone="muted" />
        </div>
        <Link className="surface-link" to="/agents">Open Agents →</Link>
      </DashboardCard>
      <DashboardCard title="Operations snapshot" meta="Deployment, runtime and execution counts" state={cardState((summary?.deployments.total ?? 0) + (summary?.runtimes.total ?? 0) + (summary?.executionRuns.total ?? 0))} emptyMessage="No operational records">
        <div className="summary-list">
          <SummaryRow label="Deployed" value={summary?.deployments.deployed ?? 0} />
          <SummaryRow label="Runtimes running" value={summary?.runtimes.running ?? 0} />
          <SummaryRow label="Execution runs running" value={summary?.executionRuns.running ?? 0} />
          <SummaryRow label="Failed runs" value={summary?.executionRuns.failed ?? 0} tone={(summary?.executionRuns.failed ?? 0) > 0 ? "warn" : "muted"} />
        </div>
        <Link className="surface-link" to="/operational-execution">Open Operations →</Link>
      </DashboardCard>
    </div>
  </>;
}

function AgentCard({ agent }: { agent: AgentListItem }) {
  return <article className={`agent-card inventory-card ${agent.archived ? "archived" : ""}`}>
    <div className="card-title">
      <span className={`avatar ${agent.archived ? "gray" : ""}`}>{agent.name.slice(0, 2).toUpperCase()}</span>
      <div><h2>{agent.name}</h2><p className="mono">{agent.agentId} · {agent.environment}</p></div>
      <div className="card-badges"><Status status={agent.status} />{agent.archived && <Badge tone="muted">archived</Badge>}</div>
    </div>
    <div className="card-specs">
      <span>Revision<b className="mono">r{agent.currentRevisionId}</b></span>
      <span>Readiness<b><ReadinessBadge summary={agent.readinessSummary} /></b></span>
      <span>Deployment<b>{agent.deploymentSummary.state}</b></span>
      <span>Runtime<b>{agent.runtimeSummary.state}</b></span>
    </div>
    <div className="cap-row">
      <span>{agent.compositionSummary.ready ? "composition ready" : `composition blocked (${agent.compositionSummary.errorCount} errors)`}</span>
      <span>{agent.readinessSummary.blockerCount} blockers</span>
      <span>{agent.readinessSummary.warningCount} warnings</span>
    </div>
    <div className="card-actions">
      <Link className="secondary action-link" to={`/agents/${agent.agentId}`}>Open agent</Link>
      <span className="checked-at">checked {new Date(agent.checkedAt).toLocaleTimeString()}</span>
    </div>
  </article>;
}

function AgentInventory() {
  const { data: agents, loadState, loadError, stale, refresh } = useOperationalSummary<AgentListItem[]>(
    () => productApi.listAgents(),
    "Unable to load agents from Product API",
    list => list.some(agent => agent.checkedAt < Date.now() - 60_000),
  );
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<"name" | "updatedAt" | "status">("name");

  const query = q.trim().toLowerCase();
  const filtered = (agents ?? [])
    .filter(agent =>
      (!query || agent.name.toLowerCase().includes(query) || agent.agentId.toLowerCase().includes(query))
      && (status === "all" || agent.status === status))
    .sort((left, right) =>
      sort === "updatedAt"
        ? right.updatedAt - left.updatedAt
        : sort === "status"
          ? left.status.localeCompare(right.status)
          : left.name.localeCompare(right.name));

  return <>
    <DomainHeader domain="Agents" title="Agent Inventory" description="Search, review and manage governed agents across lifecycle, readiness, deployment and runtime." actions={
      <>
        <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadError ? "Retry" : loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
        <Link className="primary action-link" to="/agents/new">＋ Create agent</Link>
      </>
    } />
    <div className="guardrail-banner compact" role="note"><span>Sandbox · Inspection mode</span></div>
    {stale && <div className="stale-banner" role="status">Showing a stale agent snapshot. Refresh to recover live state.</div>}
    {loadState === "refreshing" && <div className="refresh-banner" role="status">Refreshing agents...</div>}
    {loadError && <div className="error-banner" role="alert">{loadError}</div>}
    <div className="toolbar agents-toolbar">
      <label className="search">⌕<input value={q} onChange={e => setQ(e.target.value)} placeholder="Search agents by name or id..." /></label>
      <select className="filter select-filter" value={status} onChange={e => setStatus(e.target.value)} aria-label="Filter by status">
        <option value="all">All statuses</option>
        <option value="draft">Draft</option>
        <option value="active">Active</option>
        <option value="disabled">Disabled</option>
        <option value="archived">Archived</option>
      </select>
      <select className="filter select-filter" value={sort} onChange={e => setSort(e.target.value as "name" | "updatedAt" | "status")} aria-label="Sort agents">
        <option value="name">Sort: name</option>
        <option value="updatedAt">Sort: updated</option>
        <option value="status">Sort: status</option>
      </select>
      <span className="env-chip">environment: sandbox</span>
    </div>
    {loadState === "loading" && !agents && <div className="loading-screen">Loading agents...</div>}
    {loadState === "error" && !agents && <section className="panel"><div className="empty-state">Unable to load agents. Check Product API connectivity and retry.</div></section>}
    {agents && agents.length === 0 && <section className="panel"><div className="empty-state">No agents registered yet. <Link className="surface-link" to="/agents/new">Create the first agent →</Link></div></section>}
    {agents && agents.length > 0 && filtered.length === 0 && <section className="panel"><div className="empty-state">No agents match your search or filters.</div></section>}
    {filtered.length > 0 && <section className="agent-cards inventory-grid">{filtered.map(agent => <AgentCard key={agent.agentId} agent={agent} />)}</section>}
  </>;
}

function useAgentSurface(agentId: string) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [data, setData] = useState<{
    detail: AgentDetail;
    revisions: AgentRevisionSummary[];
    lifecycle: AgentLifecycleStateView;
  } | null>(null);
  const [loadState, setLoadState] = useState<DashboardLoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const hasDataRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    setLoadState(hasDataRef.current ? "refreshing" : "loading");
    Promise.all([
      productApi.getAgent(agentId),
      productApi.getAgentRevisions(agentId),
      productApi.getAgentLifecycle(agentId),
    ])
      .then(([detail, revisions, lifecycle]) => {
        if (!cancelled) {
          hasDataRef.current = true;
          setData({ detail, revisions, lifecycle });
          setStale(detail.stale);
          setLoadState("ready");
        }
      })
      .catch(error => {
        if (!cancelled) {
          if (hasDataRef.current) {
            setStale(true);
            setLoadState("ready");
            setLoadError("Refresh failed; keeping previous agent data");
          } else {
            setLoadError(apiErrorMessage(error));
            setLoadState("error");
          }
        }
      });
    return () => {
      cancelled = true;
    };
  }, [agentId, refreshKey]);

  return {
    data,
    loadState,
    loadError,
    stale,
    refresh: () => setRefreshKey(k => k + 1),
  };
}

function OperationalExecution() {
  const credentials = useOperationalSummary<CredentialSummary[]>(
    () => productApi.listCredentials(),
    "Unable to load credentials",
    () => false,
  );
  const connections = useOperationalSummary<ProviderConnectionSummary[]>(
    () => productApi.listProviderConnections(),
    "Unable to load provider connections",
    () => false,
  );
  const readiness = useOperationalSummary<AgentReadinessDetail>(
    async () => {
      const agents = await productApi.listAgents();
      const agent = agents.find(item => !item.archived) ?? agents[0];
      if (!agent) throw new Error("No agent available for readiness planning context");
      return productApi.getAgentReadiness(agent.agentId);
    },
    "Unable to load operational readiness",
    data => data.stale,
  );
  const plans = useOperationalSummary<[DeploymentPlan | null, ExecutionPlan | null]>(
    async () => {
      const agents = await productApi.listAgents();
      const agent = agents.find(item => !item.archived) ?? agents[0];
      if (!agent) return [null, null];
      return [await productApi.getAgentDeploymentPlan(agent.agentId), await productApi.getAgentExecutionPlan(agent.agentId)];
    },
    "Unable to load deployment planning",
    () => false,
  );
  const deployments = useOperationalSummary<DeploymentSummary[]>(
    () => productApi.listDeployments(),
    "Unable to load deployments",
    () => false,
  );
  const runtimes = useOperationalSummary<RuntimeSummary[]>(
    () => productApi.listRuntimes(),
    "Unable to load runtimes",
    () => false,
  );
  const runs = useOperationalSummary<ExecutionRunSummary[]>(
    () => productApi.listExecutionRuns(),
    "Unable to load execution runs",
    () => false,
  );
  const workers = useOperationalSummary<WorkerSummary[]>(
    () => productApi.listWorkers(),
    "Unable to load workers",
    () => false,
  );

  const refreshAll = () => {
    credentials.refresh();
    connections.refresh();
    readiness.refresh();
    plans.refresh();
    deployments.refresh();
    runtimes.refresh();
    runs.refresh();
    workers.refresh();
  };

  return <>
    <DomainHeader domain="Operations" title="Governed execution surface" description="Read-only operational projections from the Product API. No raw secrets or direct runtime access." entityLabel={readiness.data ? `Planning context: ${readiness.data.agentId ?? readiness.data.agentName}` : "Aggregate operations"} actions={<button className="secondary" onClick={refreshAll}>Refresh all</button>} />
    <OperationalModeNotice guardrails={credentials.data?.[0]?.guardrails ?? connections.data?.[0]?.guardrails} />
    {staleBanner(credentials, "credentials")}
    <SectionDisclosure title="Access & connections" summary="Secondary visibility for credentials and provider connectivity; never primary operational state." tier="Secondary" defaultOpen>
    <div className="flow-group">
      <div className="flow-group-head"><h2>Access & connections</h2><p>Credentials and provider connections — redacted references only, never secret material.</p></div>
      <div className="dashboard-grid execution-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Credentials</h2><p>Redacted secret references and validation state</p></div><Badge tone={credentials.data?.length ? "good" : "muted"}>{credentials.data?.length ?? 0}</Badge></div>
          <div className="panel-body">
            {credentials.data?.length
              ? credentials.data.map(item => <div className="catalog-row" key={item.credentialId}><div className="catalog-row-main"><b>{item.providerName}</b><small className="mono">{item.credentialId}</small><p>{item.secretRefRedacted} · {item.status} · validated={String(item.validated)}</p></div><Badge tone={item.validated ? "good" : "warn"}>{item.validated ? "validated" : "unvalidated"}</Badge></div>)
              : <PanelStateLine state={credentials.loadState} error={credentials.loadError} emptyMessage="No credentials reported" />}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Provider connections</h2><p>Health and authentication state</p></div><Badge tone={connections.data?.length ? "good" : "muted"}>{connections.data?.length ?? 0}</Badge></div>
          <div className="panel-body">
            {connections.data?.length
              ? connections.data.map(item => <div className="catalog-row" key={item.connectionId}><div className="catalog-row-main"><b>{item.providerName}</b><small className="mono">{item.connectionId}</small><p>{item.health} · {item.authState} · {item.availability}</p></div><Badge tone={item.health === "healthy" ? "good" : item.health === "degraded" ? "warn" : "muted"}>{item.health}</Badge></div>)
              : <PanelStateLine state={connections.loadState} error={connections.loadError} emptyMessage="No provider connections reported" />}
          </div>
        </section>
      </div>
    </div>
    </SectionDisclosure>
    <div className="flow-group">
      <div className="flow-group-head"><h2>Readiness & planning</h2><p>Operational readiness and deployment previews for the selected planning context — Product API is the source of truth.</p></div>
      <div className="dashboard-grid execution-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Operational readiness</h2><p>Readiness categories and blockers</p></div><Badge tone={readiness.data?.ready ? "good" : "warn"}>{readiness.data?.status ?? "unavailable"}</Badge></div>
          <div className="panel-body">
            {readiness.data
              ? <>
                <SummaryRow label="Agent" value={readiness.data.agentName} />
                <SummaryRow label="Blockers" value={readiness.data.blockers.length} />
                <SummaryRow label="Warnings" value={readiness.data.warnings.length} />
                {readiness.data.categories.map(category => <div className="finding-row" key={category.id}><span>{category.status}</span><div className="finding-content"><b>{category.label}</b><p>{category.blockerCount} blockers · {category.warningCount} warnings</p></div></div>)}
              </>
              : <PanelStateLine state={readiness.loadState} error={readiness.loadError} emptyMessage="No readiness data for the current planning context" />}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Deployment plan</h2><p>Preview only, governed by Product API</p></div><Badge tone={plans.data?.[0]?.eligible ? "good" : "muted"}>{plans.data?.[0]?.eligible ? "eligible" : "preview"}</Badge></div>
          <div className="panel-body">
            {plans.data?.[0]
              ? <><SummaryRow label="Plan" value={plans.data[0].planId} /><SummaryRow label="Target" value={plans.data[0].target} /><SummaryRow label="Engine" value={plans.data[0].engine} /><SummaryRow label="Eligible" value={String(plans.data[0].eligible)} /><SummaryRow label="Blockers" value={plans.data[0].blockers.length} /></>
              : <PanelStateLine state={plans.loadState} error={plans.loadError} emptyMessage="No deployment plan available" />}
          </div>
        </section>
      </div>
    </div>
    <SectionDisclosure title="Deployments, runtimes & execution history" summary="Diagnostic operational records stay reachable without dominating the entry surface." tier="Diagnostic" defaultOpen>
    <div className="flow-group">
      <div className="flow-group-head"><h2>Deployments & runtimes</h2><p>Deployment records, runtime instances and execution runs. Runtime control actions are not exposed in this milestone.</p></div>
      <div className="dashboard-grid execution-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Deployments</h2><p>Sandbox deployment inventory</p></div><Badge tone={deployments.data?.length ? "good" : "muted"}>{deployments.data?.length ?? 0}</Badge></div>
          <div className="panel-body">
            {deployments.data?.length
              ? deployments.data.map(item => <div className="catalog-row" key={item.deploymentId}><div className="catalog-row-main"><b>{item.deploymentId}</b><small>{item.status} · {item.engine} · {item.target}</small></div><div className="catalog-badges"><Badge tone={item.active ? "good" : "muted"}>{item.active ? "active" : "inactive"}</Badge><Link className="detail-link" to={`/agents/${item.agentId}`}>agent</Link></div></div>)
              : <PanelStateLine state={deployments.loadState} error={deployments.loadError} emptyMessage="No deployments recorded" />}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Runtimes</h2><p>Runtime inventory, health and reconciliation</p></div><Badge tone={runtimes.data?.length ? "good" : "muted"}>{runtimes.data?.length ?? 0}</Badge></div>
          <div className="panel-body">
            {runtimes.data?.length
              ? runtimes.data.map(item => <div className="catalog-row" key={item.runtimeId}><div className="catalog-row-main"><b>{item.runtimeId}</b><small>{item.status} · {item.health} · {item.target}</small><p>reconciliation: {item.reconciliationState} · isolation: {item.isolationState} · drift: {item.driftState}</p></div><div className="catalog-badges"><Badge tone={item.health === "healthy" ? "good" : item.health === "degraded" ? "warn" : "muted"}>{item.health}</Badge><Link className="detail-link" to={`/agents/${item.agentId}`}>agent</Link></div></div>)
              : <PanelStateLine state={runtimes.loadState} error={runtimes.loadError} emptyMessage="No runtime instances" />}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Execution runs</h2><p>ExecutionRun history — recent first</p></div><Badge tone={runs.data?.length ? "good" : "muted"}>{runs.data?.length ?? 0}</Badge></div>
          <div className="panel-body">
            {runs.data?.length
              ? runs.data.slice(0, 8).map(item => <div className="catalog-row" key={item.runId}><div className="catalog-row-main"><b>{item.runId}</b><small>{item.status} · runtime {item.runtimeId}</small><p>{item.resultSummary ?? item.failureReason ?? "n/a"}</p></div><span className="catalog-count">{new Date(item.startedAt).toLocaleTimeString()}</span></div>)
              : <PanelStateLine state={runs.loadState} error={runs.loadError} emptyMessage="No execution runs recorded" />}
          </div>
        </section>
      </div>
    </div>
    </SectionDisclosure>
    <SectionDisclosure title="Workers & raw operational identifiers" summary="Expert investigation details and low-level inventory." tier="Raw">
    <div className="flow-group">
      <div className="flow-group-head"><h2>Workers</h2><p>Worker capacity, health and isolation visibility. Advanced fleet scheduling is future scope.</p></div>
      <div className="dashboard-grid execution-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Workers</h2><p>Capacity, health and workload visibility</p></div><Badge tone={workers.data?.length ? "good" : "muted"}>{workers.data?.length ?? 0}</Badge></div>
          <div className="panel-body">
            {workers.data?.length
              ? workers.data.map(item => <div className="catalog-row" key={item.workerId}><div className="catalog-row-main"><b>{item.workerId}</b><small>{item.status} · {item.health} · capacity {item.availableCapacity}/{item.capacity}</small><p>failure: {item.failureState} · reconciliation: {item.reconciliationState} · tenant isolation: {item.tenantIsolation ? "yes" : "no"} · workload isolation: {item.workloadIsolation ? "yes" : "no"}</p></div><Badge tone={item.health === "healthy" ? "good" : item.health === "degraded" ? "warn" : "muted"}>{item.reconciliationState}</Badge></div>)
              : <PanelStateLine state={workers.loadState} error={workers.loadError} emptyMessage="No workers registered" />}
          </div>
        </section>
        <UnsupportedPanel title="Worker operations" note="Fleet controls in this milestone" reason="Worker registration, autoscaling and advanced fleet scheduling are future scope. Worker state is displayed from the Product API and is never mutated from this surface." />
      </div>
    </div>
    <div className="flow-group-note">Every block above is a read-only projection. Deployment, runtime, worker and readiness truth stays in the Product API — nothing here is recomputed by the UI.</div>
    </SectionDisclosure>
  </>;
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

function OperationResultBox({ result }: { result: AgentOperationResult }) {
  return <div className={`operation-result ${result.ok ? "ok" : "failed"}`} role="status">
    <div className="operation-result-head"><b>{result.ok ? "Operation succeeded" : "Operation failed"}</b><code className="mono">{result.operation}</code></div>
    <p>{result.message}</p>
    <dl className="config-list">
      <div><dt>Entity</dt><dd className="mono">{result.entityId}</dd></div>
      <div><dt>Status</dt><dd>{result.status}</dd></div>
      <div><dt>Audit ref</dt><dd className="mono">{result.auditRef ?? "—"}</dd></div>
      <div><dt>Checked at</dt><dd><Time value={result.checkedAt} /></dd></div>
    </dl>
    {result.warnings.length > 0 && <div className="warning-banner">{result.warnings.join("; ")}</div>}
    {result.errors.length > 0 && <div className="error-banner">{result.errors.join("; ")}</div>}
  </div>;
}

function AgentDetail() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const { data, loadState, loadError, stale, refresh } = useAgentSurface(agentId ?? "");
  const [confirming, setConfirming] = useState<AgentLifecycleActionView | null>(null);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateAgentId, setDuplicateAgentId] = useState("");
  const [duplicateName, setDuplicateName] = useState("");
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<AgentLifecycleActionName | null>(null);
  const [operationResult, setOperationResult] = useState<AgentOperationResult | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);

  if (!agentId) return <Navigate to="/agents" replace />;

  const detail = data?.detail ?? null;

  async function runDirectAction(action: AgentLifecycleActionView) {
    if (!detail) return;
    setSubmitting(action.action);
    setOperationError(null);
    setOperationResult(null);
    try {
      let result: AgentOperationResult;
      if (action.action === "archive") {
        result = await productApi.archiveAgent(detail.agentId);
      } else if (action.action === "restore") {
        result = await productApi.restoreAgent(detail.agentId);
      } else if (action.action === "delete") {
        result = await productApi.deleteAgent(detail.agentId);
      } else {
        return;
      }
      setOperationResult(result);
      refresh();
    } catch (error) {
      setOperationError(apiErrorMessage(error));
    } finally {
      setSubmitting(null);
    }
  }

  async function handleRevisionAction(action: "adopt" | "restore", revision: AgentRevisionSummary) {
    if (!detail) return;
    setSubmitting(action === "adopt" ? "adoptRevision" : "restoreRevision");
    setOperationError(null);
    setOperationResult(null);
    try {
      const result = action === "adopt"
        ? await productApi.adoptAgentRevision(detail.agentId, revision.revisionId)
        : await productApi.restoreAgentRevision(detail.agentId, revision.revisionId);
      setOperationResult(result);
      refresh();
    } catch (error) {
      setOperationError(apiErrorMessage(error));
    } finally {
      setSubmitting(null);
    }
  }

  async function handleDuplicate() {
    if (!detail) return;
    setSubmitting("duplicate");
    setDuplicateError(null);
    setOperationError(null);
    setOperationResult(null);
    try {
      const input: AgentDuplicateInput = { newAgentId: duplicateAgentId.trim() };
      if (duplicateName.trim()) input.name = duplicateName.trim();
      const result = await productApi.duplicateAgent(detail.agentId, input);
      setOperationResult(result);
      setDuplicateOpen(false);
      setDuplicateAgentId("");
      setDuplicateName("");
      refresh();
    } catch (error) {
      setDuplicateError(apiErrorMessage(error));
    } finally {
      setSubmitting(null);
    }
  }

  function handleActionClick(action: AgentLifecycleActionView) {
    if (!detail) return;
    if (action.action === "update") {
      navigate(`/agents/${detail.agentId}/edit`);
      return;
    }
    if (action.action === "createRevision") {
      navigate(`/agents/${detail.agentId}/edit?mode=revision`);
      return;
    }
    if (action.action === "adoptRevision" || action.action === "restoreRevision") {
      document.getElementById("revisions")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (action.action === "duplicate") {
      setDuplicateOpen(true);
      return;
    }
    if (action.action === "archive" || action.action === "delete") {
      setConfirming(action);
      return;
    }
    void runDirectAction(action);
  }

  if (loadState === "loading" && !detail) return <div className="loading-screen">Loading agent...</div>;
  if (loadState === "error" && !detail) return <>
    <Link className="back" to="/agents">← Agents</Link>
    <section className="panel"><div className="empty-state">{loadError ?? "Agent not found"}</div></section>
  </>;
  if (!detail || !data) return <div className="empty-state">Agent not found</div>;

  const definition = detail.agentDefinition;
  const lifecycle = detail.lifecycleState;
  const currentDetail = detail;
  const revisions = [...data.revisions].sort((left, right) => right.revisionNumber - left.revisionNumber);
  const recentHistoricalRevisions = revisions.filter(revision => revision.status !== "current").slice(0, 2);

  function renderNextSafeAction() {
    if (lifecycle.archived) {
      const restore = currentDetail.availableActions.find(action => action.action === "restore");
      return restore?.available
        ? <button className="primary" disabled={submitting !== null} onClick={() => void handleActionClick(restore)}>Restore Agent</button>
        : <Link className="primary action-link" to={`/agents/${currentDetail.agentId}/revisions`}>Review revision history</Link>;
    }
    if (currentDetail.readinessSummary.blockerCount > 0 || currentDetail.readinessSummary.state !== "ready") {
      return <Link className="primary action-link" to={`/agents/${currentDetail.agentId}/validate`}>Validate configuration</Link>;
    }
    return <Link className="primary action-link" to={`/agents/${currentDetail.agentId}/configuration`}>Edit configuration</Link>;
  }

  return <>
    <DomainHeader domain="Agents" title={definition.name} description="Agent lifecycle, readiness and related evidence." entityLabel={`Agent: ${detail.agentId}`} />
    {loadError && <div className="error-banner" role="alert">{loadError}</div>}
    {stale && <div className="stale-banner" role="status">Showing a stale agent snapshot. Refresh to recover live state.</div>}
    {loadState === "refreshing" && <div className="refresh-banner" role="status">Refreshing agent state...</div>}
    <AgentGuardrailBanner guardrails={detail.guardrails} />
    <section className="overview-hero">
      <div>
        <p className="eyebrow">AGENT OVERVIEW</p>
        <div className="title-status"><h2>{definition.name}</h2><Status status={lifecycle.status} /></div>
        <p className="mono">{detail.agentId} · current revision r{detail.currentRevision.revision}</p>
      </div>
      <div className="overview-hero-actions">
        <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
      </div>
    </section>
    <div className="overview-grid">
      <section className="panel overview-primary">
        <div className="panel-head"><div><h2>Current state</h2><p>ACS-owned identity and lifecycle state</p></div><Status status={lifecycle.status} /></div>
        <dl className="config-list">
          <div><dt>Agent ID</dt><dd className="mono">{definition.agentId}</dd></div>
          <div><dt>Lifecycle</dt><dd>{lifecycle.archived ? "Archived" : lifecycle.status}</dd></div>
          <div><dt>Protected</dt><dd>{lifecycle.protected ? "Yes" : "No"}</dd></div>
          {lifecycle.archivedAt !== undefined && <div><dt>Archived at</dt><dd><Time value={lifecycle.archivedAt} /></dd></div>}
          {lifecycle.restoredAt !== undefined && <div><dt>Restored at</dt><dd><Time value={lifecycle.restoredAt} /></dd></div>}
        </dl>
      </section>
      <section className="panel overview-primary">
        <div className="panel-head"><div><h2>Current revision</h2><p>Canonical immutable revision head</p></div><Badge tone="good">CURRENT r{detail.currentRevision.revision}</Badge></div>
        <dl className="config-list">
          <div><dt>Revision</dt><dd className="mono">r{detail.currentRevision.revision}</dd></div>
          <div><dt>Updated</dt><dd><Time value={detail.currentRevision.updatedAt} /></dd></div>
          <div><dt>Changed by</dt><dd>{detail.currentRevision.createdBy ?? "unknown"}</dd></div>
        </dl>
        <div className="panel-actions"><Link className="secondary action-link" to={`/agents/${detail.agentId}/revisions`}>View revision history</Link><Link className="detail-link" to={`/agents/${detail.agentId}/configuration`}>Configuration</Link></div>
      </section>
      <section className="panel overview-primary">
        <div className="panel-head"><div><h2>Readiness</h2><p>Composition and configuration status</p></div><ReadinessBadge summary={detail.readinessSummary} /></div>
        <dl className="config-list">
          <div><dt>State</dt><dd>{detail.readinessSummary.state}</dd></div>
          <div><dt>Blockers</dt><dd>{detail.readinessSummary.blockerCount}</dd></div>
          <div><dt>Warnings</dt><dd>{detail.readinessSummary.warningCount}</dd></div>
        </dl>
        <p className="panel-note">Detailed findings remain in Validate; this summary is not recomputed in the browser.</p>
        <Link className="surface-link" to={`/agents/${detail.agentId}/validate`}>Open Validate →</Link>
      </section>
      <section className="panel overview-primary">
        <div className="panel-head"><div><h2>Next safe action</h2><p>Selected from current lifecycle and readiness state</p></div></div>
        {lifecycle.archived
          ? <p className="panel-note">Archived Agents cannot be edited or receive revisions until restored.</p>
          : detail.readinessSummary.blockerCount > 0 || detail.readinessSummary.state !== "ready"
            ? <p className="panel-note">Review Product API readiness findings before changing operational context.</p>
            : <p className="panel-note">Configuration changes create a new immutable revision and retain the current head until saved.</p>}
        <div className="panel-actions">{renderNextSafeAction()}</div>
      </section>
      <section className="panel overview-secondary">
        <div className="panel-head"><div><h2>Deployment and runtime context</h2><p>Related operational state; distinct from Agent lifecycle</p></div></div>
        <dl className="config-list">
          <div><dt>Deployment</dt><dd>{detail.deploymentSummary.state} · {detail.deploymentSummary.count} records</dd></div>
          <div><dt>Runtime</dt><dd>{detail.runtimeSummary.state} · {detail.runtimeSummary.count} instances</dd></div>
        </dl>
        <p className="panel-note">Operational controls and execution history remain in their canonical global surfaces.</p>
      </section>
      <section className="panel overview-secondary">
        <div className="panel-head"><div><h2>Recent revision context</h2><p>Lineage remains immutable; historical revisions are not editable in place</p></div><Link className="detail-link" to={`/agents/${detail.agentId}/revisions`}>All revisions</Link></div>
        <div className="overview-revision-summary">
          <div><b className="mono">r{detail.currentRevision.revision}</b><Badge tone="good">CURRENT</Badge><small>Updated <Time value={detail.currentRevision.updatedAt} /></small></div>
          {recentHistoricalRevisions.map(revision => <div key={revision.revisionId}>
            <b className="mono">r{revision.revisionNumber}</b><Badge tone="muted">HISTORICAL</Badge>
            <small>Created <Time value={revision.createdAt} /> · read-only record</small>
            <span className="overview-revision-actions">{revision.availableActions.map(action => <button key={action.action} className="secondary" disabled={!action.available || submitting !== null} title={action.reason} onClick={() => void handleRevisionAction(action.action, revision)}>{action.action === "adopt" ? "Adopt" : "Restore"}</button>)}</span>
          </div>)}
        </div>
      </section>
      <section className="panel overview-secondary">
        <div className="panel-head"><div><h2>Governed lifecycle actions</h2><p>Only existing Product API commands are exposed</p></div></div>
        <div className="action-grid overview-action-grid">
          {detail.availableActions.filter(action => ["duplicate", "archive", "restore", "delete"].includes(action.action)).map(action => {
            const destructive = action.action === "archive" || action.action === "delete";
            return <div className={`action-tile ${action.available ? "" : "disabled"} ${destructive ? "destructive" : ""}`} key={action.action}>
              <b>{action.label}</b>
              {action.reason && <small className="action-reason">{action.reason}</small>}
              {action.available
                ? <button className={`secondary ${destructive ? "danger" : ""}`} disabled={submitting !== null} onClick={() => handleActionClick(action)}>{destructive ? `Confirm ${action.action}` : action.action === "duplicate" ? "Duplicate" : "Restore Agent"}</button>
                : <span className="unavailable">Unavailable</span>}
            </div>;
          })}
        </div>
      </section>
      <section className="panel overview-secondary">
        <div className="panel-head"><div><h2>Technical context</h2><p>Provider, model, composition and diagnostics are secondary to Agent identity</p></div><Badge tone="muted">advanced</Badge></div>
        <p className="panel-note">Technical bindings remain available without redefining this Agent by provider, model or runtime.</p>
        <div className="panel-actions"><Link className="secondary action-link" to={`/agents/${detail.agentId}/advanced`}>Open Advanced</Link><Link className="detail-link" to={`/agents/${detail.agentId}/composition`}>Composition detail</Link></div>
      </section>
    </div>
    {duplicateOpen && detail && (
      <section className="panel duplicate-form">
        <div><b>Duplicate {detail.agentId}</b><p className="panel-note">Creates a separate Agent identity through the existing Product API command.</p></div>
        <div className="form">
          <label>New agent ID<input className="mono" value={duplicateAgentId} onChange={e => setDuplicateAgentId(e.target.value)} placeholder="e.g. morpheus-copy" /></label>
          <label>Name (optional)<input value={duplicateName} onChange={e => setDuplicateName(e.target.value)} placeholder={definition.name} /></label>
        </div>
        {duplicateError && <div className="error-banner" role="alert">{duplicateError}</div>}
        <div className="confirm-actions">
          <button className="secondary" onClick={() => { setDuplicateOpen(false); setDuplicateError(null); }}>Cancel</button>
          <button className="primary" disabled={submitting !== null || !duplicateAgentId.trim()} onClick={() => void handleDuplicate()}>Duplicate</button>
        </div>
      </section>
    )}
    {operationResult && <OperationResultBox result={operationResult} />}
    {operationError && <div className="error-banner" role="alert">{operationError}</div>}
    {confirming && (
      <div className="modal-wrap">
        <div className="wizard confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-agent-action-title">
          <div className="wizard-head"><h1 id="confirm-agent-action-title">Confirm {confirming.label}</h1><button aria-label="Close confirmation" onClick={() => setConfirming(null)}>×</button></div>
          <div className="wizard-body">
            <p className="eyebrow">GOVERNED DESTRUCTIVE ACTION</p>
            <p>This operation is governed by the Product API and is recorded in the audit trail. It cannot be undone from this surface.</p>
            {lifecycle.protected && <div className="warning-banner">This agent is protected. The Product API blocks deletion of protected agents.</div>}
            {confirming.action === "delete" && <div className="warning-banner">Deleting permanently removes the archived agent. The Product API validates dependencies before deletion.</div>}
            {confirming.action === "archive" && <div className="warning-banner">Archiving prevents further edits and revisions. You can restore the agent later.</div>}
            <div className="confirm-actions">
              <button className="secondary" onClick={() => setConfirming(null)}>Cancel</button>
              <button className="danger" disabled={submitting !== null} onClick={() => { const action = confirming; setConfirming(null); void runDirectAction(action); }}>{submitting === confirming.action ? "Working..." : `Confirm ${confirming.action}`}</button>
            </div>
          </div>
        </div>
      </div>
    )}
  </>;
}

function AgentLocalHeader({ agentId, title, description }: { agentId: string; title: string; description: string }) {
  return <DomainHeader domain="Agents" title={title} description={description} entityLabel={`Agent: ${agentId}`} />;
}

function AgentConfigurationView() {
  const { agentId } = useParams();
  const surface = useAgentSurface(agentId ?? "");
  if (!agentId) return <Navigate to="/agents" replace />;
  const detail = surface.data?.detail;
  return <>
    <AgentLocalHeader agentId={agentId} title="Configuration" description="Current Agent definition and the existing governed editor." />
    {surface.loadError && <div className="error-banner" role="alert">{surface.loadError}</div>}
    {surface.stale && <div className="stale-banner" role="status">Showing a stale configuration snapshot. Refresh from Agent overview to recover live state.</div>}
    <section className="panel">
      <div className="panel-head"><div><h2>Configuration boundary</h2><p>ACS owns the Agent definition and revision lineage.</p></div><span className="tag">{detail ? `r${detail.currentRevision.revision}` : "loading"}</span></div>
      {surface.loadState === "loading" && !detail
        ? <div className="state-line">Loading current configuration...</div>
        : surface.loadState === "error" && !detail
          ? <div className="state-line error">Unable to load the current configuration.</div>
          : detail
            ? <>
              <dl className="config-list">
                <div><dt>Agent</dt><dd>{detail.agentDefinition.name} <code className="mono">{detail.agentId}</code></dd></div>
                <div><dt>Status</dt><dd>{detail.agentDefinition.status}</dd></div>
                <div><dt>Current revision</dt><dd className="mono">r{detail.currentRevision.revision}</dd></div>
                <div><dt>Composition</dt><dd>{detail.composition ? (detail.composition.ready ? "ready" : "attention") : "unavailable"}</dd></div>
              </dl>
              <div className="panel-actions"><Link className="primary action-link" to={`/agents/${agentId}/edit`}>Open configuration</Link><Link className="secondary action-link" to={`/agents/${agentId}`}>View overview</Link></div>
              <p className="panel-note">Configuration uses the same identity, functional, composition, and advanced hierarchy as Agent creation.</p>
            </>
            : <div className="state-line empty">Agent configuration is unavailable.</div>}
    </section>
  </>;
}

function AgentValidateView() {
  const { agentId } = useParams();
  const surface = useAgentSurface(agentId ?? "");
  if (!agentId) return <Navigate to="/agents" replace />;
  const detail = surface.data?.detail;
  return <>
    <AgentLocalHeader agentId={agentId} title="Validate" description="Composition and readiness validation for this Agent." />
    {surface.loadError && <div className="error-banner" role="alert">{surface.loadError}</div>}
    <div className="guardrail-banner" role="note"><span>Inspection mode</span><span>Sandbox only</span><span>Product API source of truth</span><span>No test or playground execution</span></div>
    <div className="detail-grid">
      <section className="panel">
        <div className="panel-head"><div><h2>Composition validation</h2><p>Existing Agent composition and compatibility surface.</p></div><Badge tone={detail?.composition?.ready ? "good" : "warn"}>{detail?.composition ? (detail.composition.ready ? "ready" : "attention") : "unavailable"}</Badge></div>
        <p className="panel-note">Validate means configuration, composition and readiness validation in this milestone.</p>
        <Link className="primary action-link" to={`/agents/${agentId}/composition`}>Open composition validation</Link>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Readiness validation</h2><p>Current readiness summary from the Agent detail read model.</p></div><ReadinessBadge summary={detail?.readinessSummary ?? { state: "unavailable", blockerCount: 0, warningCount: 0 }} /></div>
        {detail
          ? <dl className="config-list"><div><dt>State</dt><dd>{detail.readinessSummary.state}</dd></div><div><dt>Blockers</dt><dd>{detail.readinessSummary.blockerCount}</dd></div><div><dt>Warnings</dt><dd>{detail.readinessSummary.warningCount}</dd></div></dl>
          : <div className="state-line">Loading readiness...</div>}
        <Link className="surface-link" to="/readiness">Open global readiness evidence →</Link>
      </section>
    </div>
  </>;
}

function AgentRevisionsView() {
  const { agentId } = useParams();
  const surface = useAgentSurface(agentId ?? "");
  if (!agentId) return <Navigate to="/agents" replace />;
  const revisions = surface.data ? [...surface.data.revisions].sort((left, right) => right.revisionNumber - left.revisionNumber) : [];

  return <>
    <AgentLocalHeader agentId={agentId} title="Revisions" description="Immutable Agent revision lineage and canonical current head." />
    {surface.loadError && <div className="error-banner" role="alert">{surface.loadError}</div>}
    <section className="panel">
      <div className="panel-head"><div><h2>Revision history</h2><p>Current is the canonical head. Historical revisions are read-only records.</p></div><Link className="secondary action-link" to={`/agents/${agentId}`}>Open overview</Link></div>
      {surface.loadState === "loading" && !surface.data
        ? <div className="state-line">Loading revisions...</div>
        : revisions.length
          ? <div className="revision-list">{revisions.map(revision => {
            const current = revision.status === "current";
            return <div className={`revision-row ${current ? "current" : "historical"}`} key={revision.revisionId}>
              <div className="revision-main">
                <div className="revision-top"><b className="mono">r{revision.revisionNumber}</b><Badge tone={current ? "good" : "muted"}>{current ? "CURRENT" : "HISTORICAL"}</Badge>{revision.restoredFrom !== undefined && <span className="tag">restored from r{revision.restoredFrom}</span>}</div>
                <small>{current ? "Canonical current revision" : "Historical revision — read-only"} · Created <Time value={revision.createdAt} /></small>
                {revision.adoptedAt !== revision.createdAt && <small>Adopted <Time value={revision.adoptedAt} /></small>}
                {revision.changeSummary && <small>{revision.changeSummary}</small>}
                {revision.compositionHash && <code className="mono hash">{revision.compositionHash}</code>}
              </div>
              <div className="revision-actions">
                {current
                  ? <Link className="secondary action-link" to={`/agents/${agentId}/configuration`}>Edit current</Link>
                  : <span className="action-reason">Historical records cannot be edited directly.</span>}
              </div>
            </div>;
          })}</div>
          : <div className="state-line empty">No revision history is available.</div>}
      <p className="panel-note">Adopt and restore retain immutable history by creating a new current revision through the existing governed API. They remain available from Overview when the backend marks them available; revision comparison is deferred.</p>
    </section>
  </>;
}

function AgentScopedUnsupportedView({ title, description, canonicalPath, canonicalLabel, subject }: { title: string; description: string; canonicalPath: string; canonicalLabel: string; subject: string }) {
  const { agentId } = useParams();
  if (!agentId) return <Navigate to="/agents" replace />;
  return <>
    <AgentLocalHeader agentId={agentId} title={title} description={description} />
    <section className="panel">
      <div className="panel-head"><div><h2>Agent-scoped {subject}</h2><p>The current frontend client has no verified Agent-scoped aggregation for this surface.</p></div><Badge tone="muted">unavailable</Badge></div>
      <div className="state-line empty">Agent-specific {subject.toLowerCase()} are not fabricated from global records. Use the canonical global view and correlate with Agent ID where the Product API provides that reference.</div>
      <div className="panel-actions"><Link className="primary action-link" to={canonicalPath}>Open {canonicalLabel}</Link><Link className="secondary action-link" to={`/agents/${agentId}`}>View Agent overview</Link></div>
    </section>
  </>;
}

function AgentAdvancedView() {
  const { agentId } = useParams();
  const surface = useAgentSurface(agentId ?? "");
  if (!agentId) return <Navigate to="/agents" replace />;
  const detail = surface.data?.detail;
  const definition = detail?.agentDefinition;
  const composition = detail?.composition;

  return <>
    <AgentLocalHeader agentId={agentId} title="Advanced" description="Technical and diagnostic context for this Agent." />
    {surface.loadError && <div className="error-banner" role="alert">{surface.loadError}</div>}
    {surface.loadState === "loading" && !detail
      ? <div className="loading-screen">Loading technical Agent context...</div>
      : detail && definition
        ? <div className="detail-grid">
          <section className="panel">
            <div className="panel-head"><div><h2>Provider and model binding</h2><p>Technical composition, not Agent identity</p></div><Badge tone="muted">technical</Badge></div>
            {definition.modelStrategy
              ? <dl className="config-list">
                <div><dt>Provider</dt><dd className="mono">{definition.modelStrategy.primary.providerId}</dd></div>
                <div><dt>Model</dt><dd className="mono">{definition.modelStrategy.primary.modelId}</dd></div>
                <div><dt>Fallbacks</dt><dd>{definition.modelStrategy.fallbacks.length}</dd></div>
              </dl>
              : <div className="state-line empty">No model strategy is attached to this Agent definition.</div>}
          </section>
          <section className="panel">
            <div className="panel-head"><div><h2>Composition references</h2><p>ACS-owned references used by the current revision</p></div></div>
            <dl className="config-list">
              <div><dt>Role</dt><dd>{definition.roleId ? `${definition.roleId}${definition.roleRevision ? ` (r${definition.roleRevision})` : ""}` : "unassigned"}</dd></div>
              <div><dt>Profile</dt><dd>{definition.profileId ? `${definition.profileId}${definition.profileRevision ? ` (r${definition.profileRevision})` : ""}` : "unassigned"}</dd></div>
              <div><dt>Execution policy</dt><dd>{definition.executionPolicyId ?? "none"}</dd></div>
            </dl>
            <div className="panel-body"><IdList label="Capabilities" ids={definition.capabilityIds} /><IdList label="Skills" ids={definition.skillIds} /><IdList label="Tools" ids={definition.toolIds} /></div>
          </section>
          <section className="panel">
            <div className="panel-head"><div><h2>Credentials and runner preferences</h2><p>References only; secret values are never displayed</p></div></div>
            <div className="panel-body"><IdList label="Credential connections" ids={definition.credentialConnectionIds} /><IdList label="Runner preferences" ids={definition.runnerPreferences} /></div>
          </section>
          <section className="panel">
            <div className="panel-head"><div><h2>Revision and materialization</h2><p>Diagnostic identifiers for the current immutable revision</p></div></div>
            <dl className="config-list">
              <div><dt>Revision fingerprint</dt><dd className="mono hash">{detail.currentRevision.fingerprint}</dd></div>
              <div><dt>Composition fingerprint</dt><dd className="mono hash">{composition?.fingerprint ?? "unavailable"}</dd></div>
              <div><dt>Materialization</dt><dd>{composition?.materialization ? `${composition.materialization.artifactType} · ${composition.materialization.artifactFingerprint}` : "none"}</dd></div>
            </dl>
          </section>
          <section className="panel wide">
            <div className="panel-head"><div><h2>Advanced surfaces</h2><p>Existing detail endpoints preserve canonical ownership.</p></div></div>
            <div className="cross-links">
              <Link className="detail-link" to={`/agents/${agentId}/composition`}>Composition detail →</Link>
              <Link className="detail-link" to={`/agents/${agentId}/validate`}>Readiness validation →</Link>
              <Link className="detail-link" to="/operational-execution">Deployment and execution planning →</Link>
              <Link className="detail-link" to="/runtime">Runtime support →</Link>
              <Link className="detail-link" to="/audit">Audit records →</Link>
            </div>
          </section>
        </div>
        : <section className="panel"><div className="state-line empty">Technical Agent context is unavailable.</div></section>}
  </>;
}

type AgentFormMode = "create" | "edit" | "revision";

function parseList(value: string): string[] {
  return value.split(",").map(item => item.trim()).filter(Boolean);
}

function AgentFormSection({ title, description, tier, open = false, children }: { title: string; description: string; tier: string; open?: boolean; children: ReactNode }) {
  return <details className="disclosure agent-form-section" open={open}>
    <summary>
      <div><b>{title}</b><small>{description}</small></div>
      <span className="disclosure-tier">{tier}</span>
    </summary>
    <div className="disclosure-body">{children}</div>
  </details>;
}

function AgentForm({ mode, agentId }: { mode: AgentFormMode; agentId?: string }) {
  const navigate = useNavigate();
  const [agentIdValue, setAgentIdValue] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<GovernedAgentStatus>("draft");
  const [roleId, setRoleId] = useState("");
  const [profileId, setProfileId] = useState("");
  const [capabilityIds, setCapabilityIds] = useState("");
  const [skillIds, setSkillIds] = useState("");
  const [toolIds, setToolIds] = useState("");
  const [credentialConnectionIds, setCredentialConnectionIds] = useState("");
  const [modelProviderId, setModelProviderId] = useState("");
  const [modelId, setModelId] = useState("");
  const [modelCredentialConnectionId, setModelCredentialConnectionId] = useState("");
  const [runnerPreferences, setRunnerPreferences] = useState("");
  const [loadingDetail, setLoadingDetail] = useState(mode !== "create");
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AgentDetail | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [revisionConflict, setRevisionConflict] = useState(false);
  const prefilled = useRef(false);
  const roles = useOperationalSummary<RoleSummary[]>(() => productApi.listRoles(), "Unable to load roles for Agent form", () => false);
  const profiles = useOperationalSummary<ProfileSummary[]>(() => productApi.listProfiles(), "Unable to load profiles for Agent form", () => false);
  const capabilities = useOperationalSummary<CapabilitySummary[]>(() => productApi.listCapabilities(), "Unable to load capabilities for Agent form", () => false);
  const skills = useOperationalSummary<SkillSummary[]>(() => productApi.listSkills(), "Unable to load skills for Agent form", () => false);
  const tools = useOperationalSummary<ToolSummary[]>(() => productApi.listTools(), "Unable to load tools for Agent form", () => false);
  const providers = useOperationalSummary<ProviderSummary[]>(() => productApi.listProviders(), "Unable to load model providers for Agent form", () => false);
  const models = useOperationalSummary<ModelSummary[]>(() => productApi.listModels(), "Unable to load models for Agent form", () => false);
  const providerConnections = useOperationalSummary<ProviderConnectionSummary[]>(() => productApi.listProviderConnections(), "Unable to load credential references for Agent form", () => false);

  useEffect(() => {
    if (mode !== "create" || modelProviderId || !providers.data?.length) return;
    const provider = providers.data.find(item => item.availability === "available" && item.compatibility === "compatible")
      ?? providers.data.find(item => item.availability === "available")
      ?? providers.data[0];
    if (provider) setModelProviderId(provider.id);
  }, [mode, modelProviderId, providers.data]);

  useEffect(() => {
    if (mode !== "create" || modelId || !modelProviderId || !models.data?.length) return;
    const model = models.data.find(item => item.type === modelProviderId && item.availability === "available")
      ?? models.data.find(item => item.type === modelProviderId);
    if (model) setModelId(model.id.startsWith(`${modelProviderId}/`) ? model.id.slice(modelProviderId.length + 1) : model.id);
  }, [mode, modelId, modelProviderId, models.data]);

  useEffect(() => {
    if (mode === "create" || !agentId || prefilled.current) return;
    productApi.getAgent(agentId)
      .then(next => {
        prefilled.current = true;
        setDetail(next);
        setAgentIdValue(next.agentDefinition.agentId);
        setName(next.agentDefinition.name);
        setStatus(next.agentDefinition.status);
        setRoleId(next.agentDefinition.roleId ?? "");
        setProfileId(next.agentDefinition.profileId ?? "");
        setCapabilityIds(next.agentDefinition.capabilityIds.join(", "));
        setSkillIds(next.agentDefinition.skillIds.join(", "));
        setToolIds(next.agentDefinition.toolIds.join(", "));
        setCredentialConnectionIds(next.agentDefinition.credentialConnectionIds.join(", "));
        setModelProviderId(next.agentDefinition.modelStrategy?.primary.providerId ?? "");
        setModelId(next.agentDefinition.modelStrategy?.primary.modelId ?? "");
        setModelCredentialConnectionId(next.agentDefinition.modelStrategy?.primary.credentialConnectionId ?? "");
        setRunnerPreferences(next.agentDefinition.runnerPreferences.join(", "));
        setLoadingDetail(false);
      })
      .catch(error => {
        setDetailError(apiErrorMessage(error));
        setLoadingDetail(false);
      });
  }, [mode, agentId]);

  function validateForm(): string | null {
    const identifier = agentIdValue.trim();
    if (!identifier) return "Agent ID is required";
    if (identifier.length > 160) return "Agent ID must be at most 160 characters";
    if (!SAFE_IDENTIFIER.test(identifier)) return "Agent ID supports letters, numbers, dots, underscores, colons and dashes only";
    if (!name.trim()) return "Name is required";
    return null;
  }

  function buildDefinition(): AgentDefinition {
    return {
      agentId: agentIdValue.trim(),
      name: name.trim(),
      status,
      capabilityIds: parseList(capabilityIds),
      skillIds: parseList(skillIds),
      toolIds: parseList(toolIds),
      credentialConnectionIds: parseList(credentialConnectionIds),
      runnerPreferences: parseList(runnerPreferences),
      ...(modelProviderId.trim() && modelId.trim() ? {
        modelStrategy: {
          primary: {
            providerId: modelProviderId.trim(),
            modelId: modelId.trim(),
            ...(modelCredentialConnectionId.trim() ? { credentialConnectionId: modelCredentialConnectionId.trim() } : {}),
          },
          fallbacks: [],
        },
      } : {}),
      ...(roleId.trim() ? { roleId: roleId.trim() } : {}),
      ...(profileId.trim() ? { profileId: profileId.trim() } : {}),
    };
  }

  async function handleSubmit() {
    if (submitting) return;
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setSubmitting(true);
    setFormError(null);
    setRevisionConflict(false);
    try {
      const definition = buildDefinition();
      if (mode === "create") {
        const result = await productApi.createAgent({ definition, createdBy: "control-plane-ui" });
        navigate(`/agents/${result.entityId}`);
        return;
      }
      if (!agentId) {
        setFormError("Agent id is missing");
        setSubmitting(false);
        return;
      }
      const expectedRevision = detail?.currentRevision.revision ?? 1;
      if (mode === "revision") {
        await productApi.createAgentRevision(agentId, { definition, expectedRevision, actor: "control-plane-ui" });
      } else {
        await productApi.updateAgent(agentId, { definition, expectedRevision, updatedBy: "control-plane-ui" });
      }
      navigate(`/agents/${agentId}`);
    } catch (error) {
      const conflict = mode !== "create" && isApiConflict(error);
      setRevisionConflict(conflict);
      setFormError(conflict ? "This Agent changed after this configuration was loaded. Reload the current configuration before saving again." : apiErrorMessage(error));
      setSubmitting(false);
    }
  }

  if (loadingDetail) return <div className="loading-screen">Loading agent definition...</div>;
  if (detailError) return <>
    <Link className="back" to={agentId ? `/agents/${agentId}` : "/agents"}>← Back</Link>
    <section className="panel"><div className="empty-state">{detailError}</div></section>
  </>;

  const backTarget = agentId ? `/agents/${agentId}` : "/agents";
  const expectedRevision = detail?.currentRevision.revision ?? 1;
  const selectedConnectionIds = parseList(credentialConnectionIds);
  const connectionOptions = providerConnections.data ?? [];
  const knownConnectionIds = new Set(connectionOptions.map(connection => connection.connectionId));
  const unavailableConnectionIds = selectedConnectionIds.filter(connectionId => !knownConnectionIds.has(connectionId));
  const modelConnectionOptions = modelProviderId ? connectionOptions.filter(connection => connection.providerId === modelProviderId) : connectionOptions;
  const toggleCsv = (current: string, value: string) => {
    const values = parseList(current);
    return values.includes(value) ? values.filter(item => item !== value).join(", ") : [...values, value].join(", ");
  };
  const selectModelCredential = (connectionId: string) => {
    setModelCredentialConnectionId(connectionId);
    if (connectionId && !selectedConnectionIds.includes(connectionId)) setCredentialConnectionIds(toggleCsv(credentialConnectionIds, connectionId));
  };
  const formTitle = mode === "create" ? "Create Agent" : mode === "revision" ? "Create revision" : "Update configuration";
  const formDescription = mode === "create"
    ? "Define Agent identity first. Functional and technical composition choices remain available as you need them."
    : "Update the next immutable Agent revision with the same grouped configuration used during creation.";

  return <>
    <DomainHeader domain="Agents" title={formTitle} description={formDescription} />
    <Link className="back" to={backTarget}>← Back</Link>
    <div className="guardrail-banner compact" role="note"><span>Sandbox · Governed mutation</span></div>
    {mode === "revision" && <div className="info-banner">A new revision is created from this definition. The Product API validates references and governance; readiness is not recomputed in the UI.</div>}
    <section className="panel form-panel agent-form-panel">
      <div className="panel-head"><div><h2>Agent definition</h2><p>Required fields are limited to Agent ID and name. The Product API remains authoritative for catalog, governance, and composition validation.</p></div></div>
      <div className="agent-form-flow" aria-label="Agent configuration flow"><span>Identity</span><ArrowRight size={14} /><span>Functional configuration</span><ArrowRight size={14} /><span>Technical composition</span><ArrowRight size={14} /><span>Review and create</span></div>
      <AgentFormSection title="Identity" description="Establish the ACS-owned Agent identity. Provider, credential, and runtime choices do not belong here." tier="required" open>
        <div className="form">
          <label>Agent ID{mode !== "create" && <small>Read-only — this stable ACS identity cannot be changed by configuration.</small>}<input className="mono" value={agentIdValue} readOnly={mode !== "create"} onChange={e => setAgentIdValue(e.target.value)} placeholder="e.g. research-analyst" /></label>
          <label>Name<input value={name} onChange={e => setName(e.target.value)} placeholder="Agent display name" /><small>The operator-facing name for this Agent.</small></label>
        </div>
        <p className="form-note">Purpose and description are not shown because the current Agent contract has no durable ACS-owned field for either value.</p>
      </AgentFormSection>
      <AgentFormSection title="Functional configuration" description="Choose current Agent-level behavior without exposing provider or credential mechanics first." tier="configuration" open={mode !== "create"}>
        <div className="form">
          <label>Initial lifecycle status<select value={status} onChange={e => setStatus(e.target.value as GovernedAgentStatus)}><option value="draft">draft</option><option value="active">active</option><option value="disabled">disabled</option></select><small>Draft is the default. Product API lifecycle and governance checks remain authoritative.</small></label>
          <fieldset className="catalog-selector"><legend>Capabilities</legend>{capabilities.data?.map(item => <label key={item.capabilityId}><input type="checkbox" checked={parseList(capabilityIds).includes(item.capabilityId)} onChange={() => setCapabilityIds(toggleCsv(capabilityIds, item.capabilityId))} /><span>{item.name}<small>{item.capabilityId}</small></span></label>)}{capabilities.loadError && <small>{capabilities.loadError}</small>}{capabilities.data?.length === 0 && <small>No capabilities are currently available.</small>}</fieldset>
        </div>
      </AgentFormSection>
      <AgentFormSection title="Technical composition" description="Optional runtime implementation choices. These configure how an Agent may run; they do not define the Agent." tier="technical">
        <div className="form">
          <label>Provider<select value={modelProviderId} onChange={event => {
            const nextProvider = event.target.value;
            setModelProviderId(nextProvider);
            const nextModel = models.data?.find(item => item.type === nextProvider && item.availability === "available")
              ?? models.data?.find(item => item.type === nextProvider);
            setModelId(nextModel ? nextModel.id.startsWith(`${nextProvider}/`) ? nextModel.id.slice(nextProvider.length + 1) : nextModel.id : "");
            setModelCredentialConnectionId("");
          }}><option value="">No provider selected</option>{providers.data?.map(provider => <option value={provider.id} key={provider.id}>{provider.name} — {provider.availability}</option>)}</select><small>{providers.loadError ?? "Provider catalog is authoritative. Provider selection is technical composition, not Agent identity."}</small></label>
          <label>Model<select value={modelId} disabled={!modelProviderId} onChange={event => setModelId(event.target.value)}><option value="">No model selected</option>{models.data?.filter(model => model.type === modelProviderId).map(model => {
            const value = model.id.startsWith(`${modelProviderId}/`) ? model.id.slice(modelProviderId.length + 1) : model.id;
            return <option value={value} key={model.id}>{model.name} — {value} ({model.availability})</option>;
          })}</select><small>{models.loadError ?? "Only catalog models for the selected provider are shown."}</small></label>
          <fieldset className="catalog-selector"><legend>Credential references</legend>{connectionOptions.map(connection => <label key={connection.connectionId}><input type="checkbox" checked={selectedConnectionIds.includes(connection.connectionId)} onChange={() => setCredentialConnectionIds(toggleCsv(credentialConnectionIds, connection.connectionId))} /><span>{connection.connectionId}<small>{connection.providerName} · {connection.availability}</small></span></label>)}{unavailableConnectionIds.map(connectionId => <label key={connectionId}><input type="checkbox" checked onChange={() => setCredentialConnectionIds(toggleCsv(credentialConnectionIds, connectionId))} /><span>{connectionId}<small>preserved unavailable reference</small></span></label>)}{providerConnections.loadError && <small>{providerConnections.loadError}</small>}{connectionOptions.length === 0 && !providerConnections.loadError && <small>No credential references are available. <Link to="/credentials">Manage credential references</Link></small>}</fieldset>
          <label>Model credential reference (optional)<select value={modelCredentialConnectionId} onChange={event => selectModelCredential(event.target.value)}><option value="">No model credential selected</option>{modelCredentialConnectionId && !modelConnectionOptions.some(connection => connection.connectionId === modelCredentialConnectionId) && <option value={modelCredentialConnectionId}>{modelCredentialConnectionId} — preserved unavailable reference</option>}{modelConnectionOptions.map(connection => <option value={connection.connectionId} key={connection.connectionId}>{connection.connectionId} — {connection.availability}</option>)}</select><small>The chosen reference is added to the Agent credential connections. Secrets never appear in this form.</small></label>
        </div>
      </AgentFormSection>
      <AgentFormSection title="Advanced" description="Low-frequency composition and diagnostic options. Required configuration is never hidden here." tier="advanced">
        <div className="form">
          <label>Role<select value={roleId} onChange={e => setRoleId(e.target.value)}><option value="">No role selected</option>{roles.data?.map(role => <option value={role.roleId} key={role.roleId}>{role.name} — {role.roleId}</option>)}</select><small>{roles.loadError ?? "Options from the Product API role catalog."}</small></label>
          <label>Profile<select value={profileId} onChange={e => setProfileId(e.target.value)}><option value="">No profile selected</option>{profiles.data?.map(profile => <option value={profile.profileId} key={profile.profileId}>{profile.name} — {profile.profileId}</option>)}</select><small>{profiles.loadError ?? "Options from the Product API profile catalog."}</small></label>
          <fieldset className="catalog-selector"><legend>Skills</legend>{skills.data?.map(item => <label key={item.skillId}><input type="checkbox" checked={parseList(skillIds).includes(item.skillId)} onChange={() => setSkillIds(toggleCsv(skillIds, item.skillId))} /><span>{item.name}<small>{item.skillId}</small></span></label>)}{skills.loadError && <small>{skills.loadError}</small>}</fieldset>
          <fieldset className="catalog-selector"><legend>Tools</legend>{tools.data?.map(item => <label key={item.toolId}><input type="checkbox" checked={parseList(toolIds).includes(item.toolId)} onChange={() => setToolIds(toggleCsv(toolIds, item.toolId))} /><span>{item.name}<small>{item.toolId}</small></span></label>)}{tools.loadError && <small>{tools.loadError}</small>}</fieldset>
          <label>Runner preferences<input className="mono" value={runnerPreferences} onChange={e => setRunnerPreferences(e.target.value)} placeholder="comma-separated runner preference ids" /><small>Existing low-level runner preference identifiers. Leave blank unless an operator has a known supported value.</small></label>
        </div>
      </AgentFormSection>
      <AgentFormSection title={mode === "create" ? "Review and create" : "Review and save"} description="Confirm the current definition before the canonical Product API mutation." tier="review">
        <dl className="config-list form-review-list">
          <div><dt>Agent identity</dt><dd>{name.trim() || "Name required"} <code className="mono">{agentIdValue.trim() || "Agent ID required"}</code></dd></div>
          <div><dt>Lifecycle status</dt><dd>{status}</dd></div>
          <div><dt>Capabilities</dt><dd>{parseList(capabilityIds).length || "None selected"}</dd></div>
          <div><dt>Technical composition</dt><dd>{modelProviderId && modelId ? `${modelProviderId} / ${modelId}` : "No provider/model selected"}</dd></div>
          <div><dt>Credential references</dt><dd>{selectedConnectionIds.length ? `${selectedConnectionIds.length} selected` : "None selected"}</dd></div>
          {mode !== "create" && <div><dt>Revision guard</dt><dd>Save uses expected revision <code className="mono">r{expectedRevision}</code>.</dd></div>}
        </dl>
        <p className="form-note">Form validation checks Agent ID and name. Server-side validation, authorization, governance, composition, and duplicate protection run when the definition is submitted. Validate configuration is available after the Agent exists.</p>
        {mode !== "create" && <Link className="surface-link" to={`/agents/${agentId}/validate`}>Open current Validate surface →</Link>}
      </AgentFormSection>
      {formError && <div className="error-banner" role="alert">{formError}</div>}
      {revisionConflict && agentId && <div className="warning-banner" role="alert">The save was rejected to preserve immutable revision history. <Link to={`/agents/${agentId}/edit`}>Reload current configuration</Link></div>}
      <div className="form-actions">
        <button className="secondary" disabled={submitting} onClick={() => navigate(backTarget)}>Cancel</button>
        <button className="primary" disabled={submitting} onClick={() => void handleSubmit()}>{submitting ? "Saving..." : mode === "create" ? "Create agent" : mode === "revision" ? "Create revision" : "Save changes"}</button>
      </div>
    </section>
  </>;
}

function AgentCreate() {
  return <AgentForm mode="create" />;
}

function AgentEdit() {
  const { agentId } = useParams();
  const [searchParams] = useSearchParams();
  const mode: AgentFormMode = searchParams.get("mode") === "revision" ? "revision" : "edit";
  if (!agentId) return <Navigate to="/agents" replace />;
  return <AgentForm mode={mode} agentId={agentId} />;
}

/* ---------------------------------------------------------------------------
 * Milestone C — Composition surface views
 * ------------------------------------------------------------------------- */

function CompositionOverview() {
  const { data: summary, loadState, loadError, stale, refresh } = useOperationalSummary<CompositionSummary>(
    () => productApi.getCompositionSummary(),
    "Unable to load composition summary from Product API",
    data => data.stale,
  );
  const { data: agents } = useOperationalSummary<AgentListItem[]>(
    () => productApi.listAgents(),
    "Unable to load agents for composition links",
    () => false,
  );

  const cardState = (count: number | undefined): DashboardCardState => {
    if (!summary && loadState === "loading") return "loading";
    if (!summary && loadState === "error") return "error";
    if (summary && loadState === "refreshing") return "refreshing";
    return count !== undefined && count > 0 ? "ready" : "empty";
  };
  const signalCount = (summary?.warningCount ?? 0) + (summary?.missingRequirementCount ?? 0) + (summary?.conflictCount ?? 0);
  const checkedAt = summary ? new Date(summary.checkedAt).toLocaleTimeString() : "--";

  return <>
    <DomainHeader domain="Capabilities" title="Composition" description="Operational summary of the elements that form an Agent, sourced from the Product API." actions={<button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadError ? "Retry" : loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>} />
    <OperationalModeNotice guardrails={summary?.guardrails} />
    {stale && <div className="stale-banner" role="status">Showing a stale composition snapshot. Refresh to recover live state.</div>}
    {loadState === "refreshing" && <div className="refresh-banner" role="status">Refreshing composition...</div>}
    {loadError && <div className="error-banner" role="alert">{loadError}</div>}
    <div className="composition-grid">
      <CompositionCard title="Roles" meta="Role catalog and revisions" count={summary?.roleCount} state={cardState(summary?.roleCount)} to="/roles" />
      <CompositionCard title="Profiles" meta="Profile catalog and OpenClaw state" count={summary?.profileCount} state={cardState(summary?.profileCount)} to="/profiles" />
      <CompositionCard title="Capabilities" meta="Capability registry" count={summary?.capabilityCount} state={cardState(summary?.capabilityCount)} to="/capabilities" />
      <CompositionCard title="Skills" meta="Installed and assigned skills" count={summary?.skillCount} state={cardState(summary?.skillCount)} to="/skills" />
      <CompositionCard title="Tools" meta="Assigned and available tools" count={summary?.toolCount} state={cardState(summary?.toolCount)} to="/plugins" />
      <CompositionCard title="Plugins" meta="Plugin packages and sources" count={summary?.pluginCount} state={cardState(summary?.pluginCount)} to="/plugins" />
      <CompositionCard title="Engines" meta="Engine registry" count={summary?.engineCount} state={cardState(summary?.engineCount)} to="/engines" />
      <CompositionCard title="Providers" meta="Provider registry and credentials" count={summary?.providerCount} state={cardState(summary?.providerCount)} to="/engines" />
      <CompositionCard title="Models" meta="Model catalog" count={summary?.modelCount} state={cardState(summary?.modelCount)} to="/engines" />
    </div>
    <div className="dashboard-grid composition-detail-grid">
      <section className="panel">
        <div className="panel-head"><div><h2>Composition health</h2><p>Operational signals from the Product API</p></div><Badge tone={signalCount > 0 ? "warn" : "good"}>{signalCount > 0 ? "attention" : "clean"}</Badge></div>
        <div className="summary-list card-body">
          <SummaryRow label="Warnings" value={summary?.warningCount ?? 0} tone={(summary?.warningCount ?? 0) > 0 ? "warn" : "good"} />
          <SummaryRow label="Missing requirements" value={summary?.missingRequirementCount ?? 0} tone={(summary?.missingRequirementCount ?? 0) > 0 ? "warn" : "good"} />
          <SummaryRow label="Conflicts" value={summary?.conflictCount ?? 0} tone={(summary?.conflictCount ?? 0) > 0 ? "warn" : "good"} />
          <SummaryRow label="Checked" value={checkedAt} />
        </div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Agent compositions</h2><p>Convergence point for every composition block</p></div></div>
        <div className="panel-body">
          {!agents
            ? <div className="state-line">Loading agent compositions...</div>
            : agents.length === 0
              ? <div className="state-line empty">No agents registered.</div>
              : <div className="agent-composition-links">
                {agents.map(agent => (
                  <Link className="agent-composition-link" to={`/agents/${agent.agentId}/composition`} key={agent.agentId}>
                    <div><b>{agent.name}</b><small className="mono">{agent.agentId}</small></div>
                    <Badge tone={agent.compositionSummary.ready ? "good" : "warn"}>{agent.compositionSummary.ready ? "ready" : `${agent.compositionSummary.errorCount} errors`}</Badge>
                  </Link>
                ))}
              </div>}
        </div>
      </section>
    </div>
  </>;
}

function AgentCompositionView() {
  const { agentId } = useParams();
  if (!agentId) return <Navigate to="/agents" replace />;
  return <AgentCompositionSurface key={agentId} agentId={agentId} />;
}

function AgentCompositionSurface({ agentId }: { agentId: string }) {
  const { data: composition, loadState, loadError, stale, refresh } = useOperationalSummary<AgentCompositionDetail>(
    () => productApi.getAgentComposition(agentId),
    "Unable to load agent composition from Product API",
    data => data.stale,
  );

  if (loadState === "loading" && !composition) return <><Link className="back" to={`/agents/${agentId}`}>← Agent</Link><CatalogLoading message="Loading agent composition..." /></>;
  if (loadState === "error" && !composition) return <><Link className="back" to={`/agents/${agentId}`}>← Agent</Link><CatalogError message={loadError ?? "Agent composition not found"} /></>;
  if (!composition) return <div className="empty-state">Agent composition not found</div>;

  const compat = composition.compatibilitySummary;
  return <>
    <Link className="back" to={`/agents/${agentId}`}>← Agent detail</Link>
    {loadError && <div className="error-banner" role="alert">{loadError}</div>}
    {stale && <div className="stale-banner" role="status">Showing a stale composition snapshot. Refresh to recover live state.</div>}
    {loadState === "refreshing" && <div className="refresh-banner" role="status">Refreshing agent composition...</div>}
    <header className="detail-head">
      <div className="detail-id">
        <div>
          <div className="title-status"><h1>{composition.agentName}</h1><Badge tone={compat.ready ? "good" : "warn"}>{compat.ready ? "compatible" : "attention"}</Badge></div>
          <p className="mono">{composition.agentId} · current revision r{composition.currentRevisionId}</p>
        </div>
      </div>
      <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
    </header>
    <div className="guardrail-banner" role="note"><span>Inspection mode</span><span>Sandbox only</span><span>Read-only</span><span>Composition governed by Product API</span></div>
    <div className="detail-grid">
      <section className="panel">
        <div className="panel-head"><div><h2>Role</h2><p>Active role on this Agent</p></div>{composition.roleSummary && <Badge tone="good">assigned</Badge>}</div>
        <div className="panel-body">
          {composition.roleSummary
            ? <dl className="config-list">
              <div><dt>Role</dt><dd><Link className="surface-link" to={`/roles/${composition.roleSummary.roleId}`}>{composition.roleSummary.name}</Link></dd></div>
              <div><dt>Role ID</dt><dd className="mono">{composition.roleSummary.roleId}</dd></div>
              <div><dt>Revision</dt><dd className="mono">r{composition.roleSummary.revision}</dd></div>
              <div><dt>Status</dt><dd><Status status={composition.roleSummary.status} /></dd></div>
            </dl>
            : <div className="state-line empty">No role assigned to this Agent.</div>}
        </div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Profile</h2><p>Active profile on this Agent</p></div>{composition.profileSummary && <Badge tone="good">assigned</Badge>}</div>
        <div className="panel-body">
          {composition.profileSummary
            ? <dl className="config-list">
              <div><dt>Profile</dt><dd><Link className="surface-link" to={`/profiles/${composition.profileSummary.profileId}`}>{composition.profileSummary.name}</Link></dd></div>
              <div><dt>Profile ID</dt><dd className="mono">{composition.profileSummary.profileId}</dd></div>
              <div><dt>Revision</dt><dd className="mono">r{composition.profileSummary.revision}</dd></div>
              <div><dt>OpenClaw compatible</dt><dd>{composition.profileSummary.openClawCompatible ? "Yes" : "No"}</dd></div>
              <div><dt>Legacy profile visible</dt><dd>{composition.profileSummary.legacyProfileVisible ? "Yes" : "No"}</dd></div>
            </dl>
            : <div className="state-line empty">No profile assigned to this Agent.</div>}
        </div>
      </section>
      <section className="panel wide">
        <div className="panel-head"><div><h2>Effective capabilities</h2><p>Capability source map from the Product API — never recomputed in the UI</p></div><Badge tone="good">{composition.effectiveCapabilities.length}</Badge></div>
        <div className="panel-body"><SourceMap entries={composition.effectiveCapabilities} /></div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Skills</h2><p>Assigned and available skills</p></div><Badge tone={composition.skills.length > 0 ? "good" : "muted"}>{composition.skills.length}</Badge></div>
        <div className="panel-body">
          {composition.skills.length === 0
            ? <div className="state-line empty">No skills on this Agent.</div>
            : <div className="catalog-list compact">
              {composition.skills.map(skill => (
                <Link className="catalog-row" to={`/skills/${skill.skillId}`} key={skill.skillId}>
                  <div className="catalog-row-main"><b>{skill.name}</b><small className="mono">{skill.skillId}</small></div>
                  <div className="catalog-badges">
                    {skill.assigned && <Badge tone="good">assigned</Badge>}
                    {skill.installed && <Badge tone="good">installed</Badge>}
                    <Badge tone={skill.compatibility === "compatible" ? "good" : "warn"}>{skill.compatibility}</Badge>
                  </div>
                </Link>
              ))}
            </div>}
        </div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Tools</h2><p>Assigned and available tools</p></div><Badge tone={composition.tools.length > 0 ? "good" : "muted"}>{composition.tools.length}</Badge></div>
        <div className="panel-body">
          {composition.tools.length === 0
            ? <div className="state-line empty">No tools on this Agent.</div>
            : <div className="catalog-list compact">
              {composition.tools.map(tool => (
                <Link className="catalog-row" to={`/tools/${tool.toolId}`} key={tool.toolId}>
                  <div className="catalog-row-main"><b>{tool.name}</b><small className="mono">{tool.toolId}</small></div>
                  <div className="catalog-badges">
                    {tool.assigned && <Badge tone="good">assigned</Badge>}
                    <Badge tone={tool.availability === "available" ? "good" : "warn"}>{tool.availability}</Badge>
                  </div>
                </Link>
              ))}
            </div>}
        </div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Plugins</h2><p>Plugin state on this Agent</p></div><Badge tone={composition.plugins.length > 0 ? "good" : "muted"}>{composition.plugins.length}</Badge></div>
        <div className="panel-body">
          {composition.plugins.length === 0
            ? <div className="state-line empty">No plugins on this Agent. Plugin installations are not supported in this milestone.</div>
            : <div className="catalog-list compact">
              {composition.plugins.map(plugin => (
                <div className="catalog-row" key={plugin.pluginId}>
                  <div className="catalog-row-main"><b>{plugin.name}</b><small className="mono">{plugin.pluginId}</small></div>
                  <div className="catalog-badges">
                    {plugin.installed && <Badge tone="good">installed</Badge>}
                    {plugin.failureState !== "none" && <Badge tone="warn">failure</Badge>}
                    <Badge tone={plugin.compatibility === "compatible" ? "good" : "warn"}>{plugin.compatibility}</Badge>
                  </div>
                </div>
              ))}
            </div>}
        </div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Engine / Provider / Model</h2><p>Selected composition references</p></div>{composition.engine && <Badge tone="good">selected</Badge>}</div>
        <div className="panel-body">
          <dl className="config-list">
            <div><dt>Engine</dt><dd>{composition.engine ? <Link className="surface-link" to={`/engines/${composition.engine.id}`}>{composition.engine.name}</Link> : "none"}</dd></div>
            <div><dt>Provider</dt><dd>{composition.provider ? <Link className="surface-link" to={`/providers/${composition.provider.id}`}>{composition.provider.name}</Link> : "none"}</dd></div>
            <div><dt>Model</dt><dd className="mono">{composition.model ? composition.model.id : "none"}</dd></div>
          </dl>
          <p className="panel-note">Selection actions are governed by the Product API and are not supported in this milestone.</p>
        </div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Compatibility summary</h2><p>From the Product API — never recomputed in the UI</p></div><Badge tone={compat.ready ? "good" : "warn"}>{compat.ready ? "ready" : "not ready"}</Badge></div>
        <dl className="config-list">
          <div><dt>Missing requirements</dt><dd>{compat.missingRequirements.length}</dd></div>
          <div><dt>Conflicts</dt><dd>{compat.conflicts.length}</dd></div>
          <div><dt>Warnings</dt><dd>{compat.warnings.length}</dd></div>
          <div><dt>Checked</dt><dd><Time value={compat.checkedAt} /></dd></div>
        </dl>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Readiness summary</h2><p>Reference only — readiness truth stays in the Product API</p></div><ReadinessBadge summary={composition.readinessSummary} /></div>
        <dl className="config-list">
          <div><dt>State</dt><dd>{composition.readinessSummary.state}</dd></div>
          <div><dt>Blockers</dt><dd>{composition.readinessSummary.blockerCount}</dd></div>
          <div><dt>Warnings</dt><dd>{composition.readinessSummary.warningCount}</dd></div>
        </dl>
      </section>
      <FindingSection title="Missing requirements" meta="Required but absent composition elements" findings={composition.missingRequirements} emptyMessage="No missing requirements reported." />
      <FindingSection title="Conflicts" meta="Incompatible or conflicting composition elements" findings={composition.conflicts} emptyMessage="No conflicts reported." />
      <FindingSection title="Compatibility warnings" meta="Non-blocking compatibility findings" findings={compat.warnings} emptyMessage="No compatibility warnings reported." />
      <UnsupportedActionsPanel actions={composition.availableActions} note="Composition mutations on this Agent" />
    </div>
  </>;
}

function RoleCatalog() {
  const { data: roles, loadState, loadError, stale, refresh } = useOperationalSummary<RoleSummary[]>(
    () => productApi.listRoles(),
    "Unable to load roles from Product API",
    () => false,
  );
  return <CatalogPage eyebrow="ROLE & PROFILE COMPOSITION" title="Roles" description="Role catalog with capabilities, revisions and usage from the Product API." loadState={loadState} loadError={loadError} stale={stale} refresh={refresh}>
    {loadState === "loading" && !roles && <CatalogLoading message="Loading roles..." />}
    {loadState === "error" && !roles && <CatalogError message={loadError ?? "Unable to load roles"} />}
    {roles && roles.length === 0 && <section className="panel"><div className="empty-state">No roles registered in the Product API.</div></section>}
    {roles && roles.length > 0 && <section className="catalog-list">
      {roles.map(role => (
        <Link className="catalog-row" to={`/roles/${role.roleId}`} key={role.roleId}>
          <div className="catalog-row-main"><b>{role.name}</b><small className="mono">{role.roleId}</small><p>{role.description}</p></div>
          <div className="catalog-badges">
            <Status status={role.status} />
            <span className="tag mono">r{role.revision}</span>
            <span className="catalog-count">{role.capabilities.length} capabilities</span>
            <span className="catalog-count">{role.usageCount} agents</span>
          </div>
        </Link>
      ))}
    </section>}
  </CatalogPage>;
}

function RoleDetail() {
  const { roleId } = useParams();
  if (!roleId) return <Navigate to="/roles" replace />;
  return <RoleDetailSurface key={roleId} roleId={roleId} />;
}

function RoleDetailSurface({ roleId }: { roleId: string }) {
  const { data: role, loadState, loadError, stale, refresh } = useOperationalSummary<RoleSummary>(
    () => productApi.getRoleDetail(roleId),
    "Unable to load role from Product API",
    () => false,
  );
  if (loadState === "loading" && !role) return <><Link className="back" to="/roles">← Roles</Link><CatalogLoading message="Loading role..." /></>;
  if (loadState === "error" && !role) return <><Link className="back" to="/roles">← Roles</Link><CatalogError message={loadError ?? "Role not found"} /></>;
  if (!role) return <div className="empty-state">Role not found</div>;
  return <>
    <Link className="back" to="/roles">← Roles</Link>
    {loadError && <div className="error-banner" role="alert">{loadError}</div>}
    {stale && <div className="stale-banner" role="status">Showing a stale role snapshot. Refresh to recover live state.</div>}
    {loadState === "refreshing" && <div className="refresh-banner" role="status">Refreshing role...</div>}
    <header className="detail-head">
      <div className="detail-id">
        <div>
          <div className="title-status"><h1>{role.name}</h1><Status status={role.status} /></div>
          <p className="mono">{role.roleId} · revision r{role.revision}</p>
        </div>
      </div>
      <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
    </header>
    <div className="guardrail-banner" role="note"><span>Inspection mode</span><span>Sandbox only</span><span>Read-only</span><span>Composition governed by Product API</span></div>
    <div className="detail-grid">
      <section className="panel">
        <div className="panel-head"><div><h2>Role</h2><p>Catalog entry from the Product API</p></div></div>
        <dl className="config-list">
          <div><dt>Role ID</dt><dd className="mono">{role.roleId}</dd></div>
          <div><dt>Name</dt><dd>{role.name}</dd></div>
          <div><dt>Description</dt><dd>{role.description}</dd></div>
          <div><dt>Revision</dt><dd className="mono">r{role.revision}</dd></div>
          <div><dt>Status</dt><dd><Status status={role.status} /></dd></div>
          <div><dt>Used by agents</dt><dd>{role.usageCount}</dd></div>
        </dl>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Role capabilities</h2><p>Capabilities granted by this role</p></div><Badge tone={role.capabilities.length > 0 ? "good" : "muted"}>{role.capabilities.length}</Badge></div>
        <div className="panel-body"><IdList label="Capabilities" ids={role.capabilities} /></div>
      </section>
      <UnsupportedActionsPanel actions={role.availableActions} note="Role assignment and adoption" />
    </div>
  </>;
}

function ProfileCatalog() {
  const { data: profiles, loadState, loadError, stale, refresh } = useOperationalSummary<ProfileSummary[]>(
    () => productApi.listProfiles(),
    "Unable to load profiles from Product API",
    () => false,
  );
  return <CatalogPage eyebrow="ROLE & PROFILE COMPOSITION" title="Profiles" description="Profile catalog with sections, OpenClaw-compatible state and legacy visibility from the Product API." loadState={loadState} loadError={loadError} stale={stale} refresh={refresh}>
    {loadState === "loading" && !profiles && <CatalogLoading message="Loading profiles..." />}
    {loadState === "error" && !profiles && <CatalogError message={loadError ?? "Unable to load profiles"} />}
    {profiles && profiles.length === 0 && <section className="panel"><div className="empty-state">No profiles registered in the Product API.</div></section>}
    {profiles && profiles.length > 0 && <section className="catalog-list">
      {profiles.map(profile => (
        <Link className="catalog-row" to={`/profiles/${profile.profileId}`} key={profile.profileId}>
          <div className="catalog-row-main"><b>{profile.name}</b><small className="mono">{profile.profileId}</small><p>{profile.description}</p></div>
          <div className="catalog-badges">
            <Status status={profile.status} />
            {profile.openClawCompatible && <Badge tone="good">openclaw-compatible</Badge>}
            {profile.legacyProfileVisible && <Badge tone="warn">legacy visible</Badge>}
            <span className="tag mono">r{profile.revision}</span>
            <span className="catalog-count">{profile.sections.length} sections</span>
            <span className="catalog-count">{profile.usageCount} agents</span>
          </div>
        </Link>
      ))}
    </section>}
  </CatalogPage>;
}

function ProfileDetail() {
  const { profileId } = useParams();
  if (!profileId) return <Navigate to="/profiles" replace />;
  return <ProfileDetailSurface key={profileId} profileId={profileId} />;
}

function ProfileDetailSurface({ profileId }: { profileId: string }) {
  const { data: profile, loadState, loadError, stale, refresh } = useOperationalSummary<ProfileSummary>(
    () => productApi.getProfileDetail(profileId),
    "Unable to load profile from Product API",
    () => false,
  );
  if (loadState === "loading" && !profile) return <><Link className="back" to="/profiles">← Profiles</Link><CatalogLoading message="Loading profile..." /></>;
  if (loadState === "error" && !profile) return <><Link className="back" to="/profiles">← Profiles</Link><CatalogError message={loadError ?? "Profile not found"} /></>;
  if (!profile) return <div className="empty-state">Profile not found</div>;
  return <>
    <Link className="back" to="/profiles">← Profiles</Link>
    {loadError && <div className="error-banner" role="alert">{loadError}</div>}
    {stale && <div className="stale-banner" role="status">Showing a stale profile snapshot. Refresh to recover live state.</div>}
    {loadState === "refreshing" && <div className="refresh-banner" role="status">Refreshing profile...</div>}
    <header className="detail-head">
      <div className="detail-id">
        <div>
          <div className="title-status"><h1>{profile.name}</h1><Status status={profile.status} /></div>
          <p className="mono">{profile.profileId} · revision r{profile.revision}</p>
        </div>
      </div>
      <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
    </header>
    <div className="guardrail-banner" role="note"><span>Inspection mode</span><span>Sandbox only</span><span>Read-only</span><span>Composition governed by Product API</span></div>
    <div className="detail-grid">
      <section className="panel">
        <div className="panel-head"><div><h2>Profile</h2><p>Catalog entry from the Product API</p></div></div>
        <dl className="config-list">
          <div><dt>Profile ID</dt><dd className="mono">{profile.profileId}</dd></div>
          <div><dt>Name</dt><dd>{profile.name}</dd></div>
          <div><dt>Description</dt><dd>{profile.description}</dd></div>
          <div><dt>Revision</dt><dd className="mono">r{profile.revision}</dd></div>
          <div><dt>Status</dt><dd><Status status={profile.status} /></dd></div>
          <div><dt>OpenClaw compatible</dt><dd>{profile.openClawCompatible ? "Yes" : "No"}</dd></div>
          <div><dt>Legacy profile visible</dt><dd>{profile.legacyProfileVisible ? "Yes" : "No"}</dd></div>
          <div><dt>Used by agents</dt><dd>{profile.usageCount}</dd></div>
        </dl>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Profile sections</h2><p>Composition sections carried by this profile</p></div><Badge tone={profile.sections.length > 0 ? "good" : "muted"}>{profile.sections.length}</Badge></div>
        <div className="panel-body">
          {profile.sections.length === 0
            ? <div className="state-line empty">No sections reported.</div>
            : <div className="catalog-list compact">{profile.sections.map(section => <div className="catalog-row" key={section}><div className="catalog-row-main"><b>{section}</b></div></div>)}</div>}
        </div>
      </section>
      <UnsupportedActionsPanel actions={profile.availableActions} note="Profile assignment and adoption" />
    </div>
  </>;
}

function CapabilityCatalog() {
  const { data: capabilities, loadState, loadError, stale, refresh } = useOperationalSummary<CapabilitySummary[]>(
    () => productApi.listCapabilities(),
    "Unable to load capabilities from Product API",
    () => false,
  );
  const [source, setSource] = useState("all");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");

  const sources = Array.from(new Set((capabilities ?? []).map(capability => capability.source))).sort();
  const types = Array.from(new Set((capabilities ?? []).map(capability => capability.type))).sort();
  const statuses = Array.from(new Set((capabilities ?? []).map(capability => capability.status))).sort();
  const filtered = (capabilities ?? []).filter(capability =>
    (source === "all" || capability.source === source)
    && (type === "all" || capability.type === type)
    && (status === "all" || capability.status === status));

  return <CatalogPage eyebrow="CAPABILITY MODEL" title="Capabilities" description="Capability registry from the Product API. Filters and badges are presentation only — effective capability truth is never recomputed here." loadState={loadState} loadError={loadError} stale={stale} refresh={refresh}>
    {loadState === "loading" && !capabilities && <CatalogLoading message="Loading capabilities..." />}
    {loadState === "error" && !capabilities && <CatalogError message={loadError ?? "Unable to load capabilities"} />}
    {capabilities && capabilities.length === 0 && <section className="panel"><div className="empty-state">No capabilities registered in the Product API.</div></section>}
    {capabilities && capabilities.length > 0 && <>
      <div className="toolbar">
        <select className="filter select-filter" value={source} onChange={e => setSource(e.target.value)} aria-label="Filter by source">
          <option value="all">All sources</option>
          {sources.map(item => <option value={item} key={item}>{item}</option>)}
        </select>
        <select className="filter select-filter" value={type} onChange={e => setType(e.target.value)} aria-label="Filter by type">
          <option value="all">All types</option>
          {types.map(item => <option value={item} key={item}>{item}</option>)}
        </select>
        <select className="filter select-filter" value={status} onChange={e => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="all">All statuses</option>
          {statuses.map(item => <option value={item} key={item}>{item}</option>)}
        </select>
        <span className="env-chip">{filtered.length} of {capabilities.length}</span>
      </div>
      {filtered.length === 0
        ? <section className="panel"><div className="empty-state">No capabilities match the selected filters.</div></section>
        : <section className="catalog-list">
          {filtered.map(capability => (
            <Link className="catalog-row" to={`/capabilities/${capability.capabilityId}`} key={capability.capabilityId}>
              <div className="catalog-row-main"><b>{capability.name}</b><small className="mono">{capability.capabilityId}</small></div>
              <div className="catalog-badges">
                <Status status={capability.status} />
                <Badge tone="muted">{capability.source}</Badge>
                <Badge tone="muted">{capability.type}</Badge>
                {capability.level && <Badge tone="muted">{capability.level}</Badge>}
                <span className="catalog-count">{capability.usageCount} agents</span>
              </div>
            </Link>
          ))}
        </section>}
    </>}
  </CatalogPage>;
}

function CapabilityDetail() {
  const { capabilityId } = useParams();
  if (!capabilityId) return <Navigate to="/capabilities" replace />;
  return <CapabilityDetailSurface key={capabilityId} capabilityId={capabilityId} />;
}

function CapabilityDetailSurface({ capabilityId }: { capabilityId: string }) {
  const { data: capability, loadState, loadError, stale, refresh } = useOperationalSummary<CapabilitySummary>(
    () => productApi.getCapabilityDetail(capabilityId),
    "Unable to load capability from Product API",
    () => false,
  );
  if (loadState === "loading" && !capability) return <><Link className="back" to="/capabilities">← Capabilities</Link><CatalogLoading message="Loading capability..." /></>;
  if (loadState === "error" && !capability) return <><Link className="back" to="/capabilities">← Capabilities</Link><CatalogError message={loadError ?? "Capability not found"} /></>;
  if (!capability) return <div className="empty-state">Capability not found</div>;
  return <>
    <Link className="back" to="/capabilities">← Capabilities</Link>
    {loadError && <div className="error-banner" role="alert">{loadError}</div>}
    {stale && <div className="stale-banner" role="status">Showing a stale capability snapshot. Refresh to recover live state.</div>}
    {loadState === "refreshing" && <div className="refresh-banner" role="status">Refreshing capability...</div>}
    <header className="detail-head">
      <div className="detail-id">
        <div>
          <div className="title-status"><h1>{capability.name}</h1><Status status={capability.status} /></div>
          <p className="mono">{capability.capabilityId}</p>
        </div>
      </div>
      <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
    </header>
    <div className="guardrail-banner" role="note"><span>Inspection mode</span><span>Sandbox only</span><span>Read-only</span><span>Composition governed by Product API</span></div>
    <div className="detail-grid">
      <section className="panel">
        <div className="panel-head"><div><h2>Capability</h2><p>Registry entry from the Product API</p></div></div>
        <dl className="config-list">
          <div><dt>Capability ID</dt><dd className="mono">{capability.capabilityId}</dd></div>
          <div><dt>Name</dt><dd>{capability.name}</dd></div>
          <div><dt>Source</dt><dd>{capability.source}</dd></div>
          <div><dt>Type</dt><dd>{capability.type}</dd></div>
          <div><dt>Level</dt><dd>{capability.level ?? "—"}</dd></div>
          <div><dt>Status</dt><dd><Status status={capability.status} /></dd></div>
          <div><dt>Used by agents</dt><dd>{capability.usageCount}</dd></div>
        </dl>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Requirements</h2><p>Prerequisites reported by the Product API</p></div><Badge tone={capability.requirements.length > 0 ? "warn" : "good"}>{capability.requirements.length}</Badge></div>
        <div className="panel-body"><IdList label="Requirements" ids={capability.requirements} /></div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Conflicts</h2><p>Conflicting capabilities reported by the Product API</p></div><Badge tone={capability.conflicts.length > 0 ? "warn" : "good"}>{capability.conflicts.length}</Badge></div>
        <div className="panel-body"><IdList label="Conflicts" ids={capability.conflicts} /></div>
      </section>
    </div>
  </>;
}

function SkillCatalog() {
  const { data: skills, loadState, loadError, stale, refresh } = useOperationalSummary<SkillSummary[]>(
    () => productApi.listSkills(),
    "Unable to load skills from Product API",
    () => false,
  );
  return <CatalogPage eyebrow="SKILLS MANAGEMENT" title="Skills" description="Skill catalog with installed, assigned and compatibility state from the Product API." loadState={loadState} loadError={loadError} stale={stale} refresh={refresh}>
    {loadState === "loading" && !skills && <CatalogLoading message="Loading skills..." />}
    {loadState === "error" && !skills && <CatalogError message={loadError ?? "Unable to load skills"} />}
    {skills && skills.length === 0 && <section className="panel"><div className="empty-state">No skills registered in the Product API.</div></section>}
    {skills && skills.length > 0 && <section className="catalog-list">
      {skills.map(skill => (
        <Link className="catalog-row" to={`/skills/${skill.skillId}`} key={skill.skillId}>
          <div className="catalog-row-main"><b>{skill.name}</b><small className="mono">{skill.skillId}</small><p>{skill.description}</p></div>
          <div className="catalog-badges">
            {skill.installed && <Badge tone="good">installed</Badge>}
            {skill.assigned && <Badge tone="good">assigned</Badge>}
            <Badge tone={skill.compatibility === "compatible" ? "good" : "warn"}>{skill.compatibility}</Badge>
            <span className="catalog-count">{skill.capabilities.length} capabilities</span>
            <span className="catalog-count">{skill.usageCount} agents</span>
          </div>
        </Link>
      ))}
    </section>}
  </CatalogPage>;
}

function SkillDetail() {
  const { skillId } = useParams();
  if (!skillId) return <Navigate to="/skills" replace />;
  return <SkillDetailSurface key={skillId} skillId={skillId} />;
}

function SkillDetailSurface({ skillId }: { skillId: string }) {
  const { data: skill, loadState, loadError, stale, refresh } = useOperationalSummary<SkillSummary>(
    () => productApi.getSkillDetail(skillId),
    "Unable to load skill from Product API",
    () => false,
  );
  if (loadState === "loading" && !skill) return <><Link className="back" to="/skills">← Skills</Link><CatalogLoading message="Loading skill..." /></>;
  if (loadState === "error" && !skill) return <><Link className="back" to="/skills">← Skills</Link><CatalogError message={loadError ?? "Skill not found"} /></>;
  if (!skill) return <div className="empty-state">Skill not found</div>;
  return <>
    <Link className="back" to="/skills">← Skills</Link>
    {loadError && <div className="error-banner" role="alert">{loadError}</div>}
    {stale && <div className="stale-banner" role="status">Showing a stale skill snapshot. Refresh to recover live state.</div>}
    {loadState === "refreshing" && <div className="refresh-banner" role="status">Refreshing skill...</div>}
    <header className="detail-head">
      <div className="detail-id">
        <div>
          <div className="title-status"><h1>{skill.name}</h1>{skill.installed && <Badge tone="good">installed</Badge>}{skill.assigned && <Badge tone="good">assigned</Badge>}</div>
          <p className="mono">{skill.skillId}</p>
        </div>
      </div>
      <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
    </header>
    <div className="guardrail-banner" role="note"><span>Inspection mode</span><span>Sandbox only</span><span>Read-only</span><span>Composition governed by Product API</span></div>
    <div className="detail-grid">
      <section className="panel">
        <div className="panel-head"><div><h2>Skill</h2><p>Catalog entry from the Product API</p></div></div>
        <dl className="config-list">
          <div><dt>Skill ID</dt><dd className="mono">{skill.skillId}</dd></div>
          <div><dt>Name</dt><dd>{skill.name}</dd></div>
          <div><dt>Description</dt><dd>{skill.description}</dd></div>
          <div><dt>Installed</dt><dd>{skill.installed ? "Yes" : "No"}</dd></div>
          <div><dt>Assigned</dt><dd>{skill.assigned ? "Yes" : "No"}</dd></div>
          <div><dt>Compatibility</dt><dd><Status status={skill.compatibility} /></dd></div>
          <div><dt>Used by agents</dt><dd>{skill.usageCount}</dd></div>
        </dl>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Skill capabilities</h2><p>Capabilities provided by this skill</p></div><Badge tone={skill.capabilities.length > 0 ? "good" : "muted"}>{skill.capabilities.length}</Badge></div>
        <div className="panel-body"><IdList label="Capabilities" ids={skill.capabilities} /></div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Requirements</h2><p>Prerequisites reported by the Product API</p></div><Badge tone={skill.requirements.length > 0 ? "warn" : "good"}>{skill.requirements.length}</Badge></div>
        <div className="panel-body"><IdList label="Requirements" ids={skill.requirements} /></div>
      </section>
      <UnsupportedActionsPanel actions={skill.availableActions} note="Skill assignment, unassignment, install and removal" />
    </div>
  </>;
}

function ToolsPluginsCatalog() {
  const { data: tools, loadState, loadError, stale, refresh } = useOperationalSummary<ToolSummary[]>(
    () => productApi.listTools(),
    "Unable to load tools from Product API",
    () => false,
  );
  const { data: plugins, loadState: pluginsState, loadError: pluginsError } = useOperationalSummary<PluginSummary[]>(
    () => productApi.listPlugins(),
    "Unable to load plugins from Product API",
    () => false,
  );
  const { data: packages, loadState: packagesState, loadError: packagesError } = useOperationalSummary<PluginPackage[]>(
    () => productApi.listPluginPackages(),
    "Unable to load plugin packages from Product API",
    () => false,
  );
  const { data: sources, loadState: sourcesState, loadError: sourcesError } = useOperationalSummary<PackageSource[]>(
    () => productApi.listPackageSources(),
    "Unable to load package sources from Product API",
    () => false,
  );

  return <>
    <header className="page-head compact">
      <div><p className="eyebrow">TOOLS & PLUGINS MANAGEMENT</p><h1>Tools & Plugins</h1><p>Tool catalog, plugin packages and package sources from the Product API.</p></div>
      <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadError ? "Retry" : loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
    </header>
    <div className="guardrail-banner" role="note"><span>Inspection mode</span><span>Sandbox only</span><span>Read-only</span><span>Composition governed by Product API</span></div>
    {stale && <div className="stale-banner" role="status">Showing a stale snapshot. Refresh to recover live state.</div>}
    {loadState === "refreshing" && <div className="refresh-banner" role="status">Refreshing tools and plugins...</div>}
    {loadError && <div className="error-banner" role="alert">{loadError}</div>}
    <section className="panel">
      <div className="panel-head"><div><h2>Tool catalog</h2><p>Assigned and available tools</p></div><Badge tone={tools && tools.length > 0 ? "good" : "muted"}>{tools?.length ?? 0}</Badge></div>
      {loadState === "loading" && !tools && <div className="state-line card-body">Loading tools...</div>}
      {loadState === "error" && !tools && <div className="state-line error card-body">Unable to load tools.</div>}
      {tools && tools.length === 0 && <div className="state-line empty card-body">No tools registered in the Product API.</div>}
      {tools && tools.length > 0 && <div className="catalog-list card-body">
        {tools.map(tool => (
          <Link className="catalog-row" to={`/tools/${tool.toolId}`} key={tool.toolId}>
            <div className="catalog-row-main"><b>{tool.name}</b><small className="mono">{tool.toolId}</small><p>{tool.description}</p></div>
            <div className="catalog-badges">
              {tool.assigned && <Badge tone="good">assigned</Badge>}
              <Badge tone={tool.availability === "available" ? "good" : "warn"}>{tool.availability}</Badge>
              <span className="catalog-count">{tool.capabilities.length} capabilities</span>
              <span className="catalog-count">{tool.usageCount} agents</span>
            </div>
          </Link>
        ))}
      </div>}
    </section>
    <div className="dashboard-grid composition-detail-grid">
      <section className="panel">
        <div className="panel-head"><div><h2>Plugin packages</h2><p>Package catalog from the Product API</p></div><Badge tone={packages && packages.length > 0 ? "good" : "muted"}>{packages?.length ?? 0}</Badge></div>
        <div className="panel-body">
          {packagesState === "loading" && !packages && <div className="state-line">Loading plugin packages...</div>}
          {packagesError && <div className="state-line error">{packagesError}</div>}
          {packages && packages.length === 0 && <div className="state-line empty">No plugin packages available. Plugin installation is unsupported in this milestone.</div>}
          {packages && packages.length > 0 && <div className="catalog-list compact">
            {packages.map(pkg => (
              <div className="catalog-row" key={pkg.packageId}>
                <div className="catalog-row-main"><b>{pkg.name}</b><small className="mono">{pkg.packageId}</small></div>
                <div className="catalog-badges">
                  <Badge tone="muted">{pkg.source}</Badge>
                  {pkg.version && <span className="tag mono">{pkg.version}</span>}
                  <Badge tone={pkg.status === "available" ? "good" : "warn"}>{pkg.status}</Badge>
                </div>
              </div>
            ))}
          </div>}
        </div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Package sources</h2><p>Plugin package sources</p></div><Badge tone={sources && sources.length > 0 ? "good" : "muted"}>{sources?.length ?? 0}</Badge></div>
        <div className="panel-body">
          {sourcesState === "loading" && !sources && <div className="state-line">Loading package sources...</div>}
          {sourcesError && <div className="state-line error">{sourcesError}</div>}
          {sources && sources.length === 0 && <div className="state-line empty">No package sources reported by the Product API.</div>}
          {sources && sources.length > 0 && <div className="catalog-list compact">
            {sources.map(source => (
              <div className="catalog-row" key={source.sourceId}>
                <div className="catalog-row-main"><b>{source.name}</b><small className="mono">{source.sourceId}</small></div>
                <div className="catalog-badges">
                  <Badge tone="muted">{source.type}</Badge>
                  <Badge tone={source.status === "available" ? "good" : "warn"}>{source.status}</Badge>
                </div>
              </div>
            ))}
          </div>}
        </div>
      </section>
    </div>
    <section className="panel">
      <div className="panel-head"><div><h2>Plugin installations</h2><p>Installed plugins on this workspace</p></div><Badge tone={plugins && plugins.length > 0 ? "good" : "muted"}>{plugins?.length ?? 0}</Badge></div>
      <div className="panel-body">
        {pluginsState === "loading" && !plugins && <div className="state-line">Loading plugin installations...</div>}
        {pluginsError && <div className="state-line error">{pluginsError}</div>}
        {plugins && plugins.length === 0 && <div className="state-line empty">No plugin installations. Install and remove actions are unsupported in this milestone.</div>}
        {plugins && plugins.length > 0 && <div className="catalog-list compact">
          {plugins.map(plugin => (
            <div className="catalog-row" key={plugin.pluginId}>
              <div className="catalog-row-main"><b>{plugin.name}</b><small className="mono">{plugin.pluginId} · {plugin.packageId}</small></div>
              <div className="catalog-badges">
                {plugin.installed && <Badge tone="good">installed</Badge>}
                {plugin.failureState !== "none" && <Badge tone="warn">{plugin.failureState}</Badge>}
                <Badge tone={plugin.compatibility === "compatible" ? "good" : "warn"}>{plugin.compatibility}</Badge>
                {plugin.dependencies.length > 0 && <Badge tone="warn">{plugin.dependencies.length} deps</Badge>}
              </div>
            </div>
          ))}
        </div>}
      </div>
    </section>
  </>;
}

function ToolDetail() {
  const { toolId } = useParams();
  if (!toolId) return <Navigate to="/plugins" replace />;
  return <ToolDetailSurface key={toolId} toolId={toolId} />;
}

function ToolDetailSurface({ toolId }: { toolId: string }) {
  const { data: tool, loadState, loadError, stale, refresh } = useOperationalSummary<ToolSummary>(
    () => productApi.getToolDetail(toolId),
    "Unable to load tool from Product API",
    () => false,
  );
  if (loadState === "loading" && !tool) return <><Link className="back" to="/plugins">← Tools & Plugins</Link><CatalogLoading message="Loading tool..." /></>;
  if (loadState === "error" && !tool) return <><Link className="back" to="/plugins">← Tools & Plugins</Link><CatalogError message={loadError ?? "Tool not found"} /></>;
  if (!tool) return <div className="empty-state">Tool not found</div>;
  return <>
    <Link className="back" to="/plugins">← Tools & Plugins</Link>
    {loadError && <div className="error-banner" role="alert">{loadError}</div>}
    {stale && <div className="stale-banner" role="status">Showing a stale tool snapshot. Refresh to recover live state.</div>}
    {loadState === "refreshing" && <div className="refresh-banner" role="status">Refreshing tool...</div>}
    <header className="detail-head">
      <div className="detail-id">
        <div>
          <div className="title-status"><h1>{tool.name}</h1>{tool.assigned && <Badge tone="good">assigned</Badge>}</div>
          <p className="mono">{tool.toolId}</p>
        </div>
      </div>
      <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
    </header>
    <div className="guardrail-banner" role="note"><span>Inspection mode</span><span>Sandbox only</span><span>Read-only</span><span>Composition governed by Product API</span></div>
    <div className="detail-grid">
      <section className="panel">
        <div className="panel-head"><div><h2>Tool</h2><p>Catalog entry from the Product API</p></div></div>
        <dl className="config-list">
          <div><dt>Tool ID</dt><dd className="mono">{tool.toolId}</dd></div>
          <div><dt>Name</dt><dd>{tool.name}</dd></div>
          <div><dt>Description</dt><dd>{tool.description}</dd></div>
          <div><dt>Assigned</dt><dd>{tool.assigned ? "Yes" : "No"}</dd></div>
          <div><dt>Availability</dt><dd><Status status={tool.availability} /></dd></div>
          <div><dt>Used by agents</dt><dd>{tool.usageCount}</dd></div>
        </dl>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Tool capabilities</h2><p>Capabilities provided by this tool</p></div><Badge tone={tool.capabilities.length > 0 ? "good" : "muted"}>{tool.capabilities.length}</Badge></div>
        <div className="panel-body"><IdList label="Capabilities" ids={tool.capabilities} /></div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Requirements</h2><p>Prerequisites reported by the Product API</p></div><Badge tone={tool.requirements.length > 0 ? "warn" : "good"}>{tool.requirements.length}</Badge></div>
        <div className="panel-body"><IdList label="Requirements" ids={tool.requirements} /></div>
      </section>
      <UnsupportedActionsPanel actions={tool.availableActions} note="Tool assignment and unassignment" />
    </div>
  </>;
}

function PluginDetail() {
  const { pluginId } = useParams();
  if (!pluginId) return <Navigate to="/plugins" replace />;
  return <PluginDetailSurface key={pluginId} pluginId={pluginId} />;
}

function PluginDetailSurface({ pluginId }: { pluginId: string }) {
  const { data: plugin, loadState, loadError, stale, refresh } = useOperationalSummary<PluginSummary>(
    () => productApi.getPluginDetail(pluginId),
    "Unable to load plugin from Product API",
    () => false,
  );
  if (loadState === "loading" && !plugin) return <><Link className="back" to="/plugins">← Tools & Plugins</Link><CatalogLoading message="Loading plugin..." /></>;
  if (loadState === "error" && !plugin) return <><Link className="back" to="/plugins">← Tools & Plugins</Link><CatalogError message={loadError ?? "Plugin not found"} /></>;
  if (!plugin) return <div className="empty-state">Plugin not found</div>;
  return <>
    <Link className="back" to="/plugins">← Tools & Plugins</Link>
    {loadError && <div className="error-banner" role="alert">{loadError}</div>}
    {stale && <div className="stale-banner" role="status">Showing a stale plugin snapshot. Refresh to recover live state.</div>}
    {loadState === "refreshing" && <div className="refresh-banner" role="status">Refreshing plugin...</div>}
    <header className="detail-head">
      <div className="detail-id">
        <div>
          <div className="title-status"><h1>{plugin.name}</h1>{plugin.installed && <Badge tone="good">installed</Badge>}</div>
          <p className="mono">{plugin.pluginId}</p>
        </div>
      </div>
      <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
    </header>
    <div className="guardrail-banner" role="note"><span>Inspection mode</span><span>Sandbox only</span><span>Read-only</span><span>Composition governed by Product API</span></div>
    <div className="detail-grid">
      <section className="panel">
        <div className="panel-head"><div><h2>Plugin</h2><p>Catalog entry from the Product API</p></div></div>
        <dl className="config-list">
          <div><dt>Plugin ID</dt><dd className="mono">{plugin.pluginId}</dd></div>
          <div><dt>Package</dt><dd className="mono">{plugin.packageId}</dd></div>
          <div><dt>Name</dt><dd>{plugin.name}</dd></div>
          <div><dt>Source</dt><dd>{plugin.source}</dd></div>
          <div><dt>Installed</dt><dd>{plugin.installed ? "Yes" : "No"}</dd></div>
          <div><dt>Compatibility</dt><dd><Status status={plugin.compatibility} /></dd></div>
          <div><dt>Failure state</dt><dd>{plugin.failureState}</dd></div>
        </dl>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Dependencies</h2><p>Plugin dependency truth from the Product API</p></div><Badge tone={plugin.dependencies.length > 0 ? "warn" : "good"}>{plugin.dependencies.length}</Badge></div>
        <div className="panel-body"><IdList label="Dependencies" ids={plugin.dependencies} /></div>
      </section>
      <UnsupportedActionsPanel actions={plugin.availableActions} note="Plugin installation and removal" />
    </div>
  </>;
}

function EngineCatalog() {
  const { data: engines, loadState, loadError, stale, refresh } = useOperationalSummary<EngineSummary[]>(
    () => productApi.listEngines(),
    "Unable to load engines from Product API",
    () => false,
  );
  const { data: providers, loadState: providersState, loadError: providersError } = useOperationalSummary<ProviderSummary[]>(
    () => productApi.listProviders(),
    "Unable to load providers from Product API",
    () => false,
  );
  const { data: models, loadState: modelsState, loadError: modelsError } = useOperationalSummary<ModelSummary[]>(
    () => productApi.listModels(),
    "Unable to load models from Product API",
    () => false,
  );

  return <>
    <header className="page-head compact">
      <div><p className="eyebrow">MODELS, ENGINES & PROVIDERS</p><h1>Engines, Providers & Models</h1><p>Composition registries from the Product API. Credential requirements link to the governed write-only Secret references surface.</p></div>
      <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadError ? "Retry" : loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
    </header>
    <div className="guardrail-banner" role="note"><span>Inspection mode</span><span>Sandbox only</span><span>Read-only</span><span>Composition governed by Product API</span></div>
    {stale && <div className="stale-banner" role="status">Showing a stale snapshot. Refresh to recover live state.</div>}
    {loadState === "refreshing" && <div className="refresh-banner" role="status">Refreshing engine registries...</div>}
    {loadError && <div className="error-banner" role="alert">{loadError}</div>}
    <section className="panel">
      <div className="panel-head"><div><h2>Engine registry</h2><p>Available execution engines</p></div><Badge tone={engines && engines.length > 0 ? "good" : "muted"}>{engines?.length ?? 0}</Badge></div>
      <div className="panel-body">
        {loadState === "loading" && !engines && <div className="state-line">Loading engines...</div>}
        {loadState === "error" && !engines && <div className="state-line error">Unable to load engines.</div>}
        {engines && engines.length === 0 && <div className="state-line empty">No engines reported by the Product API.</div>}
        {engines && engines.length > 0 && <div className="catalog-list compact">
          {engines.map(engine => (
            <Link className="catalog-row" to={`/engines/${engine.id}`} key={engine.id}>
              <div className="catalog-row-main"><b>{engine.name}</b><small className="mono">{engine.id}</small><CapabilityBadges capabilities={engine.capabilities} /></div>
              <div className="catalog-badges">
                <Badge tone={engine.availability === "ready" ? "good" : engine.availability === "degraded" ? "warn" : "muted"}>{engine.availability}</Badge>
                <Badge tone={engine.compatibility === "compatible" ? "good" : "warn"}>{engine.compatibility}</Badge>
                <span className="catalog-count">{engine.deploymentModes.join(", ")}</span>
              </div>
            </Link>
          ))}
        </div>}
      </div>
    </section>
    <div className="dashboard-grid composition-detail-grid">
      <section className="panel">
        <div className="panel-head"><div><h2>Provider registry</h2><p>Model providers and credential requirements</p></div><Badge tone={providers && providers.length > 0 ? "good" : "muted"}>{providers?.length ?? 0}</Badge></div>
        <div className="panel-body">
          {providersState === "loading" && !providers && <div className="state-line">Loading providers...</div>}
          {providersError && <div className="state-line error">{providersError}</div>}
          {providers && providers.length === 0 && <div className="state-line empty">No providers reported by the Product API.</div>}
          {providers && providers.length > 0 && <div className="catalog-list compact">
            {providers.map(provider => (
              <Link className="catalog-row" to={`/providers/${provider.id}`} key={provider.id}>
                <div className="catalog-row-main"><b>{provider.name}</b><small className="mono">{provider.id}</small></div>
                <div className="catalog-badges">
                  <Badge tone={provider.availability === "available" ? "good" : provider.availability === "pending" ? "warn" : "muted"}>{provider.availability}</Badge>
                  {provider.credentialRequired && <Badge tone="warn">credential required</Badge>}
                  <Badge tone={provider.compatibility === "compatible" ? "good" : "warn"}>{provider.compatibility}</Badge>
                </div>
              </Link>
            ))}
          </div>}
        </div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Model catalog</h2><p>Models available for composition</p></div><Badge tone={models && models.length > 0 ? "good" : "muted"}>{models?.length ?? 0}</Badge></div>
        <div className="panel-body">
          {modelsState === "loading" && !models && <div className="state-line">Loading models...</div>}
          {modelsError && <div className="state-line error">{modelsError}</div>}
          {models && models.length === 0 && <div className="state-line empty">No models reported by the Product API.</div>}
          {models && models.length > 0 && <div className="catalog-list compact">
            {models.map(model => (
              <div className="catalog-row" key={model.id}>
                <div className="catalog-row-main"><b>{model.name}</b><small className="mono">{model.id}</small><CapabilityBadges capabilities={model.capabilities} /></div>
                <div className="catalog-badges">
                  <Badge tone={model.availability === "available" ? "good" : model.availability === "preview" ? "warn" : "muted"}>{model.availability}</Badge>
                  {model.credentialRequired && <Badge tone="warn">credential required</Badge>}
                  <Badge tone={model.compatibility === "compatible" ? "good" : "warn"}>{model.compatibility}</Badge>
                </div>
              </div>
            ))}
          </div>}
        </div>
      </section>
    </div>
    <section className="panel">
      <div className="panel-head"><div><h2>Selection actions</h2><p>Engine / Provider / Model selection for AgentComposition</p></div><Badge tone="muted">unsupported</Badge></div>
      <p className="panel-note">Selecting an engine, provider or model for an AgentComposition is governed by the Product API and is not supported in this milestone. Compatibility shown here never implies deploy planning — deployment planning belongs to Operational Execution.</p>
    </section>
  </>;
}

function EngineDetail() {
  const { engineId } = useParams();
  if (!engineId) return <Navigate to="/engines" replace />;
  return <EngineDetailSurface key={engineId} engineId={engineId} />;
}

function EngineDetailSurface({ engineId }: { engineId: string }) {
  const { data: engine, loadState, loadError, stale, refresh } = useOperationalSummary<EngineSummary>(
    () => productApi.getEngineDetail(engineId),
    "Unable to load engine from Product API",
    () => false,
  );
  if (loadState === "loading" && !engine) return <><Link className="back" to="/engines">← Engines</Link><CatalogLoading message="Loading engine..." /></>;
  if (loadState === "error" && !engine) return <><Link className="back" to="/engines">← Engines</Link><CatalogError message={loadError ?? "Engine not found"} /></>;
  if (!engine) return <div className="empty-state">Engine not found</div>;
  return <>
    <Link className="back" to="/engines">← Engines</Link>
    {loadError && <div className="error-banner" role="alert">{loadError}</div>}
    {stale && <div className="stale-banner" role="status">Showing a stale engine snapshot. Refresh to recover live state.</div>}
    {loadState === "refreshing" && <div className="refresh-banner" role="status">Refreshing engine...</div>}
    <header className="detail-head">
      <div className="detail-id">
        <div>
          <div className="title-status"><h1>{engine.name}</h1><Status status={engine.availability} /></div>
          <p className="mono">{engine.id} · {engine.type}</p>
        </div>
      </div>
      <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
    </header>
    <div className="guardrail-banner" role="note"><span>Inspection mode</span><span>Sandbox only</span><span>Read-only</span><span>Composition governed by Product API</span></div>
    <div className="detail-grid">
      <section className="panel">
        <div className="panel-head"><div><h2>Engine</h2><p>Registry entry from the Product API</p></div></div>
        <dl className="config-list">
          <div><dt>Engine ID</dt><dd className="mono">{engine.id}</dd></div>
          <div><dt>Name</dt><dd>{engine.name}</dd></div>
          <div><dt>Type</dt><dd>{engine.type}</dd></div>
          <div><dt>Availability</dt><dd><Status status={engine.availability} /></dd></div>
          <div><dt>Compatibility</dt><dd><Status status={engine.compatibility} /></dd></div>
          <div><dt>Credential required</dt><dd>No</dd></div>
          <div><dt>Deployment modes</dt><dd>{engine.deploymentModes.join(", ")}</dd></div>
          <div><dt>Used by agents</dt><dd>{engine.usageCount}</dd></div>
        </dl>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Engine capabilities</h2><p>Capabilities provided by this engine</p></div><Badge tone={engine.capabilities.length > 0 ? "good" : "muted"}>{engine.capabilities.length}</Badge></div>
        <div className="panel-body"><IdList label="Capabilities" ids={engine.capabilities} /></div>
      </section>
      <UnsupportedActionsPanel actions={engine.availableActions} note="Engine selection for AgentComposition" />
    </div>
  </>;
}

function ProviderDetail() {
  const { providerId } = useParams();
  if (!providerId) return <Navigate to="/engines" replace />;
  return <ProviderDetailSurface key={providerId} providerId={providerId} />;
}

function ProviderDetailSurface({ providerId }: { providerId: string }) {
  const { data: provider, loadState, loadError, stale, refresh } = useOperationalSummary<ProviderSummary>(
    () => productApi.getProviderDetail(providerId),
    "Unable to load provider from Product API",
    () => false,
  );
  if (loadState === "loading" && !provider) return <><Link className="back" to="/engines">← Engines</Link><CatalogLoading message="Loading provider..." /></>;
  if (loadState === "error" && !provider) return <><Link className="back" to="/engines">← Engines</Link><CatalogError message={loadError ?? "Provider not found"} /></>;
  if (!provider) return <div className="empty-state">Provider not found</div>;
  return <>
    <Link className="back" to="/engines">← Engines</Link>
    {loadError && <div className="error-banner" role="alert">{loadError}</div>}
    {stale && <div className="stale-banner" role="status">Showing a stale provider snapshot. Refresh to recover live state.</div>}
    {loadState === "refreshing" && <div className="refresh-banner" role="status">Refreshing provider...</div>}
    <header className="detail-head">
      <div className="detail-id">
        <div>
          <div className="title-status"><h1>{provider.name}</h1><Status status={provider.availability} /></div>
          <p className="mono">{provider.id} · {provider.type.join(", ")}</p>
        </div>
      </div>
      <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
    </header>
    <div className="guardrail-banner" role="note"><span>Inspection mode</span><span>Sandbox only</span><span>Read-only</span><span>Composition governed by Product API</span></div>
    <div className="detail-grid">
      <section className="panel">
        <div className="panel-head"><div><h2>Provider</h2><p>Registry entry from the Product API</p></div></div>
        <dl className="config-list">
          <div><dt>Provider ID</dt><dd className="mono">{provider.id}</dd></div>
          <div><dt>Name</dt><dd>{provider.name}</dd></div>
          <div><dt>Type</dt><dd>{provider.type.join(", ")}</dd></div>
          <div><dt>Availability</dt><dd><Status status={provider.availability} /></dd></div>
          <div><dt>Credential required</dt><dd>{provider.credentialRequired ? "Yes — visible requirement only; credentials are never exposed" : "No"}</dd></div>
          <div><dt>Compatibility</dt><dd><Status status={provider.compatibility} /></dd></div>
          <div><dt>Used by agents</dt><dd>{provider.usageCount}</dd></div>
        </dl>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Provider capabilities</h2><p>Capabilities provided by this provider</p></div><Badge tone={provider.capabilities.length > 0 ? "good" : "muted"}>{provider.capabilities.length}</Badge></div>
        <div className="panel-body"><IdList label="Capabilities" ids={provider.capabilities} /></div>
      </section>
      <UnsupportedActionsPanel actions={provider.availableActions} note="Provider selection for AgentComposition" />
    </div>
  </>;
}

function GenericView({ view }: { view: View }) {
  return <>
    <header className="page-head compact"><div><p className="eyebrow">ACS CORE</p><h1>{view}</h1><p>Manage {view.toLowerCase()} available to this local workspace.</p></div><button className="primary">＋ New {view}</button></header>
    <section className="resource-list"><div className="empty-state">API integration for {view} is pending.</div></section>
  </>;
}

function Runtime() {
  const runtimes = useOperationalSummary<RuntimeSummary[]>(
    () => productApi.listRuntimes(),
    "Unable to load runtime instances from Product API",
    () => false,
  );
  const workers = useOperationalSummary<WorkerSummary[]>(
    () => productApi.listWorkers(),
    "Unable to load workers from Product API",
    () => false,
  );
  return <>
    <DomainHeader domain="Operations" title="Runtime" description="Runtime instance and worker state reported by the Product API. Direct process access is not available in this milestone." entityLabel="Runtime inventory" actions={<button className="secondary" disabled={runtimes.loadState === "loading" || runtimes.loadState === "refreshing"} onClick={runtimes.refresh}>{runtimes.loadError ? "Retry" : runtimes.loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>} />
    <div className="guardrail-banner" role="note"><span>Inspection mode</span><span>Sandbox only</span><span>Read-only</span><span>Runtime state governed by Product API</span><span>Production ready = false</span></div>
    {staleBanner(runtimes, "runtime")}
    <div className="flow-group">
      <div className="flow-group-head"><h2>Runtime instances</h2><p>Deployment-backed runtime records with health, isolation, drift and reconciliation state.</p></div>
      <div className="dashboard-grid execution-grid">
        <section className="panel wide">
          <div className="panel-head"><div><h2>Runtime instances</h2><p>Read-only inventory from the Product API</p></div><Badge tone={runtimes.data?.length ? "good" : "muted"}>{runtimes.data?.length ?? 0}</Badge></div>
          <div className="panel-body">
            {runtimes.data?.length
              ? runtimes.data.map(item => <div className="catalog-row" key={item.runtimeId}><div className="catalog-row-main"><b>{item.runtimeId}</b><small>{item.status} · {item.health} · {item.target} · {item.engine}</small><p>reconciliation: {item.reconciliationState} · isolation: {item.isolationState} · drift: {item.driftState} · failure: {item.failureState}</p></div><div className="catalog-badges"><Badge tone={item.health === "healthy" ? "good" : item.health === "degraded" ? "warn" : "muted"}>{item.health}</Badge><Link className="detail-link" to={`/agents/${item.agentId}`}>agent →</Link></div></div>)
              : <PanelStateLine state={runtimes.loadState} error={runtimes.loadError} emptyMessage="No runtime instances recorded" />}
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head"><h2>Workers</h2><p>Worker health and reconciliation visibility for runtime execution.</p></div>
      <div className="dashboard-grid execution-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Workers</h2><p>Capacity and failure visibility</p></div><Badge tone={workers.data?.length ? "good" : "muted"}>{workers.data?.length ?? 0}</Badge></div>
          <div className="panel-body">
            {workers.data?.length
              ? workers.data.map(item => <div className="catalog-row" key={item.workerId}><div className="catalog-row-main"><b>{item.workerId}</b><small>{item.status} · {item.health} · capacity {item.availableCapacity}/{item.capacity}</small></div><Badge tone={item.health === "healthy" ? "good" : item.health === "degraded" ? "warn" : "muted"}>{item.failureState}</Badge></div>)
              : <PanelStateLine state={workers.loadState} error={workers.loadError} emptyMessage="No workers registered" />}
          </div>
        </section>
        <UnsupportedPanel title="Runtime control" note="Start, stop and direct process access" reason="Runtime control actions are not supported in this milestone. Runtime state is reported by the Product API and is never mutated from this surface." />
      </div>
    </div>
  </>;
}

function Logs() {
  const { data: events, loadState, loadError, stale, refresh } = useOperationalSummary<EventRecord[]>(
    () => productApi.listEvents(),
    "Unable to load events from Product API",
    () => false,
  );
  return <>
    <DomainHeader domain="Evidence" title="Events & Logs" description="System and agent event inventory from the Product API. Logs remain diagnostic evidence, not primary operational state." actions={<button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>Refresh</button>} />
    <div className="guardrail-banner" role="note"><span>Inspection mode</span><span>Sandbox only</span><span>Production ready = false</span><span>Evidence governed by Product API</span><span>Not billing</span></div>
    {stale && <div className="stale-banner" role="status">Showing a stale evidence snapshot.</div>}
    {loadState === "refreshing" && <div className="refresh-banner" role="status">Refreshing evidence...</div>}
    {loadError && <div className="error-banner" role="alert">{loadError}</div>}
    <CrossLinks links={[{ to: "/operational-evidence", label: "Operational evidence" }, { to: "/audit", label: "Audit trail" }, { to: "/economics", label: "Economics" }]} />
    <section className="panel">
      <div className="panel-head"><div><h2>Events</h2><p>System and agent event inventory</p></div><Badge tone="muted">{events?.length ?? 0}</Badge></div>
      <div className="panel-body">
        <TimelineList limit={10} items={(events ?? []).map(event => ({ id: event.eventId, title: event.type, meta: `${event.severity} · ${event.source} · ${new Date(event.createdAt).toLocaleTimeString()}`, detail: event.message, tone: event.severity === "error" || event.severity === "critical" ? "warn" : undefined }))} />
      </div>
    </section>
  </>;
}

function EvidenceView() {
  const { data: evidence, loadState, loadError, stale, refresh } = useOperationalSummary<EvidenceRecord[]>(
    () => productApi.listEvidence(),
    "Unable to load evidence from Product API",
    () => false,
  );
  const { data: diagnostics } = useOperationalSummary<DiagnosticReport[]>(
    () => productApi.listDiagnostics(),
    "Unable to load diagnostics from Product API",
    () => false,
  );
  return <>
    <DomainHeader domain="Evidence" title="Operational Evidence" description="Evidence records and diagnostic findings reported by the Product API. Evidence truth is never recomputed in the UI." actions={<button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>Refresh</button>} />
    <div className="guardrail-banner" role="note"><span>Inspection mode</span><span>Sandbox only</span><span>Production ready = false</span><span>Evidence governed by Product API</span></div>
    {staleBanner({ stale, loadState, loadError }, "evidence")}
    <CrossLinks links={[{ to: "/logs", label: "Events & logs" }, { to: "/audit", label: "Audit trail" }, { to: "/economics", label: "Economics" }]} />
    <div className="dashboard-grid evidence-grid">
      <section className="panel">
        <div className="panel-head"><div><h2>Evidence records</h2><p>Operational evidence inventory</p></div><Badge tone="muted">{evidence?.length ?? 0}</Badge></div>
        <div className="panel-body">
          <TimelineList limit={10} items={(evidence ?? []).map(item => ({ id: item.evidenceId, title: item.title, meta: `${item.kind} · ${item.source} · ${new Date(item.createdAt).toLocaleTimeString()}`, detail: item.summary }))} />
        </div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Diagnostics</h2><p>Readiness diagnostics and recommended actions</p></div><Badge tone="muted">{diagnostics?.length ?? 0}</Badge></div>
        <div className="panel-body">
          <TimelineList limit={10} items={(diagnostics ?? []).map(item => ({ id: item.diagnosticId, title: item.status, meta: new Date(item.createdAt).toLocaleTimeString(), detail: item.summary, tone: item.status === "pass" ? "good" : item.status === "fail" || item.status === "error" ? "warn" : "muted" }))} />
        </div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Traceability</h2><p>Follow the operational flow</p></div></div>
        <div className="panel-body">
          <p className="panel-note">Evidence links Agents → Composition → Execution → Economics. Each surface renders Product API projections only.</p>
          <CrossLinks links={[{ to: "/agents", label: "Agents" }, { to: "/operational-execution", label: "Execution" }, { to: "/economics", label: "Economics" }]} />
        </div>
      </section>
    </div>
  </>;
}

function AuditView() {
  const { data: audit, loadState, loadError, stale, refresh } = useOperationalSummary<AuditEntry[]>(
    () => productApi.listAuditEntries(),
    "Unable to load audit trail from Product API",
    () => false,
  );
  return <>
    <DomainHeader domain="Evidence" title="Audit Trail" description="Governed operations and audit evidence from the Product API. Audit truth is never recomputed in the UI." actions={<button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>Refresh</button>} />
    <div className="guardrail-banner" role="note"><span>Inspection mode</span><span>Sandbox only</span><span>Read-only</span><span>Audit truth governed by Product API</span></div>
    {staleBanner({ stale, loadState, loadError }, "audit")}
    <CrossLinks links={[{ to: "/logs", label: "Events & logs" }, { to: "/operational-evidence", label: "Evidence" }, { to: "/economics", label: "Economics" }]} />
    <section className="panel">
      <div className="panel-head"><div><h2>Audit entries</h2><p>Governed operations history</p></div><Badge tone="muted">{audit?.length ?? 0}</Badge></div>
      <div className="panel-body">
        <TimelineList limit={12} items={(audit ?? []).map(entry => ({ id: entry.auditId, title: entry.operation, meta: `${entry.status} · ${entry.actor} · ${entry.entityType}:${entry.entityId} · ${new Date(entry.createdAt).toLocaleTimeString()}`, detail: entry.message, tone: entry.status === "failure" ? "warn" : entry.status === "success" ? "good" : "muted" }))} />
      </div>
    </section>
  </>;
}

function EconomicsView() {
  const { data, loadState, loadError, stale, refresh } = useOperationalSummary<EconomicSummary>(
    () => productApi.getEconomicSummary(),
    "Unable to load economics from Product API",
    () => false,
  );
  const quotes = useOperationalSummary<Quote[]>(
    () => productApi.listQuotes(),
    "Unable to load quotes from Product API",
    () => false,
  );
  const reservations = useOperationalSummary<Reservation[]>(
    () => productApi.listReservations(),
    "Unable to load reservations from Product API",
    () => false,
  );
  const metering = useOperationalSummary<MeteringRecord[]>(
    () => productApi.listMeteringRecords(),
    "Unable to load metering records from Product API",
    () => false,
  );
  const settlements = useOperationalSummary<Settlement[]>(
    () => productApi.listSettlements(),
    "Unable to load settlements from Product API",
    () => false,
  );
  const receipts = useOperationalSummary<Receipt[]>(
    () => productApi.listReceipts(),
    "Unable to load receipts from Product API",
    () => false,
  );
  const formatEconomicAmount = (value: string | number | undefined, unit?: string) => value === undefined || value === null || value === "" ? "unavailable" : unit ? `${value} ${unit}` : String(value);
  const allBoundaryLinks = [
    { to: "/system/billing-boundary", label: "Billing boundary" },
    { to: "/system/pricing-invoice-boundary", label: "Pricing & invoice boundary" },
    { to: "/system/payment-rails-boundary", label: "Payment rails boundary" },
    { to: "/system/tenant-billing-boundary", label: "Tenant accountability boundary" },
    { to: "/system/settlement-reconciliation", label: "Settlement & receipt boundary" },
    { to: "/system/financial-audit", label: "Financial audit boundary" },
    { to: "/system/billing-acceptance", label: "Acceptance & claims" },
  ];
  return <>
    <DomainHeader domain="Economics" title="Economics" description="Operational usage and financial-boundary evidence from the Product API. Usage, economics and billing are separate truths." actions={<button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>Refresh</button>} />
    <div className="guardrail-banner" role="note"><span>Inspection mode</span><span>Sandbox only</span><span>Production ready = false</span><span>Operational truth ≠ economic truth ≠ billing truth</span><span>Missing values are unavailable, not zero</span></div>
    {staleBanner({ stale, loadState, loadError }, "economics")}
    <div className="flow-group">
      <div className="flow-group-head"><h2>Primary financial boundary</h2><p>Product API values only. The UI labels authority and never upgrades operational records into billing claims.</p></div>
      <div className="dashboard-grid execution-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Scope and totals</h2><p>Canonical Economics domain</p></div><Badge tone="muted">{data?.unit ?? "unit unavailable"}</Badge></div>
          <div className="panel-body">
            {data
              ? <div className="summary-list">
                <SummaryRow label="Economic unit" value={data.unit || data.currency || "unavailable"} />
                <SummaryRow label="Currency claim" value={data.currency ? `${data.currency} / operational unit only` : "unavailable"} tone="muted" />
                <SummaryRow label="Context" value={data.neuronsContext || "unavailable"} />
                <SummaryRow label="Estimated usage value" value={formatEconomicAmount(data.totalEstimated, data.unit)} />
                <SummaryRow label="Reserved usage value" value={formatEconomicAmount(data.totalReserved, data.unit)} />
                <SummaryRow label="Metered usage value" value={formatEconomicAmount(data.totalMetered, data.unit)} />
                <SummaryRow label="Settled operational value" value={formatEconomicAmount(data.totalSettled, data.unit)} />
                <SummaryRow label="Tenant scope" value="unavailable from current Product API projection" tone="muted" />
              </div>
              : <PanelStateLine state={loadState} error={loadError} emptyMessage="No economics available." />}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Claim discipline</h2><p>What these numbers may and may not mean</p></div><Badge tone="muted">no billing claim</Badge></div>
          <div className="panel-body">
            <div className="summary-list">
              <SummaryRow label="Authoritative source" value="Product API operational economics endpoints" />
              <SummaryRow label="Estimated" value="Pre-execution economic estimate, not settled cost" />
              <SummaryRow label="Metered" value="Recorded execution usage/economic event" />
              <SummaryRow label="Settled / receipt" value="Operational receipt evidence, not invoice or payment settlement" />
              <SummaryRow label="$Neurons" value="Implemented operational asset/unit only; no wallet, exchange or ecosystem transaction claim" />
            </div>
          </div>
        </section>
      </div>
    </div>
    <SectionDisclosure title="Secondary — workload attribution" summary="Agent, deployment, runtime and execution aggregates only where Product API supplies them." tier="Secondary">
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Agent attribution</h2><p>Contextual aggregate, Economics-owned</p></div><Badge tone="muted">{data?.agentConsumption.length ?? 0}</Badge></div>
          <div className="panel-body"><TimelineList limit={6} items={(data?.agentConsumption ?? []).map((item) => ({ id: item.entityId, title: item.entityId, meta: `${item.status} · ${formatEconomicAmount(item.amount, item.unit)}`, detail: "Agent attribution from Product API economics summary.", tone: item.status === "available" ? "good" : item.status === "limited" ? "warn" : "muted" }))} /></div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Execution attribution</h2><p>Run-scoped values when available</p></div><Badge tone="muted">{data?.executionRunConsumption.length ?? 0}</Badge></div>
          <div className="panel-body"><TimelineList limit={6} items={(data?.executionRunConsumption ?? []).map((item) => ({ id: item.entityId, title: item.entityId, meta: `${item.status} · ${formatEconomicAmount(item.amount, item.unit)}`, detail: "Execution-run economic context; operational detail remains in Operations.", tone: item.status === "available" ? "good" : item.status === "limited" ? "warn" : "muted" }))} /></div>
        </section>
      </div>
    </SectionDisclosure>
    <SectionDisclosure title="Secondary — quotes and reservations" summary="Operational quote/reservation visibility before and during execution; not payment authorization." tier="Secondary">
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Quotes</h2><p>Estimated operational economics</p></div><Badge tone="muted">{quotes.data?.length ?? 0}</Badge></div>
          <div className="panel-body">
            <TimelineList limit={8} items={(quotes.data ?? []).map(item => ({ id: item.quoteId, title: item.quoteId, meta: `${item.status} · ${item.agentId ?? "agent unavailable"} · estimated ${formatEconomicAmount(item.amount, item.unit)}`, detail: item.eligibility.eligible ? "eligible; not a billing authorization" : `not eligible: ${item.eligibility.reasons?.join("; ") || "reason unavailable"}`, tone: item.eligibility.eligible ? "good" : "warn" }))} />
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Reservations</h2><p>Reserved operational value</p></div><Badge tone="muted">{reservations.data?.length ?? 0}</Badge></div>
          <div className="panel-body">
            <TimelineList limit={8} items={(reservations.data ?? []).map(item => ({ id: item.reservationId, title: item.reservationId, meta: `${item.status} · ${item.agentId ?? "agent unavailable"} · reserved ${formatEconomicAmount(item.amount, item.unit)}`, detail: item.failureReason ?? `quote ${item.quoteId}; no payment capture implied`, tone: item.status === "reserved" || item.status === "confirmed" ? "good" : item.status === "failed" ? "warn" : "muted" }))} />
          </div>
        </section>
      </div>
    </SectionDisclosure>
    <SectionDisclosure title="Diagnostic — metering, settlement and receipt evidence" summary="Execution-level operational accounting evidence. Legal billing and payment rails remain not claimed." tier="Diagnostic">
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Metering</h2><p>Recorded usage per execution run</p></div><Badge tone="muted">{metering.data?.length ?? 0}</Badge></div>
          <div className="panel-body">
            <TimelineList limit={8} items={(metering.data ?? []).map(item => ({ id: item.meterId, title: item.meterId, meta: `${item.status} · ${item.executionRunId} · metered ${formatEconomicAmount(item.amount, item.unit)}`, detail: `${item.target}; provider ${item.providerId ?? "unavailable"}`, tone: item.status === "settled" ? "good" : item.status === "failed" ? "warn" : "muted" }))} />
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Settlements</h2><p>Operational settlement records</p></div><Badge tone="muted">{settlements.data?.length ?? 0}</Badge></div>
          <div className="panel-body">
            <TimelineList limit={8} items={(settlements.data ?? []).map(item => ({ id: item.settlementId, title: item.settlementId, meta: `${item.status} · ${item.executionRunId ?? "run unavailable"} · ${formatEconomicAmount(item.amount, item.unit)}`, detail: item.failureReason ?? "operational settlement record; not legal settlement", tone: item.status === "settled" ? "good" : item.status === "failed" ? "warn" : "muted" }))} />
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Receipts</h2><p>Operational receipts only</p></div><Badge tone="muted">{receipts.data?.length ?? 0}</Badge></div>
          <div className="panel-body">
            <TimelineList limit={8} items={(receipts.data ?? []).map(item => ({ id: item.receiptId, title: item.receiptId, meta: `${item.status} · ${item.executionRunId} · ${formatEconomicAmount(item.amount, item.unit)}`, detail: `${item.summary}; not invoice/payment receipt`, tone: item.status === "issued" || item.status === "settled" ? "good" : "warn" }))} />
          </div>
        </section>
      </div>
    </SectionDisclosure>
    <SectionDisclosure title="Diagnostic — Product API warnings" summary="Economic warnings are operational findings, not budget or billing judgments." tier="Diagnostic">
      <section className="panel">
        <div className="panel-head"><div><h2>Warnings</h2><p>Operational findings</p></div><Badge tone="muted">{data?.warnings.length ?? 0}</Badge></div>
        <div className="panel-body">
            <TimelineList items={(data?.warnings ?? []).map((warning, index) => ({ id: `warning-${index}`, title: warning.severity, detail: warning.message, tone: warning.severity === "error" ? "warn" : undefined }))} />
        </div>
      </section>
    </SectionDisclosure>
    <div className="flow-group">
      <div className="flow-group-head"><h2>Boundary evidence</h2><p>EPIC-13 reports are Economics children. They prove financial no-claims; they are not billing products.</p></div>
      <section className="panel blocked-panel"><div className="panel-head"><div><h2>Not billing</h2><p>Governed read-only economics</p></div><Badge tone="muted">all billing claims not claimed</Badge></div><p className="panel-note">Billing, invoices, payment rails, tenant billing, balances, budgets, wallets, exchange rates and production financial operations are not implemented ACS claims. Open the boundary reports for evidence.</p><CrossLinks links={allBoundaryLinks} /></section>
    </div>
  </>;
}

function PaymentRailsBoundaryView() {
  const { data, loadState, loadError, stale, refresh } = useOperationalSummary<PaymentRailsBoundaryReport>(
    () => productApi.getPaymentRailsBoundaryReport(),
    "Unable to load payment rails boundary from Product API",
    () => false,
  );
  const paymentProviderBoundary = data?.paymentProviderBoundary;
  const authorizationCaptureBoundary = data?.authorizationCaptureBoundary;
  const noMoneyMovementGuardrail = data?.noMoneyMovementGuardrail;
  const refundChargebackBoundary = data?.refundChargebackBoundary;
  const paymentSecretBoundary = data?.paymentSecretBoundary;
  const readinessGates = data?.readinessGates ?? [];
  const failureDeferredStates = data?.failureDeferredStates ?? [];

  return <>
    <header className="page-head compact">
      <div>
        <p className="eyebrow">PAYMENT RAILS BOUNDARY</p>
        <h1>Payment Rails Boundary</h1>
        <p>Read-only boundary projection for payment provider, authorization, capture, refund and chargeback concepts. No real money movement is allowed here.</p>
      </div>
      <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
    </header>
    <div className="guardrail-banner" role="note">
      <span>Inspection mode</span>
      <span>Sandbox only</span>
      <span>Read-only</span>
      <span>Product API is source of truth</span>
      <span>No real authorization / capture / refund / chargeback</span>
    </div>
    {staleBanner({ stale, loadState, loadError }, "payment rails boundary")}
    <CrossLinks links={[
      { to: "/economics", label: "Economics" },
      { to: "/system/billing-boundary", label: "Billing boundary" },
      { to: "/system/pricing-invoice-boundary", label: "Pricing & invoice boundary" },
    ]} />
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Claims</h2>
        <p>All payment claims remain explicitly not claimed.</p>
      </div>
      <div className="dashboard-grid execution-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Status</h2><p>Governed claims snapshot</p></div></div>
          <div className="panel-body">
            <div className="summary-list">
              <SummaryRow label="Payment Ready" value={data?.paymentReady ? "YES" : "NO / not yet claimed"} tone={data?.paymentReady ? "good" : "muted"} />
              <SummaryRow label="Refund Ready" value={data?.refundReady ? "YES" : "NO / not yet claimed"} tone={data?.refundReady ? "good" : "muted"} />
              <SummaryRow label="Chargeback Ready" value={data?.chargebackReady ? "YES" : "NO / not yet claimed"} tone={data?.chargebackReady ? "good" : "muted"} />
              <SummaryRow label="Production Financial Operations" value={data?.productionFinancialOperationsReady ? "YES" : "NO / not yet claimed"} tone={data?.productionFinancialOperationsReady ? "good" : "muted"} />
              <SummaryRow label="Claim" value={data?.claim ?? "not_claimed"} tone="muted" />
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Boundary model</h2><p>Provider and integration posture</p></div></div>
          <div className="panel-body">
            {paymentProviderBoundary
              ? <div className="summary-list">
                <SummaryRow label="Provider" value={`${paymentProviderBoundary.providerName} (${paymentProviderBoundary.providerType})`} />
                <SummaryRow label="Provider state" value={paymentProviderBoundary.providerState} />
                <SummaryRow label="Integration state" value={paymentProviderBoundary.integrationState} />
                <SummaryRow label="Credential state" value={paymentProviderBoundary.credentialBoundaryState} />
                <SummaryRow label="Authorization support" value={paymentProviderBoundary.authorizationSupportState} />
                <SummaryRow label="Capture support" value={paymentProviderBoundary.captureSupportState} />
                <SummaryRow label="Refund support" value={paymentProviderBoundary.refundSupportState} />
                <SummaryRow label="Chargeback support" value={paymentProviderBoundary.chargebackSupportState} />
                <SummaryRow label="Settlement dependency" value={paymentProviderBoundary.settlementDependency} />
              </div>
              : <PanelStateLine state={loadState} error={loadError} emptyMessage="No payment provider boundary available." />}
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Authorization / capture</h2>
        <p>Authorization and capture are conceptual only in this milestone.</p>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Authorization vs capture</h2><p>Read-only state model</p></div></div>
          <div className="panel-body">
            {authorizationCaptureBoundary
              ? <div className="summary-list">
                <SummaryRow label="Authorization intent" value={authorizationCaptureBoundary.authorizationIntent} />
                <SummaryRow label="Authorization state" value={authorizationCaptureBoundary.authorizationState} />
                <SummaryRow label="Capture state" value={authorizationCaptureBoundary.captureState} />
                <SummaryRow label="Capture dependency" value={authorizationCaptureBoundary.captureDependency} />
                <SummaryRow label="Settlement dependency" value={authorizationCaptureBoundary.settlementDependency} />
              </div>
              : <PanelStateLine state={loadState} error={loadError} emptyMessage="No authorization / capture boundary available." />}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>No-money-movement guardrail</h2><p>Hard stop for real payment activity</p></div></div>
          <div className="panel-body">
            {noMoneyMovementGuardrail
              ? <div className="summary-list">
                {noMoneyMovementGuardrail.statements.map((statement: string, index: number) => <SummaryRow key={`${statement}-${index}`} label={`Guardrail ${index + 1}`} value={statement} tone="muted" />)}
              </div>
              : <PanelStateLine state={loadState} error={loadError} emptyMessage="No guardrail snapshot available." />}
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Failure, secrets, and deferred scope</h2>
        <p>All unsupported paths remain deferred or blocked.</p>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Failure / deferred states</h2><p>Payment boundary vocabulary</p></div></div>
          <div className="panel-body">
            <TimelineList items={failureDeferredStates.map((item: string, index: number) => ({ id: `${item}-${index}`, title: item, tone: "muted" }))} />
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Secret boundary</h2><p>Credential posture</p></div></div>
          <div className="panel-body">
            {paymentSecretBoundary
              ? <div className="summary-list">
                <SummaryRow label="Secret class" value={paymentSecretBoundary.requiredSecretsClass.join(", ")} />
                <SummaryRow label="Storage requirement" value={paymentSecretBoundary.storageRequirement} />
                <SummaryRow label="Injection boundary" value={paymentSecretBoundary.injectionBoundary} />
                <SummaryRow label="Redaction requirement" value={paymentSecretBoundary.redactionRequirement} />
                <SummaryRow label="Production credential status" value={paymentSecretBoundary.productionCredentialStatus} />
              </div>
              : <PanelStateLine state={loadState} error={loadError} emptyMessage="No secret boundary available." />}
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Refund / chargeback and gates</h2>
        <p>Claim discipline blocks all financial readiness claims here.</p>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Refund / chargeback boundary</h2><p>Conceptual only</p></div></div>
          <div className="panel-body">
            {refundChargebackBoundary
              ? <div className="summary-list">
                <SummaryRow label="Refund boundary" value={refundChargebackBoundary.refundBoundary} />
                <SummaryRow label="Chargeback boundary" value={refundChargebackBoundary.chargebackBoundary} />
                <SummaryRow label="Dispute workflow" value={refundChargebackBoundary.disputeWorkflowDependency} />
                <SummaryRow label="Accounting dependency" value={refundChargebackBoundary.accountingDependency} />
                <SummaryRow label="Compliance caveat" value={refundChargebackBoundary.complianceCaveat} />
              </div>
              : <PanelStateLine state={loadState} error={loadError} emptyMessage="No refund / chargeback boundary available." />}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Readiness gates</h2><p>Claim impact remains blocked</p></div><Badge tone={readinessGates.length ? "good" : "muted"}>{readinessGates.length}</Badge></div>
          <div className="panel-body">
            <TimelineList items={(readinessGates ?? []).map((gate: PaymentRailsBoundaryReport["readinessGates"][number]) => ({
              id: gate.id,
              title: gate.label,
              meta: `${gate.status} · ${gate.claimImpact}`,
              detail: `${gate.evidence.join(" · ") || "No evidence"}${gate.blockers.length ? ` · blockers: ${gate.blockers.join(" · ")}` : ""}${gate.caveats.length ? ` · caveats: ${gate.caveats.join(" · ")}` : ""}`,
              tone: gate.status === "blocked" ? "warn" : gate.status === "partial" ? "muted" : undefined,
            }))} />
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Evidence and scope</h2>
        <p>Visible evidence only; deferred EPIC-14+ scope stays deferred.</p>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Source evidence</h2><p>Product API snapshot</p></div></div>
          <div className="panel-body">
            <TimelineList items={(data?.sourceEvidence ?? []).map((item: string, index: number) => ({ id: `${item}-${index}`, title: item, tone: "muted" }))} />
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Deferred scope</h2><p>EPIC-14+ candidates only</p></div><Badge tone="muted">{data?.deferredScope?.length ?? 0}</Badge></div>
          <div className="panel-body">
            <TimelineList items={(data?.deferredScope ?? []).map((item: string, index: number) => ({ id: `${item}-${index}`, title: item, tone: "muted" }))} />
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Claim discipline</h2>
        <p>Payment-related financial claims remain NO / not yet claimed.</p>
      </div>
      <section className="panel blocked-panel">
        <div className="panel-head"><div><h2>Claim discipline</h2><p>No financial readiness claims in this milestone</p></div><Badge tone="muted">not claimed</Badge></div>
        <div className="panel-body">
          <div className="summary-list">
            <SummaryRow label="Payment Ready claim" value={data?.claimDiscipline?.paymentReadyClaimAllowed ? "allowed" : "NO / not yet claimed"} tone="muted" />
            <SummaryRow label="Refund Ready claim" value={data?.claimDiscipline?.refundReadyClaimAllowed ? "allowed" : "NO / not yet claimed"} tone="muted" />
            <SummaryRow label="Chargeback Ready claim" value={data?.claimDiscipline?.chargebackReadyClaimAllowed ? "allowed" : "NO / not yet claimed"} tone="muted" />
            <SummaryRow label="Billing Ready claim" value={data?.claimDiscipline?.billingReadyClaimAllowed ? "allowed" : "NO / not yet claimed"} tone="muted" />
            <SummaryRow label="Production Financial Operations claim" value={data?.claimDiscipline?.productionFinancialOperationsClaimAllowed ? "allowed" : "NO / not yet claimed"} tone="muted" />
            <SummaryRow label="Reason" value={data?.claimDiscipline?.reason ?? "claim discipline remains blocked"} />
          </div>
        </div>
      </section>
    </div>
  </>;
}

function PricingInvoiceBoundaryView() {
  const { data, loadState, loadError, stale, refresh } = useOperationalSummary<PricingInvoiceBoundaryReport>(
    () => productApi.getPricingInvoiceBoundaryReport(),
    "Unable to load pricing and invoice boundary from Product API",
    () => false,
  );
  const pricingBoundary = data?.pricingBoundary;
  const quoteCandidates = data?.quoteCandidates ?? [];
  const quoteToInvoiceFlow = data?.quoteToInvoiceFlow;
  const invoiceCandidates = data?.invoiceCandidates ?? [];
  const invoiceArtifactBoundary = data?.invoiceArtifactBoundary;
  const readinessGates = data?.readinessGates ?? [];

  return <>
    <header className="page-head compact">
      <div>
        <p className="eyebrow">PRICING, QUOTE &amp; INVOICE CONTRACTS</p>
        <h1>Pricing, Quote &amp; Invoice Contracts</h1>
        <p>Read-only boundary projection for pricing, quote candidates and invoice candidate contracts. No real invoice or payment activity is allowed here.</p>
      </div>
      <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
    </header>
    <div className="guardrail-banner" role="note">
      <span>Inspection mode</span>
      <span>Sandbox only</span>
      <span>Read-only</span>
      <span>Product API is source of truth</span>
      <span>No real invoice / no payment / no money movement</span>
    </div>
    {staleBanner({ stale, loadState, loadError }, "pricing and invoice boundary")}
    <CrossLinks links={[
      { to: "/economics", label: "Economics" },
      { to: "/system/billing-boundary", label: "Billing boundary" },
      { to: "/system/payment-rails-boundary", label: "Payment rails boundary" },
    ]} />
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Claims</h2>
        <p>All pricing, invoice and tax claims remain explicitly not claimed.</p>
      </div>
      <div className="dashboard-grid execution-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Status</h2><p>Governed claims snapshot</p></div></div>
          <div className="panel-body">
            <div className="summary-list">
              <SummaryRow label="Pricing Ready" value={data?.pricingReady ? "YES" : "NO / not yet claimed"} tone={data?.pricingReady ? "good" : "muted"} />
              <SummaryRow label="Invoice Ready" value={data?.invoiceReady ? "YES" : "NO / not yet claimed"} tone={data?.invoiceReady ? "good" : "muted"} />
              <SummaryRow label="Billing Ready" value={data?.billingReady ? "YES" : "NO / not yet claimed"} tone={data?.billingReady ? "good" : "muted"} />
              <SummaryRow label="Payment Ready" value={data?.paymentReady ? "YES" : "NO / not yet claimed"} tone={data?.paymentReady ? "good" : "muted"} />
              <SummaryRow label="Tenant Billing Ready" value={data?.tenantBillingReady ? "YES" : "NO / not yet claimed"} tone={data?.tenantBillingReady ? "good" : "muted"} />
              <SummaryRow label="Production Financial Operations" value={data?.productionFinancialOperationsReady ? "YES" : "NO / not yet claimed"} tone={data?.productionFinancialOperationsReady ? "good" : "muted"} />
              <SummaryRow label="Tax Ready" value={data?.taxReady ? "YES" : "NO / not yet claimed"} tone={data?.taxReady ? "good" : "muted"} />
              <SummaryRow label="Compliance Ready" value={data?.complianceReady ? "YES" : "NO / not yet claimed"} tone={data?.complianceReady ? "good" : "muted"} />
              <SummaryRow label="Claim" value={data?.claim ?? "not_claimed"} tone="muted" />
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Pricing boundary</h2><p>Source-of-truth posture and dependencies</p></div></div>
          <div className="panel-body">
            {pricingBoundary
              ? <div className="summary-list">
                <SummaryRow label="Pricing boundary status" value={pricingBoundary.pricingBoundaryStatus} />
                <SummaryRow label="Pricing source" value={pricingBoundary.pricingSource} />
                <SummaryRow label="Pricing authority" value={pricingBoundary.pricingAuthority} />
                <SummaryRow label="Pricing state" value={pricingBoundary.pricingState} />
                <SummaryRow label="Financial truth dependency" value={pricingBoundary.financialTruthDependency} />
                <SummaryRow label="Billable event dependency" value={pricingBoundary.billableEventDependency} />
                <SummaryRow label="Quote dependency" value={pricingBoundary.quoteDependency} />
              </div>
              : <PanelStateLine state={loadState} error={loadError} emptyMessage="No pricing boundary available." />}
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Quote candidates</h2>
        <p>Candidate quotes remain conceptual and evidence-bounded.</p>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Quote candidates</h2><p>Read-only candidate set</p></div><Badge tone="muted">{quoteCandidates.length}</Badge></div>
          <div className="panel-body">
            <TimelineList items={quoteCandidates.map((quote, index) => ({
              id: `${quote.quoteCandidateId}-${index}`,
              title: quote.quoteCandidateId,
              meta: `${quote.amountState} · ${quote.currencyState} · ${quote.approvalState}`,
              detail: `${quote.relatedBillableEvent}${quote.blockers.length ? ` · blockers: ${quote.blockers.join(" · ")}` : ""}${quote.caveats.length ? ` · caveats: ${quote.caveats.join(" · ")}` : ""}`,
              tone: quote.amountState === "computed_candidate" ? "good" : "muted",
            }))} />
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Quote-to-invoice flow</h2><p>Conceptual boundary only</p></div></div>
          <div className="panel-body">
            {quoteToInvoiceFlow
              ? <div className="summary-list">
                <SummaryRow label="Status" value={quoteToInvoiceFlow.status} />
                <SummaryRow label="Financial truth" value={quoteToInvoiceFlow.requiredFinancialTruth} />
                <SummaryRow label="Pricing source" value={quoteToInvoiceFlow.requiredPricingSource} />
                <SummaryRow label="Invoice boundary" value={quoteToInvoiceFlow.requiredInvoiceBoundary} />
                <SummaryRow label="Compliance / tax decision" value={quoteToInvoiceFlow.requiredComplianceTaxDecision} />
              </div>
              : <PanelStateLine state={loadState} error={loadError} emptyMessage="No quote-to-invoice flow available." />}
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Invoice candidates</h2>
        <p>Invoice artifacts remain candidates, not legal/tax invoices.</p>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Invoice candidates</h2><p>Read-only candidate set</p></div><Badge tone="muted">{invoiceCandidates.length}</Badge></div>
          <div className="panel-body">
            <TimelineList items={invoiceCandidates.map((invoice, index) => ({
              id: `${invoice.invoiceCandidateId}-${index}`,
              title: invoice.invoiceCandidateId,
              meta: `${invoice.artifactState} · ${invoice.legalTaxState} · ${invoice.approvalState}`,
              detail: `${invoice.relatedQuoteCandidate}${invoice.blockers.length ? ` · blockers: ${invoice.blockers.join(" · ")}` : ""}${invoice.caveats.length ? ` · caveats: ${invoice.caveats.join(" · ")}` : ""}`,
              tone: invoice.artifactState === "draft_candidate" ? "good" : "muted",
            }))} />
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Invoice artifact boundary</h2><p>Legal/tax and accounting caveats remain deferred</p></div></div>
          <div className="panel-body">
            {invoiceArtifactBoundary
              ? <div className="summary-list">
                <SummaryRow label="Invoice candidate" value={invoiceArtifactBoundary.invoiceCandidate} />
                <SummaryRow label="Operational invoice artifact" value={invoiceArtifactBoundary.operationalInvoiceArtifact} />
                <SummaryRow label="Legal/tax invoice" value={invoiceArtifactBoundary.legalTaxInvoice} />
                <SummaryRow label="Tax-compliant invoice" value={invoiceArtifactBoundary.taxCompliantInvoice} />
                <SummaryRow label="Accounting invoice" value={invoiceArtifactBoundary.accountingInvoice} />
                <SummaryRow label="Receipt" value={invoiceArtifactBoundary.receipt} />
                <SummaryRow label="Payment request" value={invoiceArtifactBoundary.paymentRequest} />
                <SummaryRow label="Legal/tax readiness" value={invoiceArtifactBoundary.legalTaxInvoiceReadiness} />
                <SummaryRow label="Compliance readiness" value={invoiceArtifactBoundary.complianceReadiness} />
                <SummaryRow label="Accounting integration" value={invoiceArtifactBoundary.accountingIntegration} />
                <SummaryRow label="Country-specific tax automation" value={invoiceArtifactBoundary.countrySpecificTaxAutomation} />
              </div>
              : <PanelStateLine state={loadState} error={loadError} emptyMessage="No invoice artifact boundary available." />}
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Readiness gates</h2>
        <p>Claim impact remains blocked for pricing, invoice and production financial operations.</p>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Readiness gates</h2><p>Contractual gates</p></div><Badge tone={readinessGates.length ? "good" : "muted"}>{readinessGates.length}</Badge></div>
          <div className="panel-body">
            <TimelineList items={readinessGates.map((gate: PricingInvoiceBoundaryReport["readinessGates"][number]) => ({
              id: gate.id,
              title: gate.label,
              meta: `${gate.status} · ${Array.isArray(gate.claimImpact) ? gate.claimImpact.join(" · ") : gate.claimImpact}`,
              detail: `${gate.evidence.join(" · ") || "No evidence"}${gate.blockers.length ? ` · blockers: ${gate.blockers.join(" · ")}` : ""}${gate.caveats.length ? ` · caveats: ${gate.caveats.join(" · ")}` : ""}`,
              tone: gate.status === "blocked" ? "warn" : gate.status === "partial" ? "muted" : undefined,
            }))} />
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Claims discipline</h2><p>All pricing and invoice claims remain explicitly not claimed.</p></div></div>
          <div className="panel-body">
            <div className="summary-list">
              <SummaryRow label="Pricing Ready claim" value={data?.claimDiscipline?.pricingReadyClaimAllowed ? "allowed" : "NO / not yet claimed"} tone="muted" />
              <SummaryRow label="Invoice Ready claim" value={data?.claimDiscipline?.invoiceReadyClaimAllowed ? "allowed" : "NO / not yet claimed"} tone="muted" />
              <SummaryRow label="Billing Ready claim" value={data?.claimDiscipline?.billingReadyClaimAllowed ? "allowed" : "NO / not yet claimed"} tone="muted" />
              <SummaryRow label="Payment Ready claim" value={data?.claimDiscipline?.paymentReadyClaimAllowed ? "allowed" : "NO / not yet claimed"} tone="muted" />
              <SummaryRow label="Tenant Billing Ready claim" value={data?.claimDiscipline?.tenantBillingReadyClaimAllowed ? "allowed" : "NO / not yet claimed"} tone="muted" />
              <SummaryRow label="Production Financial Operations claim" value={data?.claimDiscipline?.productionFinancialOperationsClaimAllowed ? "allowed" : "NO / not yet claimed"} tone="muted" />
              <SummaryRow label="Tax Ready claim" value={data?.claimDiscipline?.taxReadyClaimAllowed ? "allowed" : "NO / not yet claimed"} tone="muted" />
              <SummaryRow label="Compliance Ready claim" value={data?.claimDiscipline?.complianceReadyClaimAllowed ? "allowed" : "NO / not yet claimed"} tone="muted" />
              <SummaryRow label="Reason" value={data?.claimDiscipline?.reason ?? "claim discipline remains blocked"} />
            </div>
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Evidence and scope</h2>
        <p>Visible evidence only; deferred EPIC-14+ scope stays deferred.</p>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Source evidence</h2><p>Product API snapshot</p></div></div>
          <div className="panel-body">
            <TimelineList items={(data?.sourceEvidence ?? []).map((item: string, index: number) => ({ id: `${item}-${index}`, title: item, tone: "muted" }))} />
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Deferred scope</h2><p>EPIC-14+ candidates only</p></div><Badge tone="muted">{data?.deferredScope?.length ?? 0}</Badge></div>
          <div className="panel-body">
            <TimelineList items={(data?.deferredScope ?? []).map((item: string, index: number) => ({ id: `${item}-${index}`, title: item, tone: "muted" }))} />
          </div>
        </section>
      </div>
    </div>
  </>;
}

function BillingBoundaryView() {
  const { data, loadState, loadError, stale, refresh } = useOperationalSummary<BillingBoundaryReport>(
    () => productApi.getBillingBoundaryReport(),
    "Unable to load billing boundary from Product API",
    () => false,
  );
  const financialTruth = data?.financialTruth;
  const billingBoundary = data?.billingBoundary;
  const billableEventCandidates = data?.billableEventCandidates ?? [];
  const readinessGates = data?.readinessGates ?? [];

  return <>
    <header className="page-head compact">
      <div>
        <p className="eyebrow">BILLING BOUNDARY &amp; FINANCIAL TRUTH</p>
        <h1>Billing Boundary &amp; Financial Truth</h1>
        <p>Read-only boundary projection for financial truth, billing intent and billable event candidates. No billing mutation or real money movement is allowed here.</p>
      </div>
      <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
    </header>
    <div className="guardrail-banner" role="note">
      <span>Inspection mode</span>
      <span>Sandbox only</span>
      <span>Read-only</span>
      <span>Product API is source of truth</span>
      <span>No billing mutation / no invoice / no payment / no money movement</span>
    </div>
    {staleBanner({ stale, loadState, loadError }, "billing boundary")}
    <CrossLinks links={[
      { to: "/economics", label: "Economics" },
      { to: "/system/pricing-invoice-boundary", label: "Pricing & invoice boundary" },
      { to: "/system/payment-rails-boundary", label: "Payment rails boundary" },
      { to: "/system/tenant-billing-boundary", label: "Tenant billing boundary" },
    ]} />
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Claims</h2>
        <p>All billing and financial-operation claims remain explicitly not claimed.</p>
      </div>
      <div className="dashboard-grid execution-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Status</h2><p>Governed claims snapshot</p></div></div>
          <div className="panel-body">
            <div className="summary-list">
              <SummaryRow label="Billing Ready" value={data?.billingReady ? "YES" : "NO / not yet claimed"} tone={data?.billingReady ? "good" : "muted"} />
              <SummaryRow label="Payment Ready" value={data?.paymentReady ? "YES" : "NO / not yet claimed"} tone={data?.paymentReady ? "good" : "muted"} />
              <SummaryRow label="Invoice Ready" value={data?.invoiceReady ? "YES" : "NO / not yet claimed"} tone={data?.invoiceReady ? "good" : "muted"} />
              <SummaryRow label="Tenant Billing Ready" value={data?.tenantBillingReady ? "YES" : "NO / not yet claimed"} tone={data?.tenantBillingReady ? "good" : "muted"} />
              <SummaryRow label="Production Financial Operations" value={data?.productionFinancialOperationsReady ? "YES" : "NO / not yet claimed"} tone={data?.productionFinancialOperationsReady ? "good" : "muted"} />
              <SummaryRow label="Claim" value={data?.claim ?? "not_claimed"} tone="muted" />
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Financial truth</h2><p>Source candidates and evidence posture</p></div></div>
          <div className="panel-body">
            {financialTruth
              ? <div className="summary-list">
                <SummaryRow label="Source id" value={financialTruth.sourceId} />
                <SummaryRow label="Source name" value={financialTruth.sourceName} />
                <SummaryRow label="Source type" value={financialTruth.sourceType} />
                <SummaryRow label="Authority level" value={financialTruth.authorityLevel} />
                <SummaryRow label="State" value={financialTruth.state} />
                <SummaryRow label="Claim impact" value={financialTruth.claimImpact} />
              </div>
              : <PanelStateLine state={loadState} error={loadError} emptyMessage="No financial truth snapshot available." />}
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Billing boundary</h2>
        <p>Billing intent and evidence-bounded dependency model.</p>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Boundary model</h2><p>Read-only posture</p></div></div>
          <div className="panel-body">
            {billingBoundary
              ? <div className="summary-list">
                <SummaryRow label="Billing boundary status" value={billingBoundary.billingBoundaryStatus} />
                <SummaryRow label="Billing intent" value={billingBoundary.billingIntent} />
                <SummaryRow label="Billable event model" value={billingBoundary.billableEventModel} />
                <SummaryRow label="Financial truth dependency" value={billingBoundary.financialTruthDependency} />
                <SummaryRow label="Product API dependency" value={billingBoundary.productApiSourceOfTruthDependency} />
                <SummaryRow label="No-claim posture" value={billingBoundary.noClaimPosture} />
              </div>
              : <PanelStateLine state={loadState} error={loadError} emptyMessage="No billing boundary snapshot available." />}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Readiness gates</h2><p>Claim impact remains blocked</p></div><Badge tone={readinessGates.length ? "good" : "muted"}>{readinessGates.length}</Badge></div>
          <div className="panel-body">
            <TimelineList items={readinessGates.map((gate: BillingBoundaryReport["readinessGates"][number]) => ({
              id: gate.id,
              title: gate.label,
              meta: `${gate.status} · ${Array.isArray(gate.claimImpact) ? gate.claimImpact.join(" · ") : gate.claimImpact}`,
              detail: `${gate.evidence.join(" · ") || "No evidence"}${gate.blockers.length ? ` · blockers: ${gate.blockers.join(" · ")}` : ""}${gate.caveats.length ? ` · caveats: ${gate.caveats.join(" · ")}` : ""}`,
              tone: gate.status === "blocked" ? "warn" : gate.status === "partial" ? "muted" : undefined,
            }))} />
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Billable event candidates</h2>
        <p>Candidate events remain conceptual and evidence-bounded.</p>
      </div>
      <section className="panel">
        <div className="panel-head"><div><h2>Billable event candidates</h2><p>Read-only candidate set</p></div><Badge tone="muted">{billableEventCandidates.length}</Badge></div>
        <div className="panel-body">
          <TimelineList items={billableEventCandidates.map((event, index) => ({
            id: `${event.eventId}-${index}`,
            title: event.eventId,
            meta: `${event.eventType} · ${event.state}`,
            detail: `${event.eventSource}${event.blockers.length ? ` · blockers: ${event.blockers.join(" · ")}` : ""}${event.caveats.length ? ` · caveats: ${event.caveats.join(" · ")}` : ""}`,
            tone: event.state === "observed_evidence" ? "good" : "muted",
          }))} />
        </div>
      </section>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Evidence and scope</h2>
        <p>Visible evidence only; deferred EPIC-14+ scope stays deferred.</p>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Source evidence</h2><p>Product API snapshot</p></div></div>
          <div className="panel-body">
            <TimelineList items={(data?.sourceEvidence ?? []).map((item: string, index: number) => ({ id: `${item}-${index}`, title: item, tone: "muted" }))} />
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Deferred scope</h2><p>EPIC-14+ candidates only</p></div><Badge tone="muted">{data?.deferredScope?.length ?? 0}</Badge></div>
          <div className="panel-body">
            <TimelineList items={(data?.deferredScope ?? []).map((item: string, index: number) => ({ id: `${item}-${index}`, title: item, tone: "muted" }))} />
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Claim discipline</h2>
        <p>No financial readiness claims in this milestone.</p>
      </div>
      <section className="panel blocked-panel">
        <div className="panel-head"><div><h2>Claim discipline</h2><p>No billing financial claims in this milestone</p></div><Badge tone="muted">not claimed</Badge></div>
        <div className="panel-body">
          <div className="summary-list">
            <SummaryRow label="Billing Ready claim" value={data?.claimDiscipline?.billingReadyClaimAllowed ? "allowed" : "NO / not yet claimed"} tone="muted" />
            <SummaryRow label="Payment Ready claim" value={data?.claimDiscipline?.paymentReadyClaimAllowed ? "allowed" : "NO / not yet claimed"} tone="muted" />
            <SummaryRow label="Invoice Ready claim" value={data?.claimDiscipline?.invoiceReadyClaimAllowed ? "allowed" : "NO / not yet claimed"} tone="muted" />
            <SummaryRow label="Tenant Billing Ready claim" value={data?.claimDiscipline?.tenantBillingReadyClaimAllowed ? "allowed" : "NO / not yet claimed"} tone="muted" />
            <SummaryRow label="Production Financial Operations claim" value={data?.claimDiscipline?.productionFinancialOperationsClaimAllowed ? "allowed" : "NO / not yet claimed"} tone="muted" />
            <SummaryRow label="Reason" value={data?.claimDiscipline?.reason ?? "claim discipline remains blocked"} />
          </div>
        </div>
      </section>
    </div>
  </>;
}

function TenantBillingBoundaryView() {
  const { data, loadState, loadError, stale, refresh } = useOperationalSummary<TenantBillingBoundaryReport>(
    () => productApi.getTenantBillingBoundaryReport(),
    "Unable to load tenant billing boundary from Product API",
    () => false,
  );
  const tenantAccountResponsibility = data?.tenantAccountResponsibility;
  const payerIdentityBoundary = data?.payerIdentityBoundary;
  const operatorIdentityBoundary = data?.operatorIdentityBoundary;
  const accountOwnershipBoundary = data?.accountOwnershipBoundary;
  const billingAccountabilityBoundary = data?.billingAccountabilityBoundary;
  const readinessGates = data?.readinessGates ?? [];
  const actorMatrix = data?.actorMatrix ?? [];

  return <>
    <header className="page-head compact">
      <div>
        <p className="eyebrow">TENANT BILLING & ACCOUNT RESPONSIBILITY</p>
        <h1>Tenant Billing &amp; Account Responsibility</h1>
        <p>Read-only boundary projection for tenant, payer, operator and account accountability. No tenant billing mutation is allowed here.</p>
      </div>
      <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
    </header>
    <div className="guardrail-banner" role="note">
      <span>Inspection mode</span>
      <span>Sandbox only</span>
      <span>Read-only</span>
      <span>Product API is source of truth</span>
      <span>No tenant billing mutation / no payment method / no account mutation</span>
    </div>
    {staleBanner({ stale, loadState, loadError }, "tenant billing boundary")}
    <CrossLinks links={[
      { to: "/economics", label: "Economics" },
      { to: "/system/billing-boundary", label: "Billing boundary" },
      { to: "/system/payment-rails-boundary", label: "Payment rails boundary" },
      { to: "/system/pricing-invoice-boundary", label: "Pricing & invoice boundary" },
    ]} />
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Claims</h2>
        <p>All tenant billing claims remain explicitly not claimed.</p>
      </div>
      <div className="dashboard-grid execution-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Status</h2><p>Governed claims snapshot</p></div></div>
          <div className="panel-body">
            <div className="summary-list">
              <SummaryRow label="Tenant Billing Ready" value={data?.tenantBillingReady ? "YES" : "NO / not yet claimed"} tone={data?.tenantBillingReady ? "good" : "muted"} />
              <SummaryRow label="Tenant Administration Ready" value={data?.tenantAdministrationReady ? "YES" : "NO / not yet claimed"} tone={data?.tenantAdministrationReady ? "good" : "muted"} />
              <SummaryRow label="Billing Ready" value={data?.billingReady ? "YES" : "NO / not yet claimed"} tone={data?.billingReady ? "good" : "muted"} />
              <SummaryRow label="Payment Ready" value={data?.paymentReady ? "YES" : "NO / not yet claimed"} tone={data?.paymentReady ? "good" : "muted"} />
              <SummaryRow label="Invoice Ready" value={data?.invoiceReady ? "YES" : "NO / not yet claimed"} tone={data?.invoiceReady ? "good" : "muted"} />
              <SummaryRow label="Production Financial Operations" value={data?.productionFinancialOperationsReady ? "YES" : "NO / not yet claimed"} tone={data?.productionFinancialOperationsReady ? "good" : "muted"} />
              <SummaryRow label="Claim" value={data?.claim ?? "not_claimed"} tone="muted" />
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Tenant responsibility</h2><p>Tenant/account responsibility boundary</p></div></div>
          <div className="panel-body">
            {tenantAccountResponsibility
              ? <div className="summary-list">
                <SummaryRow label="Tenant id" value={tenantAccountResponsibility.tenantId} />
                <SummaryRow label="Tenant account id" value={tenantAccountResponsibility.tenantAccountId} />
                <SummaryRow label="Account owner state" value={tenantAccountResponsibility.accountOwnerState} />
                <SummaryRow label="Billing responsibility state" value={tenantAccountResponsibility.billingResponsibilityState} />
                <SummaryRow label="Payer dependency" value={tenantAccountResponsibility.payerDependency} />
                <SummaryRow label="Operator dependency" value={tenantAccountResponsibility.operatorDependency} />
                <SummaryRow label="Financial truth dependency" value={tenantAccountResponsibility.financialTruthDependency} />
                <SummaryRow label="Invoice dependency" value={tenantAccountResponsibility.invoiceDependency} />
                <SummaryRow label="Payment dependency" value={tenantAccountResponsibility.paymentDependency} />
              </div>
              : <PanelStateLine state={loadState} error={loadError} emptyMessage="No tenant account responsibility snapshot available." />}
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Actor boundaries</h2>
        <p>Identity and authority remain separated.</p>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Payer identity</h2><p>Who can be associated with billing accountability</p></div></div>
          <div className="panel-body">
            {payerIdentityBoundary
              ? <div className="summary-list">
                <SummaryRow label="Payer id" value={payerIdentityBoundary.payerId} />
                <SummaryRow label="Payer type" value={payerIdentityBoundary.payerType} />
                <SummaryRow label="Verification state" value={payerIdentityBoundary.payerVerificationState} />
                <SummaryRow label="Authority state" value={payerIdentityBoundary.payerAuthorityState} />
                <SummaryRow label="Billing accountability state" value={payerIdentityBoundary.billingAccountabilityState} />
                <SummaryRow label="Payment dependency" value={payerIdentityBoundary.paymentDependency} />
                <SummaryRow label="Compliance dependency" value={payerIdentityBoundary.complianceDependency} />
              </div>
              : <PanelStateLine state={loadState} error={loadError} emptyMessage="No payer identity boundary available." />}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Operator identity</h2><p>Operational actor with no billing mutation authority</p></div></div>
          <div className="panel-body">
            {operatorIdentityBoundary
              ? <div className="summary-list">
                <SummaryRow label="Operator id" value={operatorIdentityBoundary.operatorId} />
                <SummaryRow label="Operator role" value={operatorIdentityBoundary.operatorRole} />
                <SummaryRow label="Operation authority" value={operatorIdentityBoundary.operationAuthorityState} />
                <SummaryRow label="Billing action authority" value={operatorIdentityBoundary.billingActionAuthorityState} />
                <SummaryRow label="Audit responsibility" value={operatorIdentityBoundary.auditResponsibility} />
                <SummaryRow label="Actor correlation" value={operatorIdentityBoundary.actorCorrelation} />
              </div>
              : <PanelStateLine state={loadState} error={loadError} emptyMessage="No operator identity boundary available." />}
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Account accountability</h2>
        <p>Ownership and accountability are evidence-bounded only.</p>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Account ownership</h2><p>Source of ownership and related billing posture</p></div></div>
          <div className="panel-body">
            {accountOwnershipBoundary
              ? <div className="summary-list">
                <SummaryRow label="Ownership source" value={accountOwnershipBoundary.accountOwnershipSource} />
                <SummaryRow label="Billing accountability source" value={accountOwnershipBoundary.billingAccountabilitySource} />
                <SummaryRow label="Owner verification" value={accountOwnershipBoundary.ownerVerificationState} />
                <SummaryRow label="Payer relation" value={accountOwnershipBoundary.payerRelation} />
                <SummaryRow label="Tenant relation" value={accountOwnershipBoundary.tenantRelation} />
                <SummaryRow label="Invoice relation" value={accountOwnershipBoundary.invoiceRelation} />
                <SummaryRow label="Payment relation" value={accountOwnershipBoundary.paymentRelation} />
                <SummaryRow label="Audit relation" value={accountOwnershipBoundary.auditRelation} />
              </div>
              : <PanelStateLine state={loadState} error={loadError} emptyMessage="No account ownership boundary available." />}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Billing accountability</h2><p>Boundary around billing authority and evidence</p></div></div>
          <div className="panel-body">
            {billingAccountabilityBoundary
              ? <div className="summary-list">
                <SummaryRow label="Accountability source" value={billingAccountabilityBoundary.accountabilitySource} />
                <SummaryRow label="Authority state" value={billingAccountabilityBoundary.authorityState} />
                <SummaryRow label="Invoice dependency" value={billingAccountabilityBoundary.invoiceDependency} />
                <SummaryRow label="Payment dependency" value={billingAccountabilityBoundary.paymentDependency} />
                <SummaryRow label="Audit dependency" value={billingAccountabilityBoundary.auditDependency} />
              </div>
              : <PanelStateLine state={loadState} error={loadError} emptyMessage="No billing accountability boundary available." />}
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Actor matrix and gates</h2>
        <p>Tenant billing remains blocked by design.</p>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Actor matrix</h2><p>Role separation snapshot</p></div></div>
          <div className="panel-body">
            <div className="summary-list">
              {(actorMatrix.length > 0 ? actorMatrix : [{
                actor: "tenant / payer / operator / admin / system",
                responsibility: "candidate",
                authority: "not authorized for tenant billing mutation",
                supportState: "not_claimed",
                claimImpact: "Tenant Billing Ready blocked",
              }]).map((item, index) => (
                <div className="summary-row" key={`${item.actor}-${index}`}>
                  <span>{item.actor}</span>
                  <strong>{item.responsibility}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Readiness gates</h2><p>Evidence-bounded constraints</p></div></div>
          <div className="panel-body">
            <div className="summary-list">
              {readinessGates.map(gate => (
                <div className="summary-row" key={gate.label}>
                  <span>{gate.label}</span>
                  <strong>{gate.status}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Evidence and posture</h2>
        <p>Read-only evidence with deferred scope only.</p>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Evidence</h2><p>Source evidence and caveats</p></div></div>
          <div className="panel-body">
            <div className="summary-list">
              <SummaryRow label="Evidence" value={(data?.sourceEvidence ?? []).join(" • ") || "Unavailable"} />
              <SummaryRow label="Deferred scope" value={(data?.deferredScope ?? []).join(" • ") || "Unavailable"} />
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Claim discipline</h2><p>No readiness claims are upgraded here</p></div></div>
          <div className="panel-body">
            <div className="summary-list">
              <SummaryRow label="Tenant Billing Ready" value={data?.tenantBillingReady ? "YES" : "NO / not yet claimed"} tone={data?.tenantBillingReady ? "good" : "muted"} />
              <SummaryRow label="Tenant Administration Ready" value={data?.tenantAdministrationReady ? "YES" : "NO / not yet claimed"} tone={data?.tenantAdministrationReady ? "good" : "muted"} />
              <SummaryRow label="Billing Ready" value={data?.billingReady ? "YES" : "NO / not yet claimed"} tone={data?.billingReady ? "good" : "muted"} />
              <SummaryRow label="Payment Ready" value={data?.paymentReady ? "YES" : "NO / not yet claimed"} tone={data?.paymentReady ? "good" : "muted"} />
              <SummaryRow label="Invoice Ready" value={data?.invoiceReady ? "YES" : "NO / not yet claimed"} tone={data?.invoiceReady ? "good" : "muted"} />
              <SummaryRow label="Production Financial Operations" value={data?.productionFinancialOperationsReady ? "YES" : "NO / not yet claimed"} tone={data?.productionFinancialOperationsReady ? "good" : "muted"} />
            </div>
          </div>
        </section>
      </div>
    </div>
  </>;
}

function SettlementReconciliationBoundaryView() {
  const { data, loadState, loadError, stale, refresh } = useOperationalSummary<SettlementReconciliationBoundaryReport>(
    () => productApi.getSettlementReconciliationBoundaryReport(),
    "Unable to load settlement and reconciliation boundary from Product API",
    () => false,
  );
  const operationalReceiptBoundary = data?.operationalReceiptBoundary;
  const legalTaxReceiptBoundary = data?.legalTaxReceiptBoundary;
  const settlementVisibility = data?.settlementVisibility;
  const reconciliationEvidence = data?.reconciliationEvidence;
  const providerAccountingDependencies = data?.providerAccountingDependencies;
  const readinessGates = data?.readinessGates ?? [];

  return <>
    <header className="page-head compact">
      <div>
        <p className="eyebrow">RECEIPTS, SETTLEMENT & RECONCILIATION</p>
        <h1>Receipts, Settlement &amp; Reconciliation</h1>
        <p>Read-only evidence boundary for operational receipts, settlement visibility and reconciliation evidence. No legal receipt, settlement execution or accounting integration is allowed here.</p>
      </div>
      <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
    </header>
    <div className="guardrail-banner" role="note">
      <span>Inspection mode</span>
      <span>Sandbox only</span>
      <span>Read-only</span>
      <span>Product API is source of truth</span>
      <span>No receipt action / no settlement / no reconciliation job / no accounting integration</span>
    </div>
    {staleBanner({ stale, loadState, loadError }, "settlement and reconciliation boundary")}
    <CrossLinks links={[
      { to: "/economics", label: "Economics" },
      { to: "/system/billing-boundary", label: "Billing boundary" },
      { to: "/system/pricing-invoice-boundary", label: "Pricing & invoice boundary" },
      { to: "/system/payment-rails-boundary", label: "Payment rails boundary" },
      { to: "/system/tenant-billing-boundary", label: "Tenant billing boundary" },
    ]} />
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Claims</h2>
        <p>Receipt, settlement and reconciliation readiness remain explicitly not claimed.</p>
      </div>
      <div className="dashboard-grid execution-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Status</h2><p>Governed claims snapshot</p></div></div>
          <div className="panel-body">
            <div className="summary-list">
              <SummaryRow label="Receipt Ready" value={data?.receiptReady ? "YES" : "NO / not yet claimed"} tone={data?.receiptReady ? "good" : "muted"} />
              <SummaryRow label="Legal/Tax Receipt Ready" value={data?.legalTaxReceiptReady ? "YES" : "NO / not yet claimed"} tone={data?.legalTaxReceiptReady ? "good" : "muted"} />
              <SummaryRow label="Settlement Ready" value={data?.settlementReady ? "YES" : "NO / not yet claimed"} tone={data?.settlementReady ? "good" : "muted"} />
              <SummaryRow label="Reconciliation Ready" value={data?.reconciliationReady ? "YES" : "NO / not yet claimed"} tone={data?.reconciliationReady ? "good" : "muted"} />
              <SummaryRow label="Accounting Integration Ready" value={data?.accountingIntegrationReady ? "YES" : "NO / not yet claimed"} tone={data?.accountingIntegrationReady ? "good" : "muted"} />
              <SummaryRow label="Billing Ready" value={data?.billingReady ? "YES" : "NO / not yet claimed"} tone={data?.billingReady ? "good" : "muted"} />
              <SummaryRow label="Payment Ready" value={data?.paymentReady ? "YES" : "NO / not yet claimed"} tone={data?.paymentReady ? "good" : "muted"} />
              <SummaryRow label="Production Financial Operations" value={data?.productionFinancialOperationsReady ? "YES" : "NO / not yet claimed"} tone={data?.productionFinancialOperationsReady ? "good" : "muted"} />
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Operational receipt boundary</h2><p>Operational evidence only</p></div></div>
          <div className="panel-body">
            {operationalReceiptBoundary
              ? <div className="summary-list">
                <SummaryRow label="Receipt candidate id" value={operationalReceiptBoundary.receiptCandidateId} />
                <SummaryRow label="Receipt type" value={operationalReceiptBoundary.receiptType} />
                <SummaryRow label="Related invoice candidate" value={operationalReceiptBoundary.relatedInvoiceCandidate} />
                <SummaryRow label="Related quote candidate" value={operationalReceiptBoundary.relatedQuoteCandidate} />
                <SummaryRow label="Related billable event" value={operationalReceiptBoundary.relatedBillableEvent} />
                <SummaryRow label="Tenant/account context" value={operationalReceiptBoundary.relatedTenantAccountContext} />
                <SummaryRow label="Payer/operator context" value={operationalReceiptBoundary.relatedPayerOperatorContext} />
                <SummaryRow label="Artifact state" value={operationalReceiptBoundary.artifactState} />
                <SummaryRow label="Legal/tax classification" value={operationalReceiptBoundary.legalTaxClassificationState} />
              </div>
              : <PanelStateLine state={loadState} error={loadError} emptyMessage="No operational receipt boundary available." />}
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Receipt and settlement distinctions</h2>
        <p>Operational evidence is separated from legal receipt and financial settlement.</p>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Legal / tax receipt boundary</h2><p>Not claimed in this milestone</p></div></div>
          <div className="panel-body">
            {legalTaxReceiptBoundary
              ? <div className="summary-list">
                <SummaryRow label="Operational receipt" value={legalTaxReceiptBoundary.operationalReceipt} />
                <SummaryRow label="Payment acknowledgement" value={legalTaxReceiptBoundary.paymentAcknowledgement} />
                <SummaryRow label="Invoice artifact" value={legalTaxReceiptBoundary.invoiceArtifact} />
                <SummaryRow label="Tax/legal receipt" value={legalTaxReceiptBoundary.taxLegalReceipt} />
                <SummaryRow label="Accounting receipt" value={legalTaxReceiptBoundary.accountingReceipt} />
                <SummaryRow label="Settlement receipt" value={legalTaxReceiptBoundary.settlementReceipt} />
                <SummaryRow label="Legal/tax receipt readiness" value={legalTaxReceiptBoundary.legalTaxReceiptReadiness} />
                <SummaryRow label="Compliance readiness" value={legalTaxReceiptBoundary.complianceReadiness} />
                <SummaryRow label="Accounting integration" value={legalTaxReceiptBoundary.accountingIntegration} />
                <SummaryRow label="Jurisdiction decision" value={legalTaxReceiptBoundary.jurisdictionDecision} />
              </div>
              : <PanelStateLine state={loadState} error={loadError} emptyMessage="No legal/tax receipt distinction available." />}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Settlement visibility</h2><p>Provider-dependent evidence only</p></div></div>
          <div className="panel-body">
            {settlementVisibility
              ? <div className="summary-list">
                <SummaryRow label="Settlement candidate id" value={settlementVisibility.settlementCandidateId} />
                <SummaryRow label="Related payment boundary" value={settlementVisibility.relatedPaymentBoundary} />
                <SummaryRow label="Provider dependency" value={settlementVisibility.providerDependency} />
                <SummaryRow label="Payment state dependency" value={settlementVisibility.paymentStateDependency} />
                <SummaryRow label="Settlement state" value={settlementVisibility.settlementState} />
                <SummaryRow label="Settlement source" value={settlementVisibility.settlementSource} />
                <SummaryRow label="Amount availability" value={settlementVisibility.amountAvailabilityState} />
                <SummaryRow label="Currency availability" value={settlementVisibility.currencyAvailabilityState} />
                <SummaryRow label="Settled at availability" value={settlementVisibility.settledAtAvailabilityState} />
              </div>
              : <PanelStateLine state={loadState} error={loadError} emptyMessage="No settlement visibility boundary available." />}
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Reconciliation and dependencies</h2>
        <p>No accounting-grade reconciliation is performed in S07.</p>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Reconciliation evidence</h2><p>Evidence-only matching posture</p></div></div>
          <div className="panel-body">
            {reconciliationEvidence
              ? <div className="summary-list">
                <SummaryRow label="Reconciliation candidate id" value={reconciliationEvidence.reconciliationCandidateId} />
                <SummaryRow label="Related receipt candidate" value={reconciliationEvidence.relatedReceiptCandidate} />
                <SummaryRow label="Related settlement candidate" value={reconciliationEvidence.relatedSettlementCandidate} />
                <SummaryRow label="Related invoice candidate" value={reconciliationEvidence.relatedInvoiceCandidate} />
                <SummaryRow label="Related tenant/account" value={reconciliationEvidence.relatedTenantAccount} />
                <SummaryRow label="Matching state" value={reconciliationEvidence.matchingState} />
                <SummaryRow label="Discrepancy state" value={reconciliationEvidence.discrepancyState} />
                <SummaryRow label="Accounting dependency" value={reconciliationEvidence.accountingDependency} />
                <SummaryRow label="Provider dependency" value={reconciliationEvidence.providerDependency} />
              </div>
              : <PanelStateLine state={loadState} error={loadError} emptyMessage="No reconciliation evidence boundary available." />}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Provider / accounting dependencies</h2><p>External systems remain unresolved</p></div></div>
          <div className="panel-body">
            {providerAccountingDependencies
              ? <div className="summary-list">
                <SummaryRow label="Payment provider dependency" value={providerAccountingDependencies.paymentProviderDependency} />
                <SummaryRow label="Accounting system dependency" value={providerAccountingDependencies.accountingSystemDependency} />
                <SummaryRow label="Ledger dependency" value={providerAccountingDependencies.ledgerDependency} />
                <SummaryRow label="Bank settlement dependency" value={providerAccountingDependencies.bankSettlementDependency} />
                <SummaryRow label="Jurisdiction/tax dependency" value={providerAccountingDependencies.jurisdictionTaxDependency} />
                <SummaryRow label="Data availability" value={providerAccountingDependencies.dataAvailability} />
                <SummaryRow label="Boundary state" value={providerAccountingDependencies.state} />
              </div>
              : <PanelStateLine state={loadState} error={loadError} emptyMessage="No provider/accounting dependency boundary available." />}
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Readiness gates and posture</h2>
        <p>Every readiness claim remains blocked by design in this milestone.</p>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Readiness gates</h2><p>Evidence-bounded constraints</p></div></div>
          <div className="panel-body">
            <div className="summary-list">
              {readinessGates.map(gate => (
                <div className="summary-row" key={gate.label}>
                  <span>{gate.label}</span>
                  <strong>{gate.status}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Claim discipline</h2><p>No readiness upgrade is allowed here</p></div></div>
          <div className="panel-body">
            <div className="summary-list">
              <SummaryRow label="Receipt Ready" value={data?.receiptReady ? "YES" : "NO / not yet claimed"} tone={data?.receiptReady ? "good" : "muted"} />
              <SummaryRow label="Legal/Tax Receipt Ready" value={data?.legalTaxReceiptReady ? "YES" : "NO / not yet claimed"} tone={data?.legalTaxReceiptReady ? "good" : "muted"} />
              <SummaryRow label="Settlement Ready" value={data?.settlementReady ? "YES" : "NO / not yet claimed"} tone={data?.settlementReady ? "good" : "muted"} />
              <SummaryRow label="Reconciliation Ready" value={data?.reconciliationReady ? "YES" : "NO / not yet claimed"} tone={data?.reconciliationReady ? "good" : "muted"} />
              <SummaryRow label="Accounting Integration Ready" value={data?.accountingIntegrationReady ? "YES" : "NO / not yet claimed"} tone={data?.accountingIntegrationReady ? "good" : "muted"} />
              <SummaryRow label="Reason" value={data?.claimDiscipline?.reason ?? "claim discipline remains blocked"} />
            </div>
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Evidence and deferred scope</h2>
        <p>No legal receipt, no real settlement and no accounting integration are introduced in S07.</p>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Source evidence</h2><p>Boundary inputs only</p></div></div>
          <div className="panel-body">
            <div className="summary-list">
              <SummaryRow label="Evidence" value={(data?.sourceEvidence ?? []).join(" • ") || "Unavailable"} />
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Deferred scope</h2><p>EPIC-14+ and future milestones</p></div></div>
          <div className="panel-body">
            <div className="summary-list">
              <SummaryRow label="Deferred scope" value={(data?.deferredScope ?? []).join(" • ") || "Unavailable"} />
              <SummaryRow label="Caveats" value={(data?.caveats ?? []).join(" • ") || "Unavailable"} />
            </div>
          </div>
        </section>
      </div>
    </div>
  </>;
}

function FinancialAuditBoundaryView() {
  const state = useOperationalSummary<FinancialAuditBoundaryReport>(
    () => productApi.getFinancialAuditBoundaryReport(),
    "Unable to load financial audit boundary from Product API",
    () => false,
  );
  const data = state.data;
  const audit = data?.financialAuditTrailBoundary;
  return <>
    <header className="page-head compact">
      <div><p className="eyebrow">FINANCIAL AUDIT, COMPLIANCE & RISK</p><h1>Financial Audit, Compliance &amp; Risk</h1><p>Read-only audit, compliance, tax and risk boundary. No certification or productive financial operation is claimed.</p></div>
      <button className="secondary" disabled={state.loadState === "loading" || state.loadState === "refreshing"} onClick={state.refresh}>{state.loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
    </header>
    <div className="guardrail-banner" role="note"><span>Inspection mode</span><span>Read-only</span><span>No audit certification</span><span>No compliance/tax readiness</span><span>No ledger or accounting integration</span></div>
    {staleBanner(state, "financial audit boundary")}
    <CrossLinks links={[{ to: "/system/settlement-reconciliation", label: "Receipts & reconciliation" }, { to: "/system/payment-rails-boundary", label: "Payment rails" }, { to: "/system/billing-boundary", label: "Billing boundary" }]} />
    <div className="flow-group">
      <div className="flow-group-head"><h2>Claims</h2><p>All claims remain NO / not yet claimed.</p></div>
      <div className="dashboard-grid execution-grid">
        <section className="panel"><div className="panel-head"><div><h2>Financial readiness</h2><p>No-claim snapshot</p></div></div><div className="panel-body"><div className="summary-list">
          <SummaryRow label="Financial Audit Ready" value={data?.financialAuditReady ? "YES" : "NO / not yet claimed"} tone="muted" />
          <SummaryRow label="Compliance Ready" value={data?.complianceReady ? "YES" : "NO / not yet claimed"} tone="muted" />
          <SummaryRow label="Tax Ready" value={data?.taxReady ? "YES" : "NO / not yet claimed"} tone="muted" />
          <SummaryRow label="Billing Ready" value={data?.billingReady ? "YES" : "NO / not yet claimed"} tone="muted" />
          <SummaryRow label="Payment Ready" value={data?.paymentReady ? "YES" : "NO / not yet claimed"} tone="muted" />
          <SummaryRow label="Production Financial Operations" value={data?.productionFinancialOperationsReady ? "YES" : "NO / not yet claimed"} tone="muted" />
        </div></div></section>
        <section className="panel"><div className="panel-head"><div><h2>Audit trail boundary</h2><p>Candidate correlation only</p></div></div><div className="panel-body">{audit ? <div className="summary-list">
          <SummaryRow label="Audit trail id" value={audit.auditTrailId} />
          <SummaryRow label="Scope" value={audit.auditTrailScope} />
          <SummaryRow label="Correlation state" value={audit.correlationState} />
          <SummaryRow label="Audit-grade state" value={audit.auditGradeState} />
          <SummaryRow label="Evidence completeness" value={audit.evidenceCompleteness} />
        </div> : <PanelStateLine state={state.loadState} error={state.loadError} emptyMessage="No audit boundary available." />}</div></section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head"><h2>Correlation and compliance</h2><p>Partial evidence and unresolved approvals remain visible.</p></div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel"><div className="panel-head"><div><h2>Evidence correlation matrix</h2><p>Missing dependencies are explicit</p></div></div><div className="panel-body"><div className="summary-list">{(data?.evidenceCorrelationMatrix ?? []).map((item, index) => <div className="summary-row" key={item.source + index}><span>{item.source}</span><strong>{item.correlationState} / {item.evidenceState}</strong></div>)}</div></div></section>
        <section className="panel"><div className="panel-head"><div><h2>Compliance boundary</h2><p>No compliance certification</p></div></div><div className="panel-body"><div className="summary-list">{(data?.complianceBoundary?.domains ?? []).map((item, index) => <div className="summary-row" key={item.complianceDomain + index}><span>{item.complianceDomain}</span><strong>{item.readinessState}</strong></div>)}</div></div></section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head"><h2>Tax/legal and risk</h2><p>No legal attestation, tax readiness or resolved-risk claim.</p></div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel"><div className="panel-head"><div><h2>Tax / legal boundary</h2><p>Explicitly not claimed</p></div></div><div className="panel-body"><div className="summary-list">
          <SummaryRow label="Legal invoice readiness" value={data?.taxLegalReadinessBoundary?.legalInvoiceReadiness ?? "NO / not yet claimed"} />
          <SummaryRow label="Tax invoice readiness" value={data?.taxLegalReadinessBoundary?.taxInvoiceReadiness ?? "NO / not yet claimed"} />
          <SummaryRow label="Legal receipt readiness" value={data?.taxLegalReadinessBoundary?.legalReceiptReadiness ?? "NO / not yet claimed"} />
          <SummaryRow label="Tax receipt readiness" value={data?.taxLegalReadinessBoundary?.taxReceiptReadiness ?? "NO / not yet claimed"} />
          <SummaryRow label="Jurisdiction decision" value={data?.taxLegalReadinessBoundary?.jurisdictionDecision ?? "required"} />
        </div></div></section>
        <section className="panel"><div className="panel-head"><div><h2>Financial risk register</h2><p>Risk visibility is not resolution</p></div></div><div className="panel-body"><div className="summary-list">{(data?.financialRiskRegister ?? []).map(risk => <div className="summary-row" key={risk.riskId}><span>{risk.riskId} · {risk.riskCategory}</span><strong>{risk.severity} / {risk.mitigationState}</strong></div>)}</div></div></section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head"><h2>No-claim discipline and gates</h2><p>Every financial readiness claim stays false.</p></div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel"><div className="panel-head"><div><h2>No-claim discipline</h2><p>Consolidated claims</p></div></div><div className="panel-body"><div className="summary-list">{(data?.noClaimDiscipline?.claims ?? []).map((claim, index) => <div className="summary-row" key={claim.claimName + index}><span>{claim.claimName}</span><strong>{claim.claimStatus}</strong></div>)}</div></div></section>
        <section className="panel"><div className="panel-head"><div><h2>Readiness gates</h2><p>Audit/compliance/risk blockers</p></div></div><div className="panel-body"><div className="summary-list">{(data?.readinessGates ?? []).map(gate => <div className="summary-row" key={gate.id}><span>{gate.label}</span><strong>{gate.status}</strong></div>)}</div></div></section>
      </div>
    </div>
  </>;
}

const BILLING_OPERATOR_REVIEW_STEPS = [
  {
    step: "01",
    title: "Financial Truth / Billing Boundary",
    route: "/system/billing-boundary",
    review: "Review financial truth source candidates, billing intent and billable event candidates.",
    blockedClaim: "Billing Ready: NO / not yet claimed",
    caveat: "No billing mutation, invoice, payment or money movement is available.",
    deferred: "Authoritative financial truth and billing-grade computation remain deferred.",
  },
  {
    step: "02",
    title: "Pricing / Quote / Invoice Boundary",
    route: "/system/pricing-invoice-boundary",
    review: "Review pricing source dependencies, quote candidates and invoice artifact caveats.",
    blockedClaim: "Pricing Ready / Invoice Ready: NO / not yet claimed",
    caveat: "Quote and invoice candidates are not charges, tax invoices or payment requests.",
    deferred: "Pricing engine, legal/tax invoice issuance and billing-grade amounts remain deferred.",
  },
  {
    step: "03",
    title: "Payment Rails Boundary",
    route: "/system/payment-rails-boundary",
    review: "Review provider boundary, authorization vs capture states and no-money-movement guardrails.",
    blockedClaim: "Payment Ready: NO / not yet claimed",
    caveat: "No provider integration, authorization, capture, refund or chargeback action is exposed.",
    deferred: "Provider setup, credentials, settlement and payment operations remain deferred.",
  },
  {
    step: "04",
    title: "Tenant Billing Responsibility",
    route: "/system/tenant-billing-boundary",
    review: "Review tenant account responsibility, payer/operator boundaries and account ownership caveats.",
    blockedClaim: "Tenant Billing Ready: NO / not yet claimed",
    caveat: "Payer candidates are not verified payment authority and no tenant billing action exists.",
    deferred: "Tenant billing operations, payment methods and customer account mutation remain deferred.",
  },
  {
    step: "05",
    title: "Receipts / Settlement / Reconciliation",
    route: "/system/settlement-reconciliation",
    review: "Review operational receipt evidence, settlement visibility and reconciliation evidence boundaries.",
    blockedClaim: "Receipt / Settlement / Reconciliation Ready: NO / not yet claimed",
    caveat: "Operational receipt evidence is not legal receipt, bank settlement or accounting reconciliation.",
    deferred: "Legal receipts, settlement sync, ledger and reconciliation jobs remain deferred.",
  },
  {
    step: "06",
    title: "Financial Audit / Compliance / Risk",
    route: "/system/financial-audit",
    review: "Review audit trail boundary, evidence correlation, compliance caveats and risk register.",
    blockedClaim: "Financial Audit / Compliance / Tax Ready: NO / not yet claimed",
    caveat: "Evidence correlation is not audit certification, legal attestation or tax readiness.",
    deferred: "Audit certification, compliance certification, legal/tax readiness and provider compliance remain deferred.",
  },
] as const;

const BILLING_OPERATOR_CLAIMS = [
  "Billing UX Accepted",
  "Operator Acceptance Ready",
  "Browser Acceptance Ready",
  "Billing Ready",
  "Payment Ready",
  "Invoice Ready",
  "Tenant Billing Ready",
  "Receipt Ready",
  "Settlement Ready",
  "Reconciliation Ready",
  "Financial Audit Ready",
  "Compliance Ready",
  "Tax Ready",
  "Production Financial Operations",
] as const;

const BILLING_STATE_TAXONOMY = [
  ["candidate", "Candidate boundary evidence only; not ready."],
  ["planned", "Planned future work; not available for operation."],
  ["partial", "Partial evidence exists; blockers remain visible."],
  ["unavailable", "Expected data is not available from Product API."],
  ["unsupported", "Capability is outside current supported scope."],
  ["deferred", "Explicitly postponed to S10/S11 or EPIC-14+."],
  ["blocked", "Readiness is blocked by missing gates or evidence."],
  ["not_started", "No implementation or approval has begun."],
  ["unknown", "State cannot be trusted as readiness."],
  ["evidence_only", "Operational evidence only; not certified."],
  ["not_claimed", "No readiness claim is made."],
] as const;

function BillingUxAcceptanceView() {
  return <>
    <header className="page-head compact">
      <div>
        <p className="eyebrow">BILLING UX &amp; OPERATOR ACCEPTANCE</p>
        <h1>Billing UX &amp; Operator Acceptance</h1>
        <p>Read-only operator review baseline for EPIC-13 financial boundaries. Acceptance summary is not production readiness and does not authorize financial actions.</p>
      </div>
      <Link className="detail-link" to="/system/billing-boundary">Start review →</Link>
    </header>
    <div className="guardrail-banner" role="note">
      <span>Product API is source of truth</span>
      <span>Read-only review flow</span>
      <span>No financial actions</span>
      <span>No browser certification claim</span>
      <span>Formal S03-S06 sequencing caveat retained</span>
    </div>
    <CrossLinks links={BILLING_OPERATOR_REVIEW_STEPS.map(step => ({ to: step.route, label: step.title }))} />

    <div className="flow-group billing-acceptance-flow">
      <div className="flow-group-head">
        <h2>Operator review flow</h2>
        <p>Review boundaries in this order. This is not an approval flow and does not promote any claim.</p>
      </div>
      <div className="dashboard-grid evidence-grid">
        {BILLING_OPERATOR_REVIEW_STEPS.map(step => <section className="panel blocked-panel" key={step.step}>
          <div className="panel-head"><div><h2>{step.step}. {step.title}</h2><p>{step.blockedClaim}</p></div><Badge tone="muted">review</Badge></div>
          <div className="panel-body">
            <div className="summary-list">
              <SummaryRow label="What to review" value={step.review} />
              <SummaryRow label="Caveat" value={step.caveat} />
              <SummaryRow label="Deferred" value={step.deferred} />
            </div>
            <Link className="surface-link" to={step.route}>Open boundary →</Link>
          </div>
        </section>)}
      </div>
    </div>

    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Claim display consistency</h2>
        <p>Every readiness or acceptance claim remains NO / not yet claimed.</p>
      </div>
      <div className="dashboard-grid execution-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Acceptance claims</h2><p>Baseline only</p></div></div>
          <div className="panel-body"><div className="summary-list">
            {BILLING_OPERATOR_CLAIMS.map(claim => <SummaryRow key={claim} label={claim} value="NO / not yet claimed" tone="muted" />)}
          </div></div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>State taxonomy</h2><p>Non-ready states are explicit</p></div></div>
          <div className="panel-body"><div className="summary-list">
            {BILLING_STATE_TAXONOMY.map(([state, meaning]) => <SummaryRow key={state} label={state} value={meaning} tone={state === "blocked" ? "warn" : "muted"} />)}
          </div></div>
        </section>
        <section className="panel unsupported-panel">
          <div className="panel-head"><div><h2>Non-ideal states</h2><p>Loading, error, empty and stale handling</p></div></div>
          <div className="panel-body"><div className="summary-list">
            <SummaryRow label="Loading" value="Show Product API loading without implying readiness." />
            <SummaryRow label="Error / endpoint missing" value="Show Product API unavailable and preserve no-claim posture." />
            <SummaryRow label="Empty / partial data" value="Show unavailable or partial evidence, blockers and caveats." />
            <SummaryRow label="Stale" value="Show stale banner and keep claims not_claimed." />
          </div></div>
        </section>
      </div>
    </div>

    <div className="flow-group">
      <div className="flow-group-head">
        <h2>No-action financial guardrails</h2>
        <p>Only inspect, review and navigate actions are allowed in S09.</p>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel blocked-panel">
          <div className="panel-head"><div><h2>Prohibited productive actions</h2><p>Not present in this acceptance surface</p></div></div>
          <div className="panel-body"><div className="summary-list">
            <SummaryRow label="Billing / invoice / payment" value="No tenant charge, invoice issue, payment authorization or capture." />
            <SummaryRow label="Refund / dispute / settlement" value="No refund, chargeback, settlement or reconciliation execution." />
            <SummaryRow label="Legal / tax / accounting" value="No legal receipt, tax invoice, provider setup or accounting connection." />
          </div></div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Manual/browser baseline</h2><p>Documented acceptance only</p></div></div>
          <div className="panel-body"><div className="summary-list">
            <SummaryRow label="Checklist" value="docs/epics/epic-13/browser-acceptance.md" />
            <SummaryRow label="Browser real execution" value="NOT EXECUTED / pending S10 unless run separately" tone="warn" />
            <SummaryRow label="Allowed operator actions" value="Open boundary, inspect evidence, review caveats, read documentation." />
          </div></div>
        </section>
      </div>
    </div>
  </>;
}

function ProductionReadinessGateRow({ gate }: { gate: ProductionReadinessReport["gates"][number] }) {
  const tone = gate.status === "pass" ? "good" : gate.status === "partial" ? "warn" : "muted";
  return <div className="catalog-row" key={gate.id}>
    <div className="catalog-row-main">
      <b>{gate.label}</b>
      <small className="mono">{gate.id} · {gate.responsibleDomain} · {gate.blockers.length} blockers</small>
      <p>{gate.dependencyOnFutureMilestones.join(" · ") || "No future milestone dependency"}</p>
    </div>
    <Badge tone={tone}>{gate.status}</Badge>
  </div>;
}

function ProductionReadinessTimeline({
  title,
  meta,
  items,
  state,
  error,
  emptyMessage,
}: {
  title: string;
  meta: string;
  items: TimelineItem[];
  state: DashboardLoadState;
  error: string | null;
  emptyMessage: string;
}) {
  return <DashboardCard title={title} meta={meta} state={items.length > 0 ? "ready" : state} emptyMessage={emptyMessage}>
    {items.length > 0 && <TimelineList items={items} />}
    {state === "error" && <ErrorBanner error={error} />}
  </DashboardCard>;
}

function GovernanceView() {
  const readiness = useOperationalSummary<ProductionReadinessReport>(
    () => productApi.getProductionReadinessReport(),
    "Unable to load production readiness from Product API",
    () => false,
  );
  const guardrails = useOperationalSummary<SystemGuardrailsView>(
    () => productApi.getSystemGuardrails(),
    "Unable to load system guardrails from Product API",
    () => false,
  );
  const configuration = useOperationalSummary<SystemConfigurationView>(
    () => productApi.getSystemConfiguration(),
    "Unable to load system configuration from Product API",
    () => false,
  );
  const policies = useOperationalSummary<SystemPolicyVisibility[]>(
    () => productApi.listSystemPolicies(),
    "Unable to load policy visibility from Product API",
    () => false,
  );
  const administration = useOperationalSummary<SystemAdministrationView>(
    () => productApi.getSystemAdministration(),
    "Unable to load administration boundary from Product API",
    () => false,
  );
  const tenants = useOperationalSummary<SystemTenantsView>(
    () => productApi.getSystemTenants(),
    "Unable to load tenant visibility from Product API",
    () => false,
  );
  const acceptance = useOperationalSummary<Epic11AcceptanceReport>(
    () => productApi.getEpic11AcceptanceReport(),
    "Unable to load EPIC-11 acceptance report from Product API",
    () => false,
  );
  const governanceBoundary = useOperationalSummary<GovernanceBoundaryReport>(
    () => productApi.getGovernanceBoundaryReport(),
    "Unable to load governance boundary from Product API",
    () => false,
  );

  const refreshAll = () => {
    readiness.refresh();
    guardrails.refresh();
    configuration.refresh();
    policies.refresh();
    administration.refresh();
    tenants.refresh();
    acceptance.refresh();
    governanceBoundary.refresh();
  };

  return <>
    <DomainHeader domain="Governance" title="Control Plane Boundaries" description="Guardrails, policy and configuration visibility. Current tenant administration is available from the Administration navigation surface." actions={<button className="secondary" onClick={refreshAll}>Refresh all</button>} />
    <CrossLinks links={[{ to: "/system/operational-reliability", label: "Open operational reliability" }]} />
    {staleBanner(guardrails, "system guardrails")}
    {staleBanner(governanceBoundary, "governance boundary")}
    <div className="flow-group">
      <div className="flow-group-head"><h2>System guardrails</h2><p>Operational mode reported by the Product API — never inferred by this surface.</p></div>
      <div className="dashboard-grid execution-grid">
        <section className="panel wide">
          <div className="panel-head"><div><h2>Guardrail state</h2><p>Inspection, sandbox and read-only boundaries</p></div><Badge tone="warn">production ready = false</Badge></div>
          <div className="panel-body">
            {guardrails.data ? <>
              <div className="guardrail-banner" role="note"><span>Inspection mode</span><span>Sandbox only</span><span>Read-only</span><span>No mutable operations</span><span>Source of truth: product-api</span></div>
              <div className="summary-list">
                <SummaryRow label="Inspection mode" value={String(guardrails.data.inspectionMode)} tone="good" />
                <SummaryRow label="Sandbox only" value={String(guardrails.data.sandboxOnly)} tone="good" />
                <SummaryRow label="Read-only" value={String(guardrails.data.readOnly)} tone="good" />
                <SummaryRow label="Mutable operations" value={String(guardrails.data.mutableOperations)} tone="warn" />
                <SummaryRow label="Production ready" value={String(guardrails.data.productionReady)} tone="warn" />
              </div>
              <p className="panel-note">Future scope: {guardrails.data.futureScope.join(" · ")}</p>
            </> : <PanelStateLine state={guardrails.loadState} error={guardrails.loadError} emptyMessage="No guardrail data reported by the Product API." />}
            {guardrails.loadState === "error" && <ErrorBanner error={guardrails.loadError} />}
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head"><h2>Production readiness</h2><p>Readiness gates and boundaries projected by the Product API. This is evidence, not a production claim.</p></div>
      <div className="dashboard-grid execution-grid">
        <section className="panel wide">
          <div className="panel-head"><div><h2>Readiness status</h2><p>Current gate projection</p></div><Badge tone={readiness.data?.status === "blocked" || readiness.data?.status === "partial" ? "warn" : "muted"}>{readiness.data?.status ?? "unavailable"}</Badge></div>
          <div className="panel-body">
            {readiness.data ? <>
              <div className="guardrail-banner" role="note"><span>Production Ready: NO / not yet claimed</span><span>Billing Ready: NO</span><span>Administration Ready: NO</span><span>Tenant Governance Ready: NO</span><span>Source of truth: product-api</span></div>
              <div className="summary-list">
                <SummaryRow label="Production ready" value="NO / not yet claimed" tone="warn" />
                <SummaryRow label="Claim" value={readiness.data.claim} tone="warn" />
                <SummaryRow label="Environment" value={readiness.data.environment.current} />
                <SummaryRow label="Checked" value={new Date(readiness.data.checkedAt).toLocaleString()} />
                <SummaryRow label="Gates" value={readiness.data.summary.totalGates} />
                <SummaryRow label="Passed" value={readiness.data.summary.passed} tone="good" />
                <SummaryRow label="Partial" value={readiness.data.summary.partial} />
                <SummaryRow label="Blocked" value={readiness.data.summary.blocked} tone="warn" />
                <SummaryRow label="Deferred" value={readiness.data.summary.deferred} />
              </div>
              <p className="panel-note">{readiness.data.claimDiscipline.reason}</p>
            </> : <PanelStateLine state={readiness.loadState} error={readiness.loadError} emptyMessage="No production readiness reported by the Product API." />}
            {readiness.loadState === "error" && <ErrorBanner error={readiness.loadError} />}
          </div>
        </section>
      </div>
      <div className="dashboard-grid evidence-grid">
        <DashboardCard title="Readiness gates" meta="G01-G13 gate status" state={readiness.data ? "ready" : readiness.loadState} emptyMessage="No readiness gates reported">
          {readiness.data && <div className="catalog-list">{readiness.data.gates.map(gate => <ProductionReadinessGateRow gate={gate} key={gate.id} />)}</div>}
        </DashboardCard>
        <ProductionReadinessTimeline
          title="Blockers"
          meta="Production-blocking findings"
          items={(readiness.data?.blockers ?? []).map((finding, index) => ({
            id: `${finding.gateId}-${finding.code}-${index}`,
            title: `${finding.gateId} · ${finding.code}`,
            meta: `${finding.severity} · ${finding.responsibleDomain}`,
            detail: finding.message,
            tone: finding.severity === "critical" || finding.severity === "high" ? "warn" : undefined,
          }))}
          state={readiness.loadState}
          error={readiness.loadError}
          emptyMessage="No blockers reported."
        />
      </div>
      <div className="dashboard-grid evidence-grid">
        <ProductionReadinessTimeline
          title="Warnings"
          meta="Non-blocking readiness findings"
          items={(readiness.data?.warnings ?? []).map((finding, index) => ({
            id: `${finding.gateId}-${finding.code}-${index}`,
            title: `${finding.gateId} · ${finding.code}`,
            meta: `${finding.severity} · ${finding.responsibleDomain}`,
            detail: finding.message,
            tone: finding.severity === "critical" || finding.severity === "high" ? "warn" : undefined,
          }))}
          state={readiness.loadState}
          error={readiness.loadError}
          emptyMessage="No warnings reported."
        />
        <ProductionReadinessTimeline
          title="Caveats"
          meta="Honest limits of the current gate"
          items={(readiness.data?.caveats ?? []).map((finding, index) => ({
            id: `${finding.gateId}-${finding.code}-${index}`,
            title: `${finding.gateId} · ${finding.code}`,
            meta: `${finding.severity} · ${finding.responsibleDomain}`,
            detail: finding.message,
            tone: "warn",
          }))}
          state={readiness.loadState}
          error={readiness.loadError}
          emptyMessage="No caveats reported."
        />
      </div>
      <div className="dashboard-grid evidence-grid">
        <ProductionReadinessTimeline
          title="Deferred items"
          meta="Future milestone or EPIC scope"
          items={(readiness.data?.deferredItems ?? []).map((finding, index) => ({
            id: `${finding.gateId}-${finding.code}-${index}`,
            title: `${finding.gateId} · ${finding.code}`,
            meta: `${finding.severity} · ${finding.dependsOnFutureMilestone ?? "future scope"}`,
            detail: finding.message,
            tone: "muted",
          }))}
          state={readiness.loadState}
          error={readiness.loadError}
          emptyMessage="No deferred items reported."
        />
        <SummaryCard title="Next milestone dependencies" meta="Required follow-up milestones" state={readiness.data?.nextMilestoneDependencies.length ? "ready" : readiness.loadState} emptyMessage="No next milestone dependencies reported.">
          {readiness.data && <TimelineList items={readiness.data.nextMilestoneDependencies.map((dependency, index) => ({ id: `dependency-${index}`, title: dependency }))} />}
        </SummaryCard>
      </div>
      <div className="dashboard-grid evidence-grid">
        <DashboardCard title="Environment inventory" meta="Recognized environments and claim limits" state={readiness.data ? "ready" : readiness.loadState} emptyMessage="No environment inventory reported">
          {readiness.data && <TimelineList items={readiness.data.environment.recognized.map(environment => ({
            id: environment.id,
            title: environment.id,
            meta: environment.purpose,
            detail: environment.claimLimitations,
            tone: environment.id === readiness.data?.environment.current ? "warn" : "muted",
          }))} />}
        </DashboardCard>
        <DashboardCard title="Persistence inventory" meta="Durability and production-claim readiness" state={readiness.data ? "ready" : readiness.loadState} emptyMessage="No persistence inventory reported">
          {readiness.data && <TimelineList items={readiness.data.persistenceInventory.map(item => ({
            id: item.domain,
            title: item.domain,
            meta: `${item.classification} · survives restart: ${String(item.survivesRestart)}`,
            detail: item.note,
            tone: item.usableForProductionClaim ? "good" : "muted",
          }))} />}
        </DashboardCard>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Secrets boundary</h2><p>Redacted, referenced, or unavailable</p></div><Badge tone="muted">no raw secrets</Badge></div>
          <div className="panel-body">
            {readiness.data ? <>
              <div className="summary-list">
                <SummaryRow label="Storage" value={readiness.data.secretsBoundary.storage} tone="warn" />
                <SummaryRow label="Reference mode" value={readiness.data.secretsBoundary.referenceMode} />
                <SummaryRow label="UI disclosure" value={readiness.data.secretsBoundary.uiDisclosure} />
                <SummaryRow label="API disclosure" value={readiness.data.secretsBoundary.apiDisclosure} />
                <SummaryRow label="No-secret-leak validation" value={readiness.data.secretsBoundary.noSecretLeakValidation} />
                <SummaryRow label="Raw secrets exposed" value={String(readiness.data.secretsBoundary.rawSecretsExposed)} tone="good" />
              </div>
              <IdList label="Redaction expectations" ids={readiness.data.secretsBoundary.redactionExpectations} />
              <IdList label="Unsupported operations" ids={readiness.data.secretsBoundary.unsupportedOperations} />
              <TimelineList items={readiness.data.secretsBoundary.productionBlockers.map((message, index) => ({ id: `secret-blocker-${index}`, title: "Production blocker", detail: message, tone: "warn" }))} />
            </> : <PanelStateLine state={readiness.loadState} error={readiness.loadError} emptyMessage="No secrets boundary reported." />}
            {readiness.loadState === "error" && <ErrorBanner error={readiness.loadError} />}
          </div>
        </section>
        <SummaryCard title="Source evidence" meta="Files used for the readiness projection" state={readiness.data?.sourceEvidence.length ? "ready" : readiness.loadState} emptyMessage="No source evidence reported.">
          {readiness.data && <IdList label="Evidence" ids={readiness.data.sourceEvidence} />}
        </SummaryCard>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head"><h2>Governance & access boundary</h2><p>Actor, permission, read vs mutate, tenant awareness and administration limits reported by the Product API.</p></div>
      <div className="dashboard-grid execution-grid">
        <section className="panel wide">
          <div className="panel-head"><div><h2>Actor boundary</h2><p>Current actor identity and authentication limits</p></div><Badge tone={governanceBoundary.data?.actorBoundary.state === "authenticated" ? "good" : "warn"}>{governanceBoundary.data?.actorBoundary.state ?? "unavailable"}</Badge></div>
          <div className="panel-body">
            {governanceBoundary.data ? <>
              <div className="guardrail-banner" role="note"><span>Production Auth Claimed: NO</span><span>Administration Ready: NO</span><span>Tenant Governance Ready: NO</span><span>Claim: {governanceBoundary.data.claim}</span></div>
              <div className="summary-list">
                <SummaryRow label="Actor state" value={governanceBoundary.data.actorBoundary.state} />
                <SummaryRow label="Display name" value={governanceBoundary.data.actorBoundary.displayName} />
                <SummaryRow label="Source" value={governanceBoundary.data.actorBoundary.source} />
                <SummaryRow label="Production auth claimed" value="NO" tone="warn" />
              </div>
              <TimelineList items={governanceBoundary.data.actorBoundary.caveats.map((caveat, index) => ({ id: `actor-caveat-${index}`, title: "Actor caveat", detail: caveat, tone: "warn" }))} />
            </> : <PanelStateLine state={governanceBoundary.loadState} error={governanceBoundary.loadError} emptyMessage="No actor boundary reported by the Product API." />}
            {governanceBoundary.loadState === "error" && <ErrorBanner error={governanceBoundary.loadError} />}
          </div>
        </section>
      </div>
      <div className="dashboard-grid evidence-grid">
        <DashboardCard title="Permission baseline" meta="Representational permission categories" state={governanceBoundary.data ? "ready" : governanceBoundary.loadState} emptyMessage="No permission baseline reported.">
          {governanceBoundary.data && <div className="catalog-list">
            {governanceBoundary.data.permissionBaseline.map(permission => (
              <div className="catalog-row" key={permission.category}>
                <div className="catalog-row-main">
                  <b>{permission.label}</b>
                  <small className="mono">{permission.category} · read: {permission.readAuthority} · mutate: {permission.mutationAuthority}</small>
                  <p>{permission.reason}</p>
                </div>
                <Badge tone={permission.state === "allowed" ? "good" : permission.state === "blocked" ? "warn" : "muted"}>{permission.state}</Badge>
              </div>
            ))}
          </div>}
        </DashboardCard>
        <DashboardCard title="Read vs mutate authority" meta="Surfaces that may be inspected or mutated" state={governanceBoundary.data ? "ready" : governanceBoundary.loadState} emptyMessage="No authority surfaces reported.">
          {governanceBoundary.data && <div className="catalog-list">
            {governanceBoundary.data.readMutateAuthority.map(surface => (
              <div className="catalog-row" key={surface.surface}>
                <div className="catalog-row-main">
                  <b>{surface.label}</b>
                  <small className="mono">{surface.surface} · read: {surface.readAuthority} · mutate: {surface.mutationAuthority}</small>
                  <p>{surface.reason}</p>
                  {surface.notes.length > 0 && <small>{surface.notes.join(" · ")}</small>}
                </div>
              </div>
            ))}
          </div>}
        </DashboardCard>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Tenant boundary</h2><p>Historical boundary projection; use Administration for the delivered tenant control plane</p></div><Badge tone={governanceBoundary.data?.tenantBoundary.tenantAdminReady ? "warn" : "muted"}>{governanceBoundary.data?.tenantBoundary.state ?? "unavailable"}</Badge></div>
          <div className="panel-body">
            {governanceBoundary.data ? <>
              <div className="summary-list">
                <SummaryRow label="Tenant state" value={governanceBoundary.data.tenantBoundary.state} />
                <SummaryRow label="Tenant admin ready" value="NO" tone="warn" />
                <SummaryRow label="Isolation indicators" value={governanceBoundary.data.tenantBoundary.isolationIndicators.length} />
              </div>
              <p className="panel-note">This EPIC-12 projection is retained as historical boundary evidence. Tenant Administration was delivered by EPIC-15.</p>
              <IdList label="Declared isolation" ids={governanceBoundary.data.tenantBoundary.isolationIndicators} />
              <TimelineList items={governanceBoundary.data.tenantBoundary.caveats.map((caveat, index) => ({ id: `tenant-caveat-${index}`, title: "Tenant caveat", detail: caveat, tone: "warn" }))} />
            </> : <PanelStateLine state={governanceBoundary.loadState} error={governanceBoundary.loadError} emptyMessage="No tenant boundary reported by the Product API." />}
            {governanceBoundary.loadState === "error" && <ErrorBanner error={governanceBoundary.loadError} />}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Administration boundary</h2><p>Historical EPIC-12 projection; operational tenant administration is now linked from the main shell</p></div><Badge tone="warn">{governanceBoundary.data?.administrationBoundary.state ?? "unavailable"}</Badge></div>
          <div className="panel-body">
            {governanceBoundary.data ? <>
              <div className="summary-list">
                <SummaryRow label="Administration ready" value="NO" tone="warn" />
                <SummaryRow label="State" value={governanceBoundary.data.administrationBoundary.state} />
                <SummaryRow label="Allowed actions" value={governanceBoundary.data.administrationBoundary.allowedActions.length} />
              </div>
              <IdList label="Allowed inspection actions" ids={governanceBoundary.data.administrationBoundary.allowedActions} />
              <TimelineList items={governanceBoundary.data.administrationBoundary.deniedActions.map((entry, index) => ({ id: `admin-denied-${index}`, title: `${entry.permission} · ${entry.action}`, meta: entry.gateDependency, detail: entry.reason, tone: "warn" }))} />
              <TimelineList items={governanceBoundary.data.administrationBoundary.unsupportedActions.map((entry, index) => ({ id: `admin-unsupported-${index}`, title: `${entry.permission} · ${entry.action}`, meta: entry.gateDependency, detail: entry.reason, tone: "muted" }))} />
              <IdList label="Deferred administration" ids={governanceBoundary.data.administrationBoundary.deferredActions} />
            </> : <PanelStateLine state={governanceBoundary.loadState} error={governanceBoundary.loadError} emptyMessage="No administration boundary reported by the Product API." />}
            {governanceBoundary.loadState === "error" && <ErrorBanner error={governanceBoundary.loadError} />}
          </div>
        </section>
      </div>
      <div className="dashboard-grid evidence-grid">
        <DashboardCard title="Access decisions" meta="Allowed, denied, unsupported and deferred decisions" state={governanceBoundary.data?.accessDecisions.length ? "ready" : governanceBoundary.loadState} emptyMessage="No access decisions reported.">
          {governanceBoundary.data && <TimelineList items={governanceBoundary.data.accessDecisions.map(entry => ({
            id: entry.id,
            title: `${entry.permission} · ${entry.action}`,
            meta: `${entry.decision} · ${entry.enforcement} · ${entry.gateDependency}`,
            detail: entry.reason,
            tone: entry.decision === "allowed" ? "good" : entry.decision === "denied" ? "warn" : "muted",
          }))} />}
        </DashboardCard>
        <DashboardCard title="Audit / evidence correlation" meta="Honest status of access decision traceability" state={governanceBoundary.data ? "ready" : governanceBoundary.loadState} emptyMessage="No audit correlation status reported.">
          {governanceBoundary.data && <>
            <div className="summary-list">
              <SummaryRow label="Correlation state" value={governanceBoundary.data.auditCorrelation.state} />
            </div>
            <p className="panel-note">{governanceBoundary.data.auditCorrelation.note}</p>
            <IdList label="Evidence" ids={governanceBoundary.data.auditCorrelation.evidence} />
          </>}
        </DashboardCard>
      </div>
      <div className="dashboard-grid evidence-grid">
        <SummaryCard title="Claim discipline" meta="Claims that this milestone cannot make" state={governanceBoundary.data ? "ready" : governanceBoundary.loadState} emptyMessage="No claim discipline reported.">
          {governanceBoundary.data && <>
            <div className="summary-list">
              <SummaryRow label="Production ready claim" value="NO" tone="warn" />
              <SummaryRow label="Billing ready claim" value="NO" tone="warn" />
              <SummaryRow label="Administration ready claim" value="NO" tone="warn" />
              <SummaryRow label="Tenant governance ready claim" value="NO" tone="warn" />
            </div>
            <p className="panel-note">{governanceBoundary.data.claimDiscipline.reason}</p>
          </>}
        </SummaryCard>
        <DashboardCard title="Readiness gate dependencies" meta="Gates consumed by this governance projection" state={governanceBoundary.data?.readinessGateDependencies.length ? "ready" : governanceBoundary.loadState} emptyMessage="No readiness gate dependencies reported.">
          {governanceBoundary.data && <IdList label="Gates" ids={governanceBoundary.data.readinessGateDependencies} />}
        </DashboardCard>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Caveats & deferred scope</h2><p>Honest limits of the current boundary</p></div></div>
          <div className="panel-body">
            {governanceBoundary.data ? <>
              <TimelineList items={governanceBoundary.data.caveats.map((caveat, index) => ({ id: `governance-caveat-${index}`, title: "Caveat", detail: caveat, tone: "warn" }))} />
              <IdList label="Deferred items" ids={governanceBoundary.data.deferredItems} />
            </> : <PanelStateLine state={governanceBoundary.loadState} error={governanceBoundary.loadError} emptyMessage="No caveats reported by the Product API." />}
          </div>
        </section>
        <SummaryCard title="Source evidence" meta="Files and contracts used for the governance projection" state={governanceBoundary.data?.sourceEvidence.length ? "ready" : governanceBoundary.loadState} emptyMessage="No source evidence reported.">
          {governanceBoundary.data && <IdList label="Evidence" ids={governanceBoundary.data.sourceEvidence} />}
        </SummaryCard>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head"><h2>Administration boundary</h2><p>Historical EPIC-11 boundary; use Tenant Administration for the current governed surface.</p></div>
      <div className="dashboard-grid execution-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Administration</h2><p>Boundary visibility without mutations</p></div><Badge tone="muted">unavailable</Badge></div>
          <div className="panel-body">
            {administration.data ? <>
              <p className="panel-note">{administration.data.reason}</p>
              <IdList label="Boundary notes" ids={administration.data.notes} />
            </> : <PanelStateLine state={administration.loadState} error={administration.loadError} emptyMessage="No administration boundary reported." />}
            {administration.loadState === "error" && <ErrorBanner error={administration.loadError} />}
          </div>
        </section>
        <BlockedPanel title="Legacy administration projection" note="Historical EPIC-11 read model" reason={administration.data?.reason ?? "This legacy projection does not expose mutations; current tenant and secret operations are available from dedicated governed surfaces."} />
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head"><h2>Tenants & isolation</h2><p>This historical view keeps isolation evidence; current tenant lifecycle and governance live in Tenant Administration.</p></div>
      <div className="dashboard-grid execution-grid">
        <section className="panel wide">
          <div className="panel-head"><div><h2>Isolation visibility</h2><p>Declared worker isolation modes, reported by the Product API</p></div><Badge tone="muted">future scope</Badge></div>
          <div className="panel-body">
            {tenants.data ? <>
              <p className="panel-note">{tenants.data.reason}</p>
              {tenants.data.isolationVisibility.length ? (
                <div className="catalog-list">
                  {tenants.data.isolationVisibility.map(worker => (
                    <div className="catalog-row" key={worker.workerId}>
                      <div className="catalog-row-main"><b className="mono">{worker.workerId}</b><small>tenant isolation: {String(worker.tenantIsolation)} · workload isolation: {String(worker.workloadIsolation)}</small><p>declared modes: {worker.declaredIsolationModes.join(", ") || "none declared"}</p></div>
                      <Badge tone={worker.tenantIsolation || worker.workloadIsolation ? "good" : "muted"}>{worker.tenantIsolation || worker.workloadIsolation ? "isolated" : "declared"}</Badge>
                    </div>
                  ))}
                </div>
              ) : <EmptyState message="No worker isolation data reported by the Product API." />}
              <EntityRefList refs={tenants.data.isolationVisibility.map(worker => ({ entityType: "worker", entityId: worker.workerId }))} />
            </> : <PanelStateLine state={tenants.loadState} error={tenants.loadError} emptyMessage="No tenant visibility reported." />}
            {tenants.loadState === "error" && <ErrorBanner error={tenants.loadError} />}
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head"><h2>Policies</h2><p>Policy visibility only — mutations are governed by the Product API or deferred to a future EPIC.</p></div>
      <div className="dashboard-grid execution-grid">
        <section className="panel wide">
          <div className="panel-head"><div><h2>Policy visibility</h2><p>Read-only policy inventory</p></div><Badge tone="muted">{policies.data?.length ?? 0}</Badge></div>
          <div className="panel-body">
            {policies.data?.length ? (
              <div className="catalog-list">
                {policies.data.map(policy => (
                  <div className="catalog-row" key={policy.id}>
                    <div className="catalog-row-main"><b>{policy.label}</b><small className="mono">{policy.id}</small><p>{policy.note}</p></div>
                    <Badge tone={policy.availability === "unavailable" ? "muted" : "good"}>{policy.availability}</Badge>
                  </div>
                ))}
              </div>
            ) : <PanelStateLine state={policies.loadState} error={policies.loadError} emptyMessage="No policy visibility reported." />}
            {policies.loadState === "error" && <ErrorBanner error={policies.loadError} />}
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head"><h2>Configuration</h2><p>Read-only configuration visibility. No settings mutation in this milestone.</p></div>
      <div className="dashboard-grid execution-grid">
        <SummaryCard title="Configuration visibility" meta="Inspection mode, memory backends" state={configuration.data ? "ready" : configuration.loadState}>
          {configuration.data ? <>
            <div className="metrics">
              <Metric label="Mode" value={configuration.data.mode} note={configuration.data.readOnly ? "read-only" : "mutable"} />
              <Metric label="Automation" value={configuration.data.automation} note="manual refresh only" />
              <Metric label="Refresh window" value={`${configuration.data.refreshWindowMs}ms`} note="snapshot cadence" />
              <Metric label="Persistence" value={configuration.data.persistenceBackend} note="memory only" />
            </div>
            <div className="id-list">
              <span>Backends</span>
              <div>
                <code className="mono">secrets: {configuration.data.secretBackend}</code>
                <code className="mono">settlement: {configuration.data.settlementBackend}</code>
              </div>
            </div>
            {configuration.data.notices.map(note => <p className="panel-note" key={note}>{note}</p>)}
          </> : <PanelStateLine state={configuration.loadState} error={configuration.loadError} emptyMessage="No configuration reported by the Product API." />}
          {configuration.loadState === "error" && <ErrorBanner error={configuration.loadError} />}
        </SummaryCard>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head"><h2>EPIC-11 acceptance</h2><p>Read-only milestone gate projection. It reports what was validated and never fabricates checks.</p></div>
      <div className="dashboard-grid execution-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Milestone status</h2><p>{acceptance.data?.title ?? "Acceptance report"}</p></div><Badge tone={acceptance.data?.milestoneStatuses.some(milestone => milestone.status === "PASS_WITH_CAVEAT") ? "warn" : "good"}>{acceptance.data?.milestone ?? "F"}</Badge></div>
          <div className="panel-body">
            {acceptance.data ? (
              <div className="catalog-list">
                {acceptance.data.milestoneStatuses.map(milestone => (
                  <div className="catalog-row" key={milestone.id}>
                    <div className="catalog-row-main"><b>{milestone.label}</b><small>{milestone.evidence}</small></div>
                    <Badge tone={milestone.status === "PASS" ? "good" : "warn"}>{milestone.status}</Badge>
                  </div>
                ))}
              </div>
            ) : <PanelStateLine state={acceptance.loadState} error={acceptance.loadError} emptyMessage="No acceptance report available." />}
            {acceptance.loadState === "error" && <ErrorBanner error={acceptance.loadError} />}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Validation summary</h2><p>Checks performed at milestone close</p></div></div>
          <div className="panel-body">
            {acceptance.data ? <>
              <div className="summary-list">
                <SummaryRow label="Production ready" value={String(acceptance.data.productionReadiness.ready)} tone="warn" />
                <SummaryRow label="Readiness status" value={acceptance.data.productionReadiness.status} tone="warn" />
                <SummaryRow label="Supported surfaces" value={acceptance.data.supportedSurfaces.length} />
                <SummaryRow label="Deferred items" value={acceptance.data.deferredItems.length} />
              </div>
              <p className="panel-note">{acceptance.data.productionReadiness.note}</p>
              <TimelineList items={acceptance.data.validationSummary.map(check => ({ id: check.id, title: check.label, meta: check.status, detail: check.evidence, tone: check.status === "pass" ? "good" : check.status === "caveat" ? "warn" : "muted" }))} />
            </> : <PanelStateLine state={acceptance.loadState} error={acceptance.loadError} emptyMessage="No acceptance report available." />}
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head"><h2>Known caveats & deferred scope</h2><p>Honest boundary of the EPIC-11 gate.</p></div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Known caveats</h2><p>What the gate did not run</p></div></div>
          <div className="panel-body">
            {acceptance.data ? (acceptance.data.knownCaveats.length
              ? <TimelineList items={acceptance.data.knownCaveats.map((caveat, index) => ({ id: `caveat-${index}`, title: "Caveat", detail: caveat, tone: "warn" }))} />
              : <EmptyState message="No caveats recorded." />) : <PanelStateLine state={acceptance.loadState} error={acceptance.loadError} emptyMessage="No acceptance report available." />}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Deferred items</h2><p>Future EPIC scope</p></div></div>
          <div className="panel-body">
            {acceptance.data ? (acceptance.data.deferredItems.length
              ? <TimelineList items={acceptance.data.deferredItems.map((item, index) => ({ id: `deferred-${index}`, title: item }))} />
              : <EmptyState message="No deferred items recorded." />) : <PanelStateLine state={acceptance.loadState} error={acceptance.loadError} emptyMessage="No acceptance report available." />}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Supported surfaces</h2><p>EPIC-11 operational surface</p></div></div>
          <div className="panel-body">
            {acceptance.data ? (acceptance.data.supportedSurfaces.length
              ? <TimelineList items={acceptance.data.supportedSurfaces.map((surface, index) => ({ id: `surface-${index}`, title: surface }))} />
              : <EmptyState message="No supported surfaces reported." />) : <PanelStateLine state={acceptance.loadState} error={acceptance.loadError} emptyMessage="No acceptance report available." />}
          </div>
        </section>
      </div>
    </div>
  </>;
}

function OperationalReliabilityView() {
  const reliability = useOperationalSummary<OperationalReliabilityReport>(
    () => productApi.getOperationalReliabilityReport(),
    "Unable to load operational reliability from Product API",
    () => false,
  );

  const findingItems = (findings: OperationalReliabilityReport["blockers"], tone: "good" | "warn" | "muted") =>
    findings.map((finding, index) => ({
      id: `${finding.code}-${index}`,
      title: finding.code,
      meta: `${finding.severity} · ${finding.responsibleDomain}`,
      detail: finding.message,
      tone,
    }));

  return <>
    <DomainHeader domain="System" title="Runtime Confidence & Recovery" description="Read-only projection of long-running operations, runtime/worker confidence and distributed operation caveats." actions={<button className="secondary" onClick={reliability.refresh}>Refresh</button>} />
    {staleBanner(reliability, "operational reliability")}
    <div className="flow-group">
      <div className="flow-group-head"><h2>Reliability summary</h2><p>Evidence-bounded state reported by the Product API, never inferred by this surface.</p></div>
      <div className="dashboard-grid execution-grid">
        <section className="panel wide">
          <div className="panel-head"><div><h2>Operational reliability status</h2><p>Current projection and claim discipline</p></div><Badge tone={reliability.data?.operationalReliabilityReady ? "good" : "warn"}>not ready / evidence-bounded</Badge></div>
          <div className="panel-body">
            {reliability.data ? <>
              <div className="guardrail-banner" role="note"><span>Production Ready: NO / not yet claimed</span><span>Operational Reliability Ready: NO / not overclaimed</span><span>Claim: {reliability.data.claim}</span><span>Source of truth: product-api</span></div>
              <div className="summary-list">
                <SummaryRow label="Operations tracked" value={reliability.data.summary.operationsTracked} />
                <SummaryRow label="Running" value={reliability.data.summary.running} />
                <SummaryRow label="Succeeded" value={reliability.data.summary.succeeded} tone="good" />
                <SummaryRow label="Failed" value={reliability.data.summary.failed} tone="warn" />
                <SummaryRow label="Blocked" value={reliability.data.summary.blocked} tone="warn" />
                <SummaryRow label="Stale" value={reliability.data.summary.stale} tone="warn" />
                <SummaryRow label="Recovering" value={reliability.data.summary.recovering} />
                <SummaryRow label="Checked" value={new Date(reliability.data.checkedAt).toLocaleString()} />
              </div>
              <p className="panel-note">{reliability.data.claimDiscipline.reason}</p>
            </> : <PanelStateLine state={reliability.loadState} error={reliability.loadError} emptyMessage="No operational reliability reported by the Product API." />}
            {reliability.loadState === "error" && <ErrorBanner error={reliability.loadError} />}
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head"><h2>Operation model</h2><p>Long-running operation types, availability and unsupported reasons.</p></div>
      <div className="dashboard-grid evidence-grid">
        <DashboardCard title="Operation state model" meta="Supported, unsupported, unavailable and deferred operation types" state={reliability.data ? "ready" : reliability.loadState} emptyMessage="No operation state model reported.">
          {reliability.data && <TimelineList items={reliability.data.operationStateModel.map((entry) => ({
            id: entry.type,
            title: entry.label,
            meta: `${entry.type} · ${entry.state}`,
            detail: entry.reason,
            tone: entry.state === "supported" ? "good" : entry.state === "not_applicable" ? "muted" : "warn",
          }))} />}
        </DashboardCard>
        <DashboardCard title="Long-running operations" meta="Observed operations or honest unavailable state" state={reliability.data ? "ready" : reliability.loadState} emptyMessage="No long-running operations reported.">
          {reliability.data && (reliability.data.longRunningOperations.length
            ? <TimelineList items={reliability.data.longRunningOperations.map((operation) => ({
                id: operation.id,
                title: `${operation.type} · ${operation.targetEntity}`,
                meta: `${operation.state} · retry: ${operation.retryAvailability} · recovery: ${operation.recoveryAvailability}`,
                detail: operation.reason ?? operation.caveats.join(" · "),
                tone: operation.state === "succeeded" ? "good" : operation.state === "failed" || operation.state === "blocked" || operation.stale ? "warn" : "muted",
              }))} /> : <EmptyState message="No long-running operations are reported; unsupported and unavailable states are explicit in the operation state model." />)}
        </DashboardCard>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head"><h2>Runtime & worker confidence</h2><p>Control-plane assertions, runtime observations and external target state are reported separately.</p></div>
      <div className="dashboard-grid evidence-grid">
        <DashboardCard title="Runtime confidence" meta="Runtime and execution target observations" state={reliability.data ? "ready" : reliability.loadState} emptyMessage="No runtime confidence reported.">
          {reliability.data && <TimelineList items={reliability.data.runtimeConfidence.map((item) => ({
            id: item.id,
            title: item.id,
            meta: `${item.state} · ${item.healthState} · confidence: ${item.confidenceLevel} · ${item.sourceOfObservation}`,
            detail: item.caveats.join(" · "),
            tone: item.state === "running" || item.state === "ready" ? "good" : item.stale || item.state === "failed" ? "warn" : "muted",
          }))} />}
        </DashboardCard>
        <DashboardCard title="Worker confidence" meta="Registered worker state and unsupported operations" state={reliability.data ? "ready" : reliability.loadState} emptyMessage="No worker confidence reported.">
          {reliability.data && <TimelineList items={reliability.data.workerConfidence.map((item) => ({
            id: item.id,
            title: item.id,
            meta: `${item.state} · ${item.healthState} · confidence: ${item.confidenceLevel} · ${item.capacitySummary}`,
            detail: `${item.unsupportedOperations.join(" · ")}${item.caveats.length ? ` · ${item.caveats.join(" · ")}` : ""}`,
            tone: item.state === "available" ? "good" : item.stale || item.state === "failed" ? "warn" : "muted",
          }))} />}
        </DashboardCard>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head"><h2>Distributed operations</h2><p>Supported, partial and unavailable scenarios without simulated distributed success.</p></div>
      <div className="dashboard-grid execution-grid">
        <section className="panel wide">
          <div className="panel-head"><div><h2>Distributed scenario matrix</h2><p>{reliability.data?.distributedOperations.status ?? "unavailable"}</p></div><Badge tone={reliability.data?.distributedOperations.status === "supported" ? "good" : "warn"}>{reliability.data?.distributedOperations.status ?? "unavailable"}</Badge></div>
          <div className="panel-body">
            {reliability.data ? <>
              <TimelineList items={reliability.data.distributedOperations.scenarios.map((scenario) => ({
                id: scenario.id,
                title: scenario.label,
                meta: scenario.status,
                detail: scenario.reason,
                tone: scenario.status === "supported" ? "good" : scenario.status === "partial" ? "warn" : "muted",
              }))} />
              <TimelineList items={reliability.data.distributedOperations.caveats.map((caveat, index) => ({ id: `distributed-caveat-${index}`, title: "Distributed caveat", detail: caveat, tone: "warn" }))} />
            </> : <PanelStateLine state={reliability.loadState} error={reliability.loadError} emptyMessage="No distributed operations matrix reported." />}
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head"><h2>Recovery semantics & findings</h2><p>Retry, cancellation, recovery and evidence-linkage availability.</p></div>
      <div className="dashboard-grid evidence-grid">
        <DashboardCard title="Recovery semantics" meta="Availability is explicit; visibility is not automation" state={reliability.data ? "ready" : reliability.loadState} emptyMessage="No recovery semantics reported.">
          {reliability.data && <TimelineList items={reliability.data.recoverySemantics.map((entry) => ({
            id: entry.id,
            title: entry.label,
            meta: entry.state,
            detail: entry.reason,
            tone: entry.state === "available" ? "good" : entry.state === "unsupported" || entry.state === "unavailable" ? "warn" : "muted",
          }))} />}
        </DashboardCard>
        <DashboardCard title="Blockers & warnings" meta="High-severity reliability blockers and evidence gaps" state={reliability.data ? "ready" : reliability.loadState} emptyMessage="No reliability findings reported.">
          {reliability.data && <>
            <TimelineList items={findingItems(reliability.data.blockers, "warn")} />
            <TimelineList items={findingItems(reliability.data.warnings, "warn")} />
          </>}
        </DashboardCard>
      </div>
      <div className="dashboard-grid evidence-grid">
        <DashboardCard title="Caveats" meta="Honest limits of the current projection" state={reliability.data ? "ready" : reliability.loadState} emptyMessage="No caveats reported.">
          {reliability.data && <TimelineList items={findingItems(reliability.data.caveats, "warn")} />}
        </DashboardCard>
        <DashboardCard title="Deferred items" meta="Future milestone or EPIC scope" state={reliability.data ? "ready" : reliability.loadState} emptyMessage="No deferred items reported.">
          {reliability.data && <TimelineList items={reliability.data.deferredItems.map((finding, index) => ({
            id: `${finding.code}-${index}`,
            title: finding.code,
            meta: `${finding.severity} · ${finding.dependsOnFutureMilestone ?? "future scope"}`,
            detail: finding.message,
            tone: "muted",
          }))} />}
        </DashboardCard>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head"><h2>Gate dependencies & evidence</h2><p>Readiness gates consumed by this projection and source files used to build it.</p></div>
      <div className="dashboard-grid evidence-grid">
        <SummaryCard title="Claim discipline" meta="Claims that this milestone cannot make" state={reliability.data ? "ready" : reliability.loadState} emptyMessage="No claim discipline reported.">
          {reliability.data && <>
            <div className="summary-list">
              <SummaryRow label="Production ready claim" value="NO" tone="warn" />
              <SummaryRow label="Operational reliability ready claim" value="NO" tone="warn" />
            </div>
            <p className="panel-note">{reliability.data.claimDiscipline.reason}</p>
          </>}
        </SummaryCard>
        <DashboardCard title="Readiness gate dependencies" meta="Gates consumed by the operational reliability projection" state={reliability.data?.readinessGateDependencies.length ? "ready" : reliability.loadState} emptyMessage="No readiness gate dependencies reported.">
          {reliability.data && <IdList label="Gates" ids={reliability.data.readinessGateDependencies} />}
        </DashboardCard>
      </div>
      <div className="dashboard-grid evidence-grid">
        <SummaryCard title="Source evidence" meta="Files and contracts used for the reliability projection" state={reliability.data?.sourceEvidence.length ? "ready" : reliability.loadState} emptyMessage="No source evidence reported.">
          {reliability.data && <IdList label="Evidence" ids={reliability.data.sourceEvidence} />}
        </SummaryCard>
      </div>
    </div>
  </>;
}

function Settings() {
  return <>
    <DomainHeader domain="System" title="Settings" description="Workspace and configuration visibility. This is not a production administration console." />
    <section className="panel"><div className="panel-head"><div><h2>ACS Workspace</h2><p>Local paths used by the current control plane.</p></div></div><div className="form"><label>Workspace path<input className="mono" readOnly defaultValue="~/.openclaw" /></label></div></section>
  </>;
}

export default function App() {
  const [palette, setPalette] = useState(false);
  const [dark, setDark] = useState(true);
  const [mobile, setMobile] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [connectivity, setConnectivity] = useState<ConnectivityState>({ status: "loading", health: null, error: null });

  async function checkProductApi() {
    setConnectivity({ status: "loading", health: null, error: null });
    try {
      const health = await productApi.health();
      setConnectivity({ status: "ready", health, error: null });
    } catch (error) {
      setConnectivity({
        status: "error",
        health: null,
        error: error instanceof Error ? error.message : "Product API is unavailable",
      });
    }
  }

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette(v => !v);
      }
      if (e.key === "Escape") {
        setPalette(false);
        setMobile(false);
      }
    };
    addEventListener("keydown", fn);
    return () => removeEventListener("keydown", fn);
  }, []);

  useEffect(() => {
    setMobile(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobile ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobile]);

  useEffect(() => {
    void checkProductApi();
  }, []);

  const view = viewOfPath(location.pathname);

  const domain = domainByPath(location.pathname);
  const domainDef = domainDefs.find(item => item.id === domain)!;
  const entityMatch = location.pathname.match(/^\/(agents|roles|profiles|capabilities|skills|plugins|tools|engines|providers)\/([^/]+)(?:\/|$)/);
  const entityLabel = location.pathname === "/agents/new"
    ? "Create agent"
    : location.pathname.includes("/edit")
      ? "Edit agent"
      : entityMatch
        ? entityMatch[1].replace(/s$/, "") + ": " + entityMatch[2]
        : undefined;
  const title = entityLabel ?? view ?? domain;

  return (
    <div className={dark ? "app dark" : "app light"}>
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <div className="brand"><img src="/assets/Axodus_logo.svg" alt="ACS" /><div><b>ACS</b><small>CONTROL PLANE</small></div><button className="mobile-close" type="button" aria-label="Close navigation" onClick={() => setMobile(false)}>×</button></div>
        <div className="workspace-switch" aria-live="polite"><span className="workspace-icon">⌘</span><div><b>{productApiConfig.environment} environment</b><small>{productApiConfig.tenantId} · server-resolved session</small></div></div>
        <SidebarNavigation pathname={location.pathname} activeDomain={domain} onNavigate={() => setMobile(false)} />
        <div className="connection"><div><span className="openclaw-mark">A</span><div><b>Product API</b><small><i /> {connectivity.status === "ready" ? "Connected" : connectivity.status === "loading" ? "Checking" : "Unavailable"}</small></div></div><span className="mono">/api/v1</span></div>
      </aside>
      {mobile && <button type="button" className="mobile-drawer-overlay" aria-label="Close navigation overlay" onClick={() => setMobile(false)} />}
      <main className="main">
        <header className="topbar">
          <button className="menu" type="button" aria-label="Open navigation" onClick={() => setMobile(true)}>☰</button>
          <nav className="crumb" aria-label="Breadcrumb"><Link to="/">ACS</Link><i>/</i><Link to={domainDef.to}>{domain}</Link>{entityLabel && <><i>/</i><b>{entityLabel}</b></>}{!entityLabel && <><i>/</i><b>{title}</b></>}</nav>
          <div className="top-actions"><Status status={connectivity.status === "ready" ? "Product API connected" : connectivity.status === "loading" ? "Checking Product API" : "Product API unavailable"} /><AccountControl dark={dark} /><button className="command" type="button" onClick={() => setPalette(true)}>⌕ <span>Search ACS...</span><kbd>⌘ K</kbd></button><button className="icon-btn" type="button" aria-label="Toggle theme" onClick={() => setDark(!dark)}>{dark ? "☼" : "◐"}</button></div>
        </header>
        {connectivity.status === "loading" && <div className="global-state loading-state" role="status">Connecting to Product API boundary...</div>}
        {connectivity.status === "error" && <div className="global-state error-state" role="alert"><span>Product API unavailable: {connectivity.error}</span><button className="secondary" onClick={() => void checkProductApi()}>Retry</button></div>}
        <div className="content">
          <EntityContextNav pathname={location.pathname} />
          <Routes>
            <Route path="/" element={<CustomerDashboard />} />
            <Route path="/administration" element={<AdministrationOverview />} />
            <Route path="/operational-execution" element={<OperationalExecution />} />
            <Route path="/executions" element={<ExecutionsPage />} />
            <Route path="/executions/:jobId" element={<ExecutionDetailPage />} />
            <Route path="/workers" element={<WorkersPage />} />
            <Route path="/workers/:workerId" element={<WorkerDetailPage />} />
            <Route path="/operations" element={<OperationsStatusPage />} />
            <Route path="/operations/overview" element={<OperationsStatusPage />} />
            <Route path="/readiness" element={<Readiness />} />
            <Route path="/agents" element={<AgentInventory />} />
            <Route path="/agents/new" element={<AgentCreate />} />
            <Route path="/agents/:agentId/edit" element={<AgentEdit />} />
            <Route path="/credentials" element={<CredentialsPage />} />
            <Route path="/agents/:agentId/composition" element={<AgentCompositionView />} />
            <Route path="/agents/:agentId/configuration" element={<AgentConfigurationView />} />
            <Route path="/agents/:agentId/validate" element={<AgentValidateView />} />
            <Route
              path="/agents/:agentId/runs"
              element={
                <AgentScopedUnsupportedView
                  title="Runs"
                  description="Runs associated with this Agent."
                  canonicalPath="/executions"
                  canonicalLabel="global Runs"
                  subject="Runs"
                />
              }
            />
            <Route path="/agents/:agentId/revisions" element={<AgentRevisionsView />} />
            <Route
              path="/agents/:agentId/evidence"
              element={
                <AgentScopedUnsupportedView
                  title="Evidence"
                  description="Evidence associated with this Agent."
                  canonicalPath="/operational-evidence"
                  canonicalLabel="global Evidence"
                  subject="Evidence"
                />
              }
            />
            <Route
              path="/agents/:agentId/usage-cost"
              element={
                <AgentScopedUnsupportedView
                  title="Usage & Cost"
                  description="Usage and cost associated with this Agent."
                  canonicalPath="/economics"
                  canonicalLabel="global Usage & Cost"
                  subject="Usage & Cost"
                />
              }
            />
            <Route path="/agents/:agentId/advanced" element={<AgentAdvancedView />} />
            <Route path="/agents/:agentId" element={<AgentDetail />} />
            <Route path="/composition" element={<CompositionOverview />} />
            <Route path="/roles" element={<RoleCatalog />} />
            <Route path="/roles/:roleId" element={<RoleDetail />} />
            <Route path="/profiles" element={<ProfileCatalog />} />
            <Route path="/profiles/:profileId" element={<ProfileDetail />} />
            <Route path="/capabilities" element={<CapabilityCatalog />} />
            <Route path="/capabilities/:capabilityId" element={<CapabilityDetail />} />
            <Route path="/skills" element={<SkillCatalog />} />
            <Route path="/skills/:skillId" element={<SkillDetail />} />
            <Route path="/plugins" element={<ToolsPluginsCatalog />} />
            <Route path="/tools/:toolId" element={<ToolDetail />} />
            <Route path="/plugins/:pluginId" element={<PluginDetail />} />
            <Route path="/engines" element={<EngineCatalog />} />
            <Route path="/engines/:engineId" element={<EngineDetail />} />
            <Route path="/providers/:providerId" element={<ProviderDetail />} />
            <Route path="/memory" element={<GenericView view="Memory" />} />
            <Route path="/runtime" element={<Runtime />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/operational-evidence" element={<EvidenceView />} />
            <Route path="/audit" element={<AuditView />} />
            <Route path="/economics" element={<EconomicsView />} />
            <Route path="/system/billing-boundary" element={<BillingBoundaryView />} />
            <Route path="/system/payment-rails-boundary" element={<PaymentRailsBoundaryView />} />
            <Route path="/system/pricing-invoice-boundary" element={<PricingInvoiceBoundaryView />} />
            <Route path="/system/tenant-billing-boundary" element={<TenantBillingBoundaryView />} />
            <Route path="/system/settlement-reconciliation" element={<SettlementReconciliationBoundaryView />} />
            <Route path="/system/financial-audit" element={<FinancialAuditBoundaryView />} />
            <Route path="/system/billing-acceptance" element={<BillingUxAcceptanceView />} />
            <Route path="/system" element={<GovernanceView />} />
            <Route path="/system/operational-reliability" element={<OperationalReliabilityView />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <footer><span><i /> {connectivity.status === "ready" ? "Product API connected" : connectivity.status === "loading" ? "Connecting" : "Product API unavailable"}</span><span className="mono">{productApiConfig.environment}</span><span>ACS Control Plane</span></footer>
      </main>
      {palette && <div className="palette-wrap" onClick={() => setPalette(false)}><div className="palette" onClick={e => e.stopPropagation()}><label>⌕<input autoFocus placeholder="Search ACS or run a command..." /></label><p>QUICK ACTIONS</p><button onClick={() => { setPalette(false); navigate("/agents/new"); }}><span>＋</span><div><b>Create agent</b><small>Open the governed Agent create form</small></div><kbd>↵</kbd></button></div></div>}
    </div>
  );
}
