import { useEffect, useState, type ReactNode } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { productApi, productApiConfig, type ApiAgent, type DashboardFinding, type DashboardSummary, type ProductApiHealth } from "./api/product-api";
import "./operational.css";

type View =
  | "Dashboard"
  | "Agents"
  | "Roles"
  | "Profiles"
  | "Skills"
  | "Tools & Plugins"
  | "Memory"
  | "Runtime"
  | "Logs"
  | "Settings";

type Agent = ApiAgent;

type ConnectivityState =
  | { status: "loading"; health: null; error: null }
  | { status: "ready"; health: ProductApiHealth; error: null }
  | { status: "error"; health: null; error: string };

const navGroups: View[][] = [
  ["Dashboard"],
  ["Agents", "Roles", "Profiles"],
  ["Skills", "Tools & Plugins"],
  ["Memory"],
  ["Runtime", "Logs"],
  ["Settings"],
];

const icons: Record<View, string> = {
  Dashboard: "⌂",
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

function Status({ status }: { status: string }) {
  const tone = /running|healthy|connected|installed|active/i.test(status) ? "good" : /warning|updating/i.test(status) ? "warn" : "muted";
  return <span className={`status ${tone}`}><i />{status}</span>;
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return <article className="metric"><div className="metric-top"><span>{label}</span><span className="metric-mark">↗</span></div><strong>{value}</strong><small>{note}</small></article>;
}

type DashboardLoadState = "loading" | "ready" | "error";
type DashboardCardState = DashboardLoadState | "empty";

function DashboardCard({ title, meta, state, emptyMessage, children }: {
  title: string;
  meta: string;
  state: DashboardCardState;
  emptyMessage?: string;
  children?: ReactNode;
}) {
  const label = state === "loading" ? "..." : state === "error" ? "error" : state === "empty" ? "empty" : "ready";
  return <section className={`panel dashboard-card state-${state}`}>
    <div className="panel-head"><div><h2>{title}</h2><p>{meta}</p></div><span className="card-state">{label}</span></div>
    <div className="card-body">
      {state === "loading" && <div className="state-line">Loading operational state...</div>}
      {state === "error" && <div className="state-line error">Unable to load this card. Check Product API connectivity and retry.</div>}
      {state === "empty" && <div className="state-line empty">{emptyMessage ?? "No data available"}</div>}
      {state === "ready" && children}
    </div>
  </section>;
}

function SummaryRow({ label, value, tone }: { label: string; value: string | number; tone?: "good" | "warn" | "muted" }) {
  return <div className="summary-row"><span>{label}</span><strong className={tone ?? ""}>{value}</strong></div>;
}

function FindingRow({ finding }: { finding: DashboardFinding }) {
  return <div className={`finding-row ${finding.severity}`}><span>{finding.severity}</span><p>{finding.message}</p></div>;
}

function Dashboard() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loadState, setLoadState] = useState<DashboardLoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadState("loading");
    setLoadError(null);
    productApi.getDashboardSummary()
      .then(data => {
        if (!cancelled) {
          setSummary(data);
          setLoadState("ready");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError("Unable to load dashboard summary from Product API");
          setLoadState("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const cardState = (count: number | undefined): DashboardCardState => {
    if (loadState === "loading") return "loading";
    if (loadState === "error") return "error";
    return count !== undefined && count > 0 ? "ready" : "empty";
  };

  const updatedAt = summary ? new Date(summary.system.generatedAt).toLocaleTimeString() : "--";

  return <>
    <header className="page-head compact dashboard-head">
      <div><p className="eyebrow">OPERATIONAL AWARENESS</p><h1>System Dashboard</h1><p>Aggregated ACS state from the Product API. Read-only surface.</p></div>
      <button className="secondary" disabled={loadState === "loading"} onClick={() => setRefreshKey(k => k + 1)}>{loadState === "error" ? "Retry" : "Refresh"}</button>
    </header>
    {loadError && <div className="error-banner">{loadError}</div>}
    <div className="dashboard-grid">
      <DashboardCard title="System overview" meta="Product API boundary" state={loadState}>
        <div className="summary-list">
          <SummaryRow label="Service" value={summary?.system.service ?? "--"} />
          <SummaryRow label="Status" value="Connected" tone="good" />
          <SummaryRow label="Mode" value={summary?.system.mode ?? "--"} />
          <SummaryRow label="Automation" value={summary?.system.automation ?? "--"} />
          <SummaryRow label="Access" value="read-only" />
          <SummaryRow label="Generated" value={updatedAt} />
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

function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    productApi.listAgents()
      .then(res => {
        setAgents(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = agents.filter(a => ((a.name ?? "") + a.agentId + (a.definition.roleId ?? "")).toLowerCase().includes(q.toLowerCase()));

  if (loading) return <div className="loading-screen">Loading agents...</div>;

  return <>
    <header className="page-head compact"><div><p className="eyebrow">INFRASTRUCTURE</p><h1>Agents</h1><p>Configure, validate, deploy and observe your agent fleet.</p></div><button className="primary">＋ Create agent</button></header>
    <div className="toolbar"><label className="search">⌕<input value={q} onChange={e => setQ(e.target.value)} placeholder="Search agents..." /></label><button className="filter">Status⌄</button><button className="filter">Role⌄</button></div>
    <section className="agent-cards">
      {filtered.length === 0 ? <div className="empty-state">No agents found</div> : filtered.map(a => (
        <article className="agent-card" key={a.agentId}>
          <div className="card-title"><span className={`avatar ${a.status !== "running" ? "gray" : ""}`}>{a.name ? a.name.slice(0, 2).toUpperCase() : "??"}</span><div><h2>{a.name ?? "Unknown"}</h2><p className="mono">{a.agentId}</p></div><Status status={a.status} /></div>
          <div className="card-specs"><span>Role<b>{a.definition.roleId ?? "unassigned"}</b></span><span>Profile<b>{a.definition.profileId ?? "unassigned"}</b></span><span>Revision<b>{a.revision}</b></span></div>
          <div className="cap-row"><span>✦ {a.revision} skills</span><span>⌘ {a.revision} plugins</span><span>◎ Memory enabled</span></div>
          <div className="card-actions"><button className="secondary" onClick={() => navigate(`/agents/${a.agentId}`)}>Open agent</button><button className="icon-btn">•••</button></div>
        </article>
      ))}
    </section>
  </>;
}

function AgentDetail({ back }: { back: () => void }) {
  const { agentId } = useParams();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Overview");
  const [deploying, setDeploying] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);

  const tabs = ["Overview", "Profile", "Skills", "Plugins", "Memory", "Runtime", "Logs"];

  useEffect(() => {
    if (agentId) {
      productApi.getAgent(agentId)
        .then(res => {
          setAgent(res);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [agentId]);

  async function handleDeploy() {
    if (!agent) return;
    setDeploying(true);
    setDeployError(null);
    try {
      await productApi.deployAgent(agent.agentId, {
        revision: agent.revision,
        composition: {},
        targetId: "local-wsl",
      });
      alert("Deployment successful!");
    } catch (error: unknown) {
      setDeployError(error instanceof Error ? error.message : "Deployment failed");
    } finally {
      setDeploying(false);
    }
  }

  if (loading) return <div className="loading-screen">Loading agent...</div>;
  if (!agent) return <div className="empty-state">Agent not found</div>;

  return <>
    <button className="back" onClick={back}>← Agents</button>
    <header className="detail-head"><div className="detail-id"><span className="avatar large">{agent.name ? agent.name.slice(0, 2).toUpperCase() : "??"}</span><div><div className="title-status"><h1>{agent.name ?? "Unknown"}</h1><Status status={agent.status} /></div><p className="mono">{agent.agentId} · {agent.definition.roleId ?? "unassigned"}</p></div></div><div className="actions"><button className="secondary">■ Stop</button><button className="secondary">▷ Test</button><button className="primary" disabled={deploying} onClick={handleDeploy}>{deploying ? "Deploying..." : "↑ Deploy"}</button><button className="icon-btn">•••</button></div></header>
    <div className="tabs">{tabs.map(t => <button className={tab === t ? "active" : ""} onClick={() => setTab(t)} key={t}>{t}</button>)}</div>
    {deployError && <div className="error-banner">{deployError}</div>}
    {tab === "Profile" ? <ProfileEditor /> : <div className="detail-grid">
      <section className="panel"><div className="panel-head"><div><h2>{tab === "Overview" ? "Configuration" : tab}</h2><p>{tab === "Overview" ? "Current agent specification" : `Attached ${tab.toLowerCase()} and configuration`}</p></div><button className="text-btn">Edit →</button></div><dl className="config-list"><div><dt>Agent ID</dt><dd className="mono">{agent.agentId}</dd></div><div><dt>Role</dt><dd>{agent.definition.roleId ?? "unassigned"}</dd></div><div><dt>Profile</dt><dd>{agent.definition.profileId ?? "unassigned"}</dd></div><div><dt>Revision</dt><dd>{agent.revision} <span className="tag">Current</span></dd></div></dl></section>
      <section className="panel"><div className="panel-head"><div><h2>Runtime</h2><p>Live OpenClaw process</p></div><Status status={agent.status} /></div><dl className="config-list"><div><dt>Status</dt><dd>{agent.status}</dd></div><div><dt>Compatibility</dt><dd>OpenClaw <span className="check">✓</span></dd></div><div><dt>Process ID</dt><dd className="mono">--</dd></div><div><dt>Heartbeat</dt><dd>Every 30 seconds</dd></div></dl></section>
      <section className="panel wide"><div className="panel-head"><div><h2>Capabilities</h2><p>Attached resources</p></div></div><div className="capabilities"><div><span>✦</span><b>{agent.revision}</b><small>Skills</small></div><div><span>⌘</span><b>{agent.revision}</b><small>Plugins</small></div><div><span>◎</span><b>On</b><small>Memory</small></div><div><span>◉</span><b>30s</b><small>Heartbeat</small></div></div></section>
    </div>}
  </>;
}

function ProfileEditor() {
  return <section className="editor-shell"><div className="editor"><div className="editor-bar"><span className="mono">Profile Editor</span></div><pre>Profile content is currently read-only in this integration slice.</pre><div className="editor-actions"><button className="primary">Save revision</button></div></div></section>;
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

function AgentRoute() {
  const navigate = useNavigate();
  return <AgentDetail back={() => navigate("/agents")} />;
}

export default function App() {
  const [wizard, setWizard] = useState(false);
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
        setWizard(false);
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
  const title = agentDetail ? "Agent Detail" : (view ?? "ACS");

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
            <Route path="/agents" element={<Agents />} />
            <Route path="/agents/:agentId" element={<AgentRoute />} />
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
      {wizard && <div className="modal-wrap"><div className="wizard"><div className="wizard-head"><h1>Create Agent</h1><button onClick={() => setWizard(false)}>×</button></div><div className="wizard-body"><p>Agent creation is handled via ACS CLI or governed Product API requests.</p></div></div></div>}
      {palette && <div className="palette-wrap" onClick={() => setPalette(false)}><div className="palette" onClick={e => e.stopPropagation()}><label>⌕<input autoFocus placeholder="Search ACS or run a command..." /></label><p>QUICK ACTIONS</p><button onClick={() => setWizard(true)}><span>＋</span><div><b>Create agent</b><small>Configure a new ACS agent</small></div><kbd>↵</kbd></button></div></div>}
    </div>
  );
}
