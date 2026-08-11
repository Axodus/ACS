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
  type DashboardFinding,
  type DashboardSummary,
  type GlobalReadinessSummary,
  type GovernedAgentStatus,
  type ProductApiHealth,
  type ProductApiOperationalGuardrails,
  type ReadinessFinding,
} from "./api/product-api";
import "./operational.css";

type View =
  | "Dashboard"
  | "Readiness"
  | "Agents"
  | "Roles"
  | "Profiles"
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
  ["Dashboard", "Readiness"],
  ["Agents", "Roles", "Profiles"],
  ["Skills", "Tools & Plugins"],
  ["Memory"],
  ["Runtime", "Logs"],
  ["Settings"],
];

const icons: Record<View, string> = {
  Dashboard: "⌂",
  Readiness: "✓",
  Agents: "◫",
  Roles: "◇",
  Profiles: "▤",
  Skills: "✦",
  "Tools & Plugins": "⌘",
  Memory: "◎",
  Runtime: "◉",
  Logs: "≡",
  Settings: "⚙",
};

const viewPaths: Record<View, string> = {
  Dashboard: "/",
  Readiness: "/readiness",
  Agents: "/agents",
  Roles: "/roles",
  Profiles: "/profiles",
  Skills: "/skills",
  "Tools & Plugins": "/plugins",
  Memory: "/memory",
  Runtime: "/runtime",
  Logs: "/logs",
  Settings: "/settings",
};

const viewOfPath = (path: string): View | null =>
  (Object.entries(viewPaths) as [View, string][]).find(([, p]) => p === path)?.[0] ?? null;

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
          <SummaryRow label="Disabled" value={summary?.agents.disabled ?? 0} tone="warn" />
          <SummaryRow label="Archived" value={summary?.agents.archived ?? 0} tone="muted" />
        </div>
      </DashboardCard>
      <DashboardCard title="Deployment summary" meta="Sandbox deployment records" state={cardState(summary?.deployments.total)} emptyMessage="No deployments recorded">
        <div className="summary-list">
          <SummaryRow label="Total" value={summary?.deployments.total ?? 0} />
          <SummaryRow label="Deployed" value={summary?.deployments.deployed ?? 0} tone="good" />
          <SummaryRow label="Failed" value={summary?.deployments.failed ?? 0} tone="warn" />
          <SummaryRow label="Rejected" value={summary?.deployments.rejected ?? 0} tone="warn" />
        </div>
      </DashboardCard>
      <DashboardCard title="Runtime summary" meta="Runtime instance states" state={cardState(summary?.runtimes.total)} emptyMessage="No runtime instances">
        <div className="summary-list">
          <SummaryRow label="Total" value={summary?.runtimes.total ?? 0} />
          <SummaryRow label="Running" value={summary?.runtimes.running ?? 0} tone="good" />
          <SummaryRow label="Pending" value={summary?.runtimes.pending ?? 0} />
          <SummaryRow label="Stopped" value={summary?.runtimes.stopped ?? 0} tone="muted" />
          <SummaryRow label="Failed" value={summary?.runtimes.failed ?? 0} tone="warn" />
        </div>
      </DashboardCard>
      <DashboardCard title="Worker summary" meta="Execution worker registry" state={cardState(summary?.workers.total)} emptyMessage="No workers registered">
        <div className="summary-list">
          <SummaryRow label="Total" value={summary?.workers.total ?? 0} />
          <SummaryRow label="Available" value={summary?.workers.available ?? 0} tone="good" />
          <SummaryRow label="Slots" value={summary?.workers.availableSlots ?? 0} />
          <SummaryRow label="Assignments" value={summary?.workers.activeAssignments ?? 0} />
          <SummaryRow label="Unavailable" value={summary?.workers.unavailable ?? 0} tone="warn" />
        </div>
      </DashboardCard>
      <DashboardCard title="ExecutionRun summary" meta="Execution run records" state={cardState(summary?.executionRuns.total)} emptyMessage="No execution runs">
        <div className="summary-list">
          <SummaryRow label="Total" value={summary?.executionRuns.total ?? 0} />
          <SummaryRow label="Running" value={summary?.executionRuns.running ?? 0} tone="good" />
          <SummaryRow label="Completed" value={summary?.executionRuns.completed ?? 0} tone="good" />
          <SummaryRow label="Pending" value={summary?.executionRuns.pending ?? 0} />
          <SummaryRow label="Failed" value={summary?.executionRuns.failed ?? 0} tone="warn" />
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
  const agentDetail = location.pathname.startsWith("/agents/") && location.pathname !== "/agents";
  const title = location.pathname === "/agents/new"
    ? "Create Agent"
    : location.pathname.includes("/edit")
      ? "Edit Agent"
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
            <Route path="/readiness" element={<Readiness />} />
            <Route path="/agents" element={<AgentInventory />} />
            <Route path="/agents/new" element={<AgentCreate />} />
            <Route path="/agents/:agentId/edit" element={<AgentEdit />} />
            <Route path="/agents/:agentId" element={<AgentDetail />} />
            <Route path="/roles" element={<GenericView view="Roles" />} />
            <Route path="/profiles" element={<GenericView view="Profiles" />} />
            <Route path="/skills" element={<GenericView view="Skills" />} />
            <Route path="/plugins" element={<GenericView view="Tools & Plugins" />} />
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
