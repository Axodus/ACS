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
} from "./api/product-api";
import "./operational.css";

type View =
  | "Dashboard"
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
  | "Settings";

type ConnectivityState =
  | { status: "loading"; health: null; error: null }
  | { status: "ready"; health: ProductApiHealth; error: null }
  | { status: "error"; health: null; error: string };

const navGroups: View[][] = [
  ["Dashboard", "Operational Execution", "Readiness", "Composition"],
  ["Agents", "Roles", "Profiles", "Capabilities"],
  ["Skills", "Tools & Plugins"],
  ["Memory"],
  ["Runtime", "Logs"],
  ["Settings"],
];

const icons: Record<View, string> = {
  Dashboard: "⌂",
  "Operational Execution": "⟡",
  Readiness: "✓",
  Composition: "◈",
  Agents: "◫",
  Roles: "◇",
  Profiles: "▤",
  Capabilities: "✛",
  Skills: "✦",
  "Tools & Plugins": "⌘",
  Memory: "◎",
  Runtime: "◉",
  Logs: "≡",
  Settings: "⚙",
};

const viewPaths: Record<View, string> = {
  Dashboard: "/",
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
  Settings: "/settings",
};

const viewOfPath = (path: string): View | null => {
  const exact = (Object.entries(viewPaths) as [View, string][]).find(([, p]) => p === path)?.[0];
  if (exact) return exact;
  const prefix = `/${path.split("/")[1] ?? ""}`;
  return (Object.entries(viewPaths) as [View, string][]).find(([, p]) => p === prefix)?.[0] ?? null;
};

const SAFE_IDENTIFIER = /^[a-zA-Z0-9._:-]+$/;

function apiErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return error instanceof Error ? error.message : "An unexpected API error occurred";
}

function Status({ status }: { status: string }) {
  const tone = /running|healthy|connected|installed|active/i.test(status) ? "good" : /warning|updating/i.test(status) ? "warn" : "muted";
  return <span className={`status ${tone}`}><i />{status}</span>;
}

function Badge({ tone, children }: { tone: "good" | "warn" | "muted"; children: ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>;
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
  fetcherRef.current = fetcher;
  isStaleRef.current = isStale;

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
            setLoadError(emptyError.replace("Unable to load", "Refresh failed; keeping previous"));
          } else {
            setLoadError(emptyError);
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

function SummaryRow({ label, value, tone }: { label: string; value: string | number; tone?: "good" | "warn" | "muted" }) {
  return <div className="summary-row"><span>{label}</span><strong className={tone ?? ""}>{value}</strong></div>;
}

function FindingRow({ finding }: { finding: DashboardFinding }) {
  return <div className={`finding-row ${finding.severity}`}><span>{finding.severity}</span><p>{finding.message}</p></div>;
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
  const tone = /ready|ok|connected/i.test(status) ? "good" : /partial|blocked|degraded|warning|unavailable|unverified/i.test(status) ? "warn" : "muted";
  return <span className={`status ${tone}`}><i />{status}</span>;
}

function ReadinessFindingRow({ finding }: { finding: ReadinessFinding }) {
  const severity = finding.severity === "error" ? "error" : finding.severity === "warning" ? "warning" : "info";
  return <div className={`finding-row ${severity}`}>
    <span>{finding.severity}</span>
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
    <header className="page-head compact dashboard-head">
      <div><p className="eyebrow">OPERATIONAL AWARENESS</p><h1>Global Readiness & Health</h1><p>Read-only inspection of ACS readiness, blockers, evidence and Product API health.</p></div>
      <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadError ? "Retry" : loadState === "refreshing" ? "Rechecking" : "Recheck"}</button>
    </header>
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

function Dashboard() {
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

  return <>
    <header className="page-head compact dashboard-head">
      <div><p className="eyebrow">OPERATIONAL AWARENESS</p><h1>System Dashboard</h1><p>Aggregated ACS state from the Product API. Read-only surface.</p></div>
      <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadError ? "Retry" : loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
    </header>
    <OperationalModeNotice guardrails={summary?.system.guardrails} />
    {stale && <div className="stale-banner" role="status">Showing a stale dashboard snapshot. Refresh to recover live state.</div>}
    {loadState === "refreshing" && <div className="refresh-banner" role="status">Refreshing dashboard and readiness...</div>}
    {loadError && <div className="error-banner" role="alert">{loadError}</div>}
    <div className="dashboard-grid">
      <DashboardCard title="System overview" meta="Product API boundary" state={readyState}>
        <div className="summary-list">
          <SummaryRow label="Service" value={summary?.system.service ?? "--"} />
          <SummaryRow label="Status" value="Connected" tone="good" />
          <SummaryRow label="Mode" value={summary?.system.mode ?? "--"} />
          <SummaryRow label="Automation" value={summary?.system.automation ?? "--"} />
          <SummaryRow label="Access" value="read-only" />
          <SummaryRow label="Generated" value={generatedAt} />
          <SummaryRow label="Checked" value={checkedAt} />
        </div>
      </DashboardCard>
      <DashboardCard title="Readiness" meta="Milestone A operational state" state={readyState}>
        <div className="summary-list">
          <SummaryRow label="State" value={summary?.readiness.state ?? "--"} tone={readinessTone} />
          <SummaryRow label="Blockers" value={summary?.readiness.blockerCount ?? 0} tone={readinessTone} />
          <SummaryRow label="Warnings" value={summary?.readiness.warningCount ?? 0} />
          <SummaryRow label="Evidence domains" value={summary?.readiness.evidenceCount ?? 0} />
          <SummaryRow label="Runtime" value={summary?.runtime.connectivity ?? "--"} tone={connectivityTone} />
        </div>
        <Link className="surface-link" to="/readiness">Open global readiness →</Link>
      </DashboardCard>
      <DashboardCard title="Snapshot consistency" meta="Refresh and stale-state contract" state={readyState}>
        <div className="summary-list">
          <SummaryRow label="State" value={stale ? "Stale" : "Fresh"} tone={stale ? "warn" : "good"} />
          <SummaryRow label="Refresh window" value={`${summary?.system.refreshWindowMs ?? 0}ms`} />
          <SummaryRow label="Snapshot age" value={`${summary?.system.stateAgeMs ?? 0}ms`} />
          <SummaryRow label="Read-only" value="Guaranteed" tone="good" />
        </div>
      </DashboardCard>
      <DashboardCard title="Agent summary" meta="Registered agent definitions" state={cardState(summary?.agents.total)} emptyMessage="No agents registered">
        <div className="summary-list">
          <SummaryRow label="Total" value={summary?.agents.total ?? 0} />
          <SummaryRow label="Active" value={summary?.agents.active ?? 0} tone="good" />
          <SummaryRow label="Draft" value={summary?.agents.draft ?? 0} />
          <SummaryRow label="Disabled" value={summary?.agents.disabled ?? 0} />
          <SummaryRow label="Archived" value={summary?.agents.archived ?? 0} tone="muted" />
        </div>
      </DashboardCard>
      <DashboardCard title="Deployment summary" meta="Sandbox deployment records" state={cardState(summary?.deployments.total)} emptyMessage="No deployments recorded">
        <div className="summary-list">
          <SummaryRow label="Total" value={summary?.deployments.total ?? 0} />
          <SummaryRow label="Deployed" value={summary?.deployments.deployed ?? 0} tone="good" />
          <SummaryRow label="Failed" value={summary?.deployments.failed ?? 0} />
          <SummaryRow label="Rejected" value={summary?.deployments.rejected ?? 0} />
        </div>
      </DashboardCard>
      <DashboardCard title="Runtime summary" meta="Runtime instance states" state={cardState(summary?.runtimes.total)} emptyMessage="No runtime instances">
        <div className="summary-list">
          <SummaryRow label="Total" value={summary?.runtimes.total ?? 0} />
          <SummaryRow label="Running" value={summary?.runtimes.running ?? 0} tone="good" />
          <SummaryRow label="Pending" value={summary?.runtimes.pending ?? 0} />
          <SummaryRow label="Stopped" value={summary?.runtimes.stopped ?? 0} tone="muted" />
          <SummaryRow label="Failed" value={summary?.runtimes.failed ?? 0} />
        </div>
      </DashboardCard>
      <DashboardCard title="Worker summary" meta="Execution worker registry" state={cardState(summary?.workers.total)} emptyMessage="No workers registered">
        <div className="summary-list">
          <SummaryRow label="Total" value={summary?.workers.total ?? 0} />
          <SummaryRow label="Available" value={summary?.workers.available ?? 0} tone="good" />
          <SummaryRow label="Slots" value={summary?.workers.availableSlots ?? 0} />
          <SummaryRow label="Assignments" value={summary?.workers.activeAssignments ?? 0} />
          <SummaryRow label="Unavailable" value={summary?.workers.unavailable ?? 0} />
        </div>
      </DashboardCard>
      <DashboardCard title="ExecutionRun summary" meta="Execution run records" state={cardState(summary?.executionRuns.total)} emptyMessage="No execution runs">
        <div className="summary-list">
          <SummaryRow label="Total" value={summary?.executionRuns.total ?? 0} />
          <SummaryRow label="Running" value={summary?.executionRuns.running ?? 0} tone="good" />
          <SummaryRow label="Completed" value={summary?.executionRuns.completed ?? 0} tone="good" />
          <SummaryRow label="Pending" value={summary?.executionRuns.pending ?? 0} />
          <SummaryRow label="Failed" value={summary?.executionRuns.failed ?? 0} />
        </div>
        {summary && summary.executionRuns.recent.length > 0 && <div className="recent-runs"><b>Recent runs</b>{summary.executionRuns.recent.slice(0, 3).map(run => <span key={run.runId}><i />{run.runId}<code>{run.status}</code></span>)}</div>}
      </DashboardCard>
      <DashboardCard title="Critical blockers" meta="Operational errors requiring attention" state={cardState(summary?.blockers.length)} emptyMessage="No critical blockers">
        <div className="finding-list">{summary?.blockers.map(finding => <FindingRow key={`${finding.code}-${finding.message}`} finding={finding} />)}</div>
      </DashboardCard>
      <DashboardCard title="Operational warnings" meta="Non-blocking operational signals" state={cardState(summary?.warnings.length)} emptyMessage="No operational warnings">
        <div className="finding-list">{summary?.warnings.map(finding => <FindingRow key={`${finding.code}-${finding.message}`} finding={finding} />)}</div>
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
    <header className="page-head compact">
      <div><p className="eyebrow">AGENT LIFECYCLE</p><h1>Agents</h1><p>Operational inventory of agent definitions, revisions and lifecycle state from the Product API.</p></div>
      <div className="head-actions">
        <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadError ? "Retry" : loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
        <Link className="primary action-link" to="/agents/new">＋ Create agent</Link>
      </div>
    </header>
    <div className="guardrail-banner" role="note"><span>Inspection / control-plane mode</span><span>Sandbox only</span><span>Governed by Product API</span></div>
    {stale && <div className="stale-banner" role="status">Showing a stale agent snapshot. Refresh to recover live state.</div>}
    {loadState === "refreshing" && <div className="refresh-banner" role="status">Refreshing agents...</div>}
    {loadError && <div className="error-banner" role="alert">{loadError}</div>}
    <div className="toolbar">
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
    () => productApi.getAgentReadiness("dev-agent-sandbox"),
    "Unable to load operational readiness",
    data => data.stale,
  );
  const plans = useOperationalSummary<[DeploymentPlan | null, ExecutionPlan | null]>(
    async () => [await productApi.getAgentDeploymentPlan("dev-agent-sandbox"), await productApi.getAgentExecutionPlan("dev-agent-sandbox")],
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

  return <>
    <header className="page-head compact dashboard-head">
      <div><p className="eyebrow">OPERATIONAL EXECUTION</p><h1>Governed execution surface</h1><p>Read-only operational projections from the Product API. No raw secrets, no direct runtime access.</p></div>
      <button className="secondary" onClick={() => { credentials.refresh(); connections.refresh(); readiness.refresh(); plans.refresh(); deployments.refresh(); runtimes.refresh(); runs.refresh(); workers.refresh(); }}>Refresh all</button>
    </header>
    <OperationalModeNotice guardrails={credentials.data?.[0]?.guardrails ?? connections.data?.[0]?.guardrails} />
    <div className="dashboard-grid execution-grid">
      <section className="panel">
        <div className="panel-head"><div><h2>Credentials</h2><p>Redacted secret references and validation state</p></div><Badge tone={credentials.data?.length ? "good" : "muted"}>{credentials.data?.length ?? 0}</Badge></div>
        <div className="panel-body">
          {credentials.data?.length ? credentials.data.map(item => <div className="catalog-row" key={item.credentialId}><div className="catalog-row-main"><b>{item.providerName}</b><small className="mono">{item.credentialId}</small><p>{item.secretRefRedacted} · {item.status} · validated={String(item.validated)}</p></div><Badge tone={item.validated ? "good" : "warn"}>{item.validated ? "validated" : "unvalidated"}</Badge></div>) : <div className="state-line empty">No credentials reported</div>}
        </div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Provider connections</h2><p>Health and authentication state</p></div><Badge tone={connections.data?.length ? "good" : "muted"}>{connections.data?.length ?? 0}</Badge></div>
        <div className="panel-body">
          {connections.data?.length ? connections.data.map(item => <div className="catalog-row" key={item.connectionId}><div className="catalog-row-main"><b>{item.providerName}</b><small className="mono">{item.connectionId}</small><p>{item.health} · {item.authState} · {item.availability}</p></div><Badge tone={item.health === "healthy" ? "good" : item.health === "degraded" ? "warn" : "muted"}>{item.health}</Badge></div>) : <div className="state-line empty">No provider connections reported</div>}
        </div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Readiness</h2><p>Operational readiness categories and blockers</p></div><Badge tone={readiness.data?.ready ? "good" : "warn"}>{readiness.data?.status ?? "unavailable"}</Badge></div>
        <div className="panel-body">
          {readiness.data ? <>
            <SummaryRow label="Agent" value={readiness.data.agentName} />
            <SummaryRow label="Blockers" value={readiness.data.blockers.length} />
            <SummaryRow label="Warnings" value={readiness.data.warnings.length} />
            {readiness.data.categories.map(category => <div className="finding-row" key={category.id}><span>{category.status}</span><div className="finding-content"><b>{category.label}</b><p>{category.blockerCount} blockers · {category.warningCount} warnings</p></div></div>)}
          </> : <div className="state-line empty">No readiness data</div>}
        </div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Deployment plan</h2><p>Preview only, governed by Product API</p></div></div>
        <div className="panel-body">
          {plans.data?.[0] ? <><SummaryRow label="Plan" value={plans.data[0].planId} /><SummaryRow label="Target" value={plans.data[0].target} /><SummaryRow label="Engine" value={plans.data[0].engine} /><SummaryRow label="Eligible" value={String(plans.data[0].eligible)} /></> : <div className="state-line empty">No deployment plan</div>}
        </div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Deployments</h2><p>Deployment inventory</p></div><Badge tone={deployments.data?.length ? "good" : "muted"}>{deployments.data?.length ?? 0}</Badge></div>
        <div className="panel-body">{deployments.data?.length ? deployments.data.map(item => <div className="catalog-row" key={item.deploymentId}><div className="catalog-row-main"><b>{item.deploymentId}</b><small>{item.agentId} · {item.status}</small></div><Badge tone={item.active ? "good" : "muted"}>{item.active ? "active" : "inactive"}</Badge></div>) : <div className="state-line empty">No deployments</div>}</div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Runtimes</h2><p>Runtime inventory and health</p></div><Badge tone={runtimes.data?.length ? "good" : "muted"}>{runtimes.data?.length ?? 0}</Badge></div>
        <div className="panel-body">{runtimes.data?.length ? runtimes.data.map(item => <div className="catalog-row" key={item.runtimeId}><div className="catalog-row-main"><b>{item.runtimeId}</b><small>{item.target} · {item.status} · {item.health}</small></div><Badge tone={item.health === "healthy" ? "good" : "warn"}>{item.reconciliationState}</Badge></div>) : <div className="state-line empty">No runtimes</div>}</div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Execution runs</h2><p>ExecutionRun history</p></div><Badge tone={runs.data?.length ? "good" : "muted"}>{runs.data?.length ?? 0}</Badge></div>
        <div className="panel-body">{runs.data?.length ? runs.data.slice(0, 8).map(item => <div className="catalog-row" key={item.runId}><div className="catalog-row-main"><b>{item.runId}</b><small>{item.runtimeId} · {item.status} · {item.resultSummary ?? item.failureReason ?? "n/a"}</small></div><span className="catalog-count">{new Date(item.startedAt).toLocaleTimeString()}</span></div>) : <div className="state-line empty">No execution runs</div>}</div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Workers</h2><p>Capacity and workload visibility</p></div><Badge tone={workers.data?.length ? "good" : "muted"}>{workers.data?.length ?? 0}</Badge></div>
        <div className="panel-body">{workers.data?.length ? workers.data.map(item => <div className="catalog-row" key={item.workerId}><div className="catalog-row-main"><b>{item.workerId}</b><small>{item.status} · {item.health} · capacity {item.availableCapacity}/{item.capacity}</small></div><Badge tone={item.health === "healthy" ? "good" : item.health === "degraded" ? "warn" : "muted"}>{item.reconciliationState}</Badge></div>) : <div className="state-line empty">No workers</div>}</div>
      </section>
    </div>
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
  const composition = detail.composition;

  return <>
    <Link className="back" to="/agents">← Agents</Link>
    {loadError && <div className="error-banner" role="alert">{loadError}</div>}
    {stale && <div className="stale-banner" role="status">Showing a stale agent snapshot. Refresh to recover live state.</div>}
    {loadState === "refreshing" && <div className="refresh-banner" role="status">Refreshing agent state...</div>}
    <header className="detail-head">
      <div className="detail-id">
        <span className={`avatar large ${lifecycle.archived ? "gray" : ""}`}>{definition.name.slice(0, 2).toUpperCase()}</span>
        <div>
          <div className="title-status"><h1>{definition.name}</h1><Status status={definition.status} /></div>
          <p className="mono">{detail.agentId} · sandbox · current revision r{detail.currentRevision.revision}</p>
        </div>
      </div>
      <div className="actions">
        <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
        <Link className="primary action-link" to={`/agents/${detail.agentId}/edit`}>Edit</Link>
      </div>
    </header>
    <AgentGuardrailBanner guardrails={detail.guardrails} />
    <div className="detail-grid">
      <section className="panel">
        <div className="panel-head"><div><h2>AgentDefinition</h2><p>Identity and governed references</p></div></div>
        <dl className="config-list">
          <div><dt>Agent ID</dt><dd className="mono">{definition.agentId}</dd></div>
          <div><dt>Name</dt><dd>{definition.name}</dd></div>
          <div><dt>Status</dt><dd><Status status={definition.status} /></dd></div>
          <div><dt>Role</dt><dd>{definition.roleId ? `${definition.roleId}${definition.roleRevision ? ` (r${definition.roleRevision})` : ""}` : "unassigned"}</dd></div>
          <div><dt>Profile</dt><dd>{definition.profileId ? `${definition.profileId}${definition.profileRevision ? ` (r${definition.profileRevision})` : ""}` : "unassigned"}</dd></div>
          <div><dt>Execution policy</dt><dd>{definition.executionPolicyId ?? "none"}</dd></div>
        </dl>
        <div className="panel-body">
          <IdList label="Capabilities" ids={definition.capabilityIds} />
          <IdList label="Skills" ids={definition.skillIds} />
          <IdList label="Tools" ids={definition.toolIds} />
          <IdList label="Credential connections" ids={definition.credentialConnectionIds} />
          <IdList label="Runner preferences" ids={definition.runnerPreferences} />
          {definition.modelStrategy && <div className="model-strategy"><b>Model strategy</b><code className="mono">{definition.modelStrategy.primary.providerId}/{definition.modelStrategy.primary.modelId}</code><small>fallbacks: {definition.modelStrategy.fallbacks.length}</small></div>}
        </div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Current revision</h2><p>Adopted AgentRevision</p></div><span className="tag">r{detail.currentRevision.revision}</span></div>
        <dl className="config-list">
          <div><dt>Revision</dt><dd className="mono">r{detail.currentRevision.revision}</dd></div>
          <div><dt>Fingerprint</dt><dd className="mono hash">{detail.currentRevision.fingerprint}</dd></div>
          <div><dt>Created</dt><dd><Time value={detail.currentRevision.createdAt} /></dd></div>
          <div><dt>Updated</dt><dd><Time value={detail.currentRevision.updatedAt} /></dd></div>
          <div><dt>Created by</dt><dd>{detail.currentRevision.createdBy ?? "unknown"}</dd></div>
        </dl>
      </section>
      <section className="panel wide">
        <div className="panel-head"><div><h2>Composition summary</h2><p>Effective AgentComposition from the Product API</p></div>{composition && <Badge tone={composition.ready ? "good" : "warn"}>{composition.ready ? "ready" : "not ready"}</Badge>}</div>
        {composition
          ? <>
            <p className="panel-note"><Link className="surface-link" to={`/agents/${detail.agentId}/composition`}>Open composition surface →</Link></p>
            <dl className="config-list">
              <div><dt>Fingerprint</dt><dd className="mono hash">{composition.fingerprint}</dd></div>
              <div><dt>Materialization</dt><dd>{composition.materialization ? `${composition.materialization.artifactType} · ${composition.materialization.artifactFingerprint}` : "none"}</dd></div>
            </dl>
            <div className="composition-refs">
              <div><b>Requested</b><span>role: {composition.requested.roleId ?? "—"}</span><span>profile: {composition.requested.profileId ?? "—"}</span><span>capabilities: {composition.requested.capabilityIds.length}</span><span>skills: {composition.requested.skillIds.length}</span><span>tools: {composition.requested.toolIds.length}</span></div>
              <div><b>Effective</b><span>role: {composition.effective.roleId ?? "—"}{composition.effective.roleRevision ? ` (r${composition.effective.roleRevision})` : ""}</span><span>profile: {composition.effective.profileId ?? "—"}{composition.effective.profileRevision ? ` (r${composition.effective.profileRevision})` : ""}</span><span>capabilities: {composition.effective.capabilityIds.length}</span><span>skills: {composition.effective.skillIds.length}</span><span>tools: {composition.effective.toolIds.length}</span></div>
            </div>
            {composition.findings.length > 0 && <div className="finding-list">{composition.findings.map(finding => <div className={`finding-row ${finding.severity}`} key={`${finding.code}-${finding.message}`}><span>{finding.severity}</span><p>{finding.message}</p></div>)}</div>}
          </>
          : <div className="state-line empty">{detail.compositionUnavailableReason ?? "Composition unavailable."}</div>}
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Readiness summary</h2><p>From the Product API — never recomputed in the UI</p></div><ReadinessBadge summary={detail.readinessSummary} /></div>
        <dl className="config-list">
          <div><dt>State</dt><dd>{detail.readinessSummary.state}</dd></div>
          <div><dt>Blockers</dt><dd>{detail.readinessSummary.blockerCount}</dd></div>
          <div><dt>Warnings</dt><dd>{detail.readinessSummary.warningCount}</dd></div>
        </dl>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Deployment summary</h2><p>Sandbox deployment records</p></div><Badge tone={detail.deploymentSummary.state === "deployed" ? "good" : detail.deploymentSummary.state === "none" ? "muted" : "warn"}>{detail.deploymentSummary.state}</Badge></div>
        <dl className="config-list">
          <div><dt>State</dt><dd>{detail.deploymentSummary.state}</dd></div>
          <div><dt>Records</dt><dd>{detail.deploymentSummary.count}</dd></div>
        </dl>
        <p className="panel-note">Display only — deployment operations belong to Operational Execution and are out of scope for this milestone.</p>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Runtime summary</h2><p>Runtime instance states</p></div><Badge tone={detail.runtimeSummary.state === "running" ? "good" : detail.runtimeSummary.state === "none" ? "muted" : "warn"}>{detail.runtimeSummary.state}</Badge></div>
        <dl className="config-list">
          <div><dt>State</dt><dd>{detail.runtimeSummary.state}</dd></div>
          <div><dt>Instances</dt><dd>{detail.runtimeSummary.count}</dd></div>
        </dl>
        <p className="panel-note">Display only — runtime operations are out of scope for this milestone.</p>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Economic summary</h2><p>Read-only when available</p></div><Badge tone="muted">{detail.economicSummary.state}</Badge></div>
        <div className="state-line empty">{detail.economicSummary.message} Economics is out of scope for Milestone B.</div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Audit summary</h2><p>Lifecycle-related audit events</p></div><Badge tone="muted">{detail.auditSummary.total} events</Badge></div>
        <dl className="config-list">
          <div><dt>Success</dt><dd>{detail.auditSummary.success}</dd></div>
          <div><dt>Failure</dt><dd>{detail.auditSummary.failure}</dd></div>
          <div><dt>Pending</dt><dd>{detail.auditSummary.pending}</dd></div>
        </dl>
        {detail.auditSummary.recent.length > 0 && <div className="audit-list">{detail.auditSummary.recent.map(event => <div className="audit-row" key={event.eventId}><div><b>{event.eventType}</b><small className="mono">{event.eventId}</small></div><span>{event.result ?? "—"}</span><small><Time value={event.timestamp} /></small></div>)}</div>}
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Lifecycle state</h2><p>Agent lifecycle status</p></div><Status status={lifecycle.status} /></div>
        <dl className="config-list">
          <div><dt>Current revision</dt><dd className="mono">r{lifecycle.currentRevision}</dd></div>
          <div><dt>Archived</dt><dd>{lifecycle.archived ? "Yes" : "No"}</dd></div>
          <div><dt>Protected</dt><dd>{lifecycle.protected ? "Yes — protected agents cannot be deleted" : "No"}</dd></div>
          {lifecycle.archivedAt !== undefined && <div><dt>Archived at</dt><dd><Time value={lifecycle.archivedAt} /></dd></div>}
          {lifecycle.restoredAt !== undefined && <div><dt>Restored at</dt><dd><Time value={lifecycle.restoredAt} /></dd></div>}
        </dl>
      </section>
      <section className="panel wide" id="revisions">
        <div className="panel-head"><div><h2>Revision history</h2><p>AgentRevision lifecycle records</p></div></div>
        {data.revisions.length === 0
          ? <div className="state-line empty">No revision history available.</div>
          : <div className="revision-list">
            {data.revisions.map(revision => (
              <div className={`revision-row ${revision.status === "current" ? "current" : ""}`} key={revision.revisionId}>
                <div className="revision-main">
                  <div className="revision-top"><b className="mono">r{revision.revisionNumber}</b><Badge tone={revision.status === "current" ? "good" : "muted"}>{revision.status}</Badge>{revision.restoredFrom !== undefined && <span className="tag">restored from r{revision.restoredFrom}</span>}</div>
                  <small>Created <Time value={revision.createdAt} />{revision.adoptedAt ? ` · Adopted ${new Date(revision.adoptedAt).toLocaleString()}` : ""}</small>
                  {revision.changeSummary && <small>{revision.changeSummary}</small>}
                  {revision.compositionHash && <code className="mono hash">{revision.compositionHash}</code>}
                </div>
                <div className="revision-actions">
                  {revision.availableActions.map(action => (
                    <button key={action.action} className="secondary" disabled={!action.available || submitting !== null} onClick={() => void handleRevisionAction(action.action, revision)} title={action.reason}>{action.action === "adopt" ? "Adopt" : "Restore"}</button>
                  ))}
                  {revision.availableActions[0]?.reason && <small className="action-reason">{revision.availableActions[0].reason}</small>}
                </div>
              </div>
            ))}
          </div>}
      </section>
      <section className="panel wide">
        <div className="panel-head"><div><h2>Lifecycle actions</h2><p>Governed by the Product API — unsupported actions are never simulated</p></div></div>
        <div className="action-grid">
          {detail.availableActions.map(action => {
            const destructive = action.action === "archive" || action.action === "delete";
            return <div className={`action-tile ${action.available ? "" : "disabled"} ${destructive ? "destructive" : ""}`} key={action.action}>
              <b>{action.label}</b>
              {action.reason && <small className="action-reason">{action.reason}</small>}
              {action.available
                ? <button className={`secondary ${destructive ? "danger" : ""}`} disabled={submitting !== null} onClick={() => handleActionClick(action)}>{destructive ? `Confirm ${action.action}` : action.action === "adoptRevision" || action.action === "restoreRevision" ? "Open revision panel" : action.action === "update" ? "Edit agent" : action.action === "createRevision" ? "Create revision" : action.action === "duplicate" ? "Duplicate" : action.action === "restore" ? "Restore agent" : "Run"}</button>
                : <span className="unavailable">Unavailable</span>}
            </div>;
          })}
        </div>
        {duplicateOpen && detail && (
          <div className="duplicate-form">
            <b>Duplicate {detail.agentId}</b>
            <div className="form">
              <label>New agent ID<input className="mono" value={duplicateAgentId} onChange={e => setDuplicateAgentId(e.target.value)} placeholder="e.g. mazikeen-copy" /></label>
              <label>Name (optional)<input value={duplicateName} onChange={e => setDuplicateName(e.target.value)} placeholder={definition.name} /></label>
            </div>
            {duplicateError && <div className="error-banner" role="alert">{duplicateError}</div>}
            <div className="confirm-actions">
              <button className="secondary" onClick={() => { setDuplicateOpen(false); setDuplicateError(null); }}>Cancel</button>
              <button className="primary" disabled={submitting !== null || !duplicateAgentId.trim()} onClick={() => void handleDuplicate()}>Duplicate</button>
            </div>
          </div>
        )}
        {operationResult && <OperationResultBox result={operationResult} />}
        {operationError && <div className="error-banner" role="alert">{operationError}</div>}
      </section>
    </div>
    {confirming && (
      <div className="modal-wrap">
        <div className="wizard confirm-dialog" role="dialog" aria-modal="true">
          <div className="wizard-head"><h1>Confirm {confirming.label}</h1><button onClick={() => setConfirming(null)}>×</button></div>
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

type AgentFormMode = "create" | "edit" | "revision";

function parseList(value: string): string[] {
  return value.split(",").map(item => item.trim()).filter(Boolean);
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
  const [runnerPreferences, setRunnerPreferences] = useState("");
  const [loadingDetail, setLoadingDetail] = useState(mode !== "create");
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AgentDetail | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const prefilled = useRef(false);

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
      ...(roleId.trim() ? { roleId: roleId.trim() } : {}),
      ...(profileId.trim() ? { profileId: profileId.trim() } : {}),
    };
  }

  async function handleSubmit() {
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setSubmitting(true);
    setFormError(null);
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
      setFormError(apiErrorMessage(error));
      setSubmitting(false);
    }
  }

  if (loadingDetail) return <div className="loading-screen">Loading agent definition...</div>;
  if (detailError) return <>
    <Link className="back" to={agentId ? `/agents/${agentId}` : "/agents"}>← Back</Link>
    <section className="panel"><div className="empty-state">{detailError}</div></section>
  </>;

  const backTarget = agentId ? `/agents/${agentId}` : "/agents";
  const title = mode === "create" ? "Create Agent" : mode === "revision" ? "Create Revision" : "Edit Agent";
  const expectedRevision = detail?.currentRevision.revision ?? 1;

  return <>
    <Link className="back" to={backTarget}>← Back</Link>
    <header className="page-head compact">
      <div><p className="eyebrow">AGENT LIFECYCLE</p><h1>{title}</h1><p>{mode === "revision" ? "Create a new AgentRevision from the current definition." : "Identity and composition references, validated by the Product API on submit."}</p></div>
    </header>
    <div className="guardrail-banner" role="note"><span>Inspection / control-plane mode</span><span>Sandbox only</span><span>Production ready = false</span><span>Mutations governed by Product API</span></div>
    {mode === "revision" && <div className="info-banner">A new revision is created from this definition. The Product API validates references and governance; readiness is not recomputed in the UI.</div>}
    <section className="panel form-panel">
      <div className="panel-head"><div><h2>{mode === "create" ? "Definition" : "Definition update"}</h2><p>Client-side validation is minimal — the Product API performs the real validation</p></div></div>
      <div className="form">
        <label>Agent ID{mode !== "create" && <small>Read-only — definition.agentId must match the agent</small>}<input className="mono" value={agentIdValue} readOnly={mode !== "create"} onChange={e => setAgentIdValue(e.target.value)} placeholder="e.g. mazikeen" /></label>
        <label>Name<input value={name} onChange={e => setName(e.target.value)} placeholder="Agent display name" /></label>
        <label>Status<select value={status} onChange={e => setStatus(e.target.value as GovernedAgentStatus)}><option value="draft">draft</option><option value="active">active</option><option value="disabled">disabled</option></select></label>
        <label>Role ID<input className="mono" value={roleId} onChange={e => setRoleId(e.target.value)} placeholder="optional role reference" /></label>
        <label>Profile ID<input className="mono" value={profileId} onChange={e => setProfileId(e.target.value)} placeholder="optional profile reference" /></label>
        <label>Capability IDs<input className="mono" value={capabilityIds} onChange={e => setCapabilityIds(e.target.value)} placeholder="comma-separated ids" /></label>
        <label>Skill IDs<input className="mono" value={skillIds} onChange={e => setSkillIds(e.target.value)} placeholder="comma-separated ids" /></label>
        <label>Tool IDs<input className="mono" value={toolIds} onChange={e => setToolIds(e.target.value)} placeholder="comma-separated ids" /></label>
        <label>Credential connections<input className="mono" value={credentialConnectionIds} onChange={e => setCredentialConnectionIds(e.target.value)} placeholder="comma-separated ids" /></label>
        <label>Runner preferences<input className="mono" value={runnerPreferences} onChange={e => setRunnerPreferences(e.target.value)} placeholder="comma-separated ids" /></label>
        {mode !== "create" && <div className="form-note">Saving applies to revision <b className="mono">r{expectedRevision}</b> (expectedRevision guard).</div>}
      </div>
      {formError && <div className="error-banner" role="alert">{formError}</div>}
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
    <header className="page-head compact dashboard-head">
      <div><p className="eyebrow">COMPOSITION SURFACE</p><h1>Composition</h1><p>Operational summary of the elements that form an Agent, sourced from the Product API.</p></div>
      <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadError ? "Retry" : loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
    </header>
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
      <div><p className="eyebrow">MODELS, ENGINES & PROVIDERS</p><h1>Engines, Providers & Models</h1><p>Composition registries from the Product API. Credential requirements are shown; credential management stays out of scope.</p></div>
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
  return <>
    <header className="page-head compact"><div><p className="eyebrow">OPENCLAW</p><h1>Runtime</h1><p>Process health, compatibility and deployed agents.</p></div></header>
    <section className="runtime-hero panel"><div className="runtime-big"><div className="core">ACS<small>CORE</small></div><div><p className="eyebrow">OPENCLAW RUNTIME</p><h2>Connectivity Status</h2><p>Verify API connectivity in the Dashboard.</p></div></div></section>
    <section className="runtime-stats"><Metric label="Uptime" value="--" note="Connected" /><Metric label="Agents" value="--" note="Check list" /><Metric label="Heartbeats" value="--" note="Check logs" /></section>
    <section className="panel"><div className="panel-head"><div><h2>Running agents</h2><p>Live processes managed by OpenClaw</p></div></div><div className="empty-state">No live agent data available.</div></section>
  </>;
}

function Logs() {
  return <>
    <header className="page-head compact"><div><p className="eyebrow">OBSERVABILITY</p><h1>Logs</h1><p>Live events from ACS Core, agents and plugins.</p></div></header>
    <div className="log-viewer"><div className="empty-state">Connected to Product API. Waiting for events...</div></div>
  </>;
}

function Settings() {
  return <>
    <header className="page-head compact"><div><p className="eyebrow">WORKSPACE</p><h1>Settings</h1><p>Configure ACS, OpenClaw and local registries.</p></div></header>
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
      }
    };
    addEventListener("keydown", fn);
    return () => removeEventListener("keydown", fn);
  }, []);

  useEffect(() => {
    void checkProductApi();
  }, []);

  const go = (v: View) => {
    navigate(viewPaths[v]);
    setMobile(false);
  };
  const view = viewOfPath(location.pathname);
  const agentDetail = location.pathname.startsWith("/agents/") && location.pathname !== "/agents" && !location.pathname.includes("/composition");
  const compositionRoute = location.pathname.includes("/composition");
  const title = location.pathname === "/agents/new"
    ? "Create Agent"
    : location.pathname.includes("/edit")
      ? "Edit Agent"
      : compositionRoute
        ? "Agent Composition"
      : agentDetail
        ? "Agent Detail"
        : (view ?? "ACS");

  return (
    <div className={dark ? "app dark" : "app light"}>
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <div className="brand"><img src="/assets/Axodus_logo.svg" /><div><b>ACS</b><small>CONTROL PLANE</small></div><button className="mobile-close" onClick={() => setMobile(false)}>×</button></div>
        <div className="workspace-switch"><span className="workspace-icon">⌘</span><div><b>{productApiConfig.environment} environment</b><small>{productApiConfig.baseUrl}</small></div><span>⌄</span></div>
        <nav>{navGroups.map((g, i) => <div className="nav-group" key={i}>{g.map(v => <button className={!agentDetail && view === v ? "active" : ""} onClick={() => go(v)} key={v}><span>{icons[v]}</span>{v}{v === "Skills" && <i className="count">2</i>}</button>)}</div>)}</nav>
        <div className="connection"><div><span className="openclaw-mark">A</span><div><b>Product API</b><small><i /> {connectivity.status === "ready" ? "Connected" : connectivity.status === "loading" ? "Checking" : "Unavailable"}</small></div></div><span className="mono">/api/v1</span></div>
      </aside>
      <main className="main">
        <header className="topbar">
          <button className="menu" onClick={() => setMobile(true)}>☰</button>
          <div className="crumb"><span>ACS</span><i>/</i><b>{title}</b></div>
          <div className="top-actions"><Status status={connectivity.status === "ready" ? "Product API connected" : connectivity.status === "loading" ? "Checking Product API" : "Product API unavailable"} /><button className="command" onClick={() => setPalette(true)}>⌕ <span>Search ACS...</span><kbd>⌘ K</kbd></button><button className="icon-btn" onClick={() => setDark(!dark)}>{dark ? "☼" : "◐"}</button><button className="icon-btn notification">♢<i /></button></div>
        </header>
        {connectivity.status === "loading" && <div className="global-state loading-state" role="status">Connecting to Product API boundary...</div>}
        {connectivity.status === "error" && <div className="global-state error-state" role="alert"><span>Product API unavailable: {connectivity.error}</span><button className="secondary" onClick={() => void checkProductApi()}>Retry</button></div>}
        <div className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/operational-execution" element={<OperationalExecution />} />
            <Route path="/readiness" element={<Readiness />} />
            <Route path="/agents" element={<AgentInventory />} />
            <Route path="/agents/new" element={<AgentCreate />} />
            <Route path="/agents/:agentId/edit" element={<AgentEdit />} />
            <Route path="/agents/:agentId" element={<AgentDetail />} />
            <Route path="/agents/:agentId/composition" element={<AgentCompositionView />} />
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
