import { useEffect, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { productApi } from "./api/product-api";

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

type Agent = {
  agentId: string;
  name: string;
  status: string;
  definition: {
    roleId?: string;
    profileId?: string;
  };
  revision: number;
  createdAt: number;
};

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

function Dashboard({ setView }: { setView: (v: View) => void }) {
  const [data, setData] = useState<{ agents: Agent[]; loading: boolean }>({ agents: [], loading: true });

  useEffect(() => {
    productApi.listAgents()
      .then(agents => setData({ agents, loading: false }))
      .catch(() => setData({ agents: [], loading: false }));
  }, []);

  if (data.loading) return <div className="loading-screen">Loading operational state...</div>;

  return <>
    <header className="page-head"><div><p className="eyebrow">LOCAL CONTROL PLANE</p><h1>Good morning, operator.</h1><p>Your ACS environment is healthy and ready for work.</p></div><button className="primary" onClick={() => setView("Agents")}>＋ Create agent</button></header>
    <section className="metrics">
      <Metric label="Agents" value={data.agents.length.toString()} note={`${data.agents.filter(a => a.status === "running").length} running`} />
      <Metric label="Skills" value="--" note="loading" />
      <Metric label="Plugins" value="--" note="loading" />
      <Metric label="Runtime" value={data.agents.length > 0 ? "Running" : "Idle"} note="OpenClaw connected" />
    </section>
    <div className="dashboard-grid">
      <section className="panel agents-panel"><div className="panel-head"><div><h2>Agents</h2><p>Deployed in this workspace</p></div><button className="text-btn" onClick={() => setView("Agents")}>View all →</button></div>
        <div className="agent-list">
          {data.agents.length === 0 ? <div className="empty-state">No agents deployed</div> : data.agents.map(a => (
            <button className="agent-row" key={a.agentId} onClick={() => window.location.href = `/agents/${a.agentId}`}>
              <span className={`avatar ${a.status !== "running" ? "gray" : ""}`}>{a.name.split(" ").map(x => x[0]).join("")}</span>
              <span className="agent-main"><b>{a.name}</b><small>{a.agentId} · {a.definition.roleId ?? "no role"}</small></span>
              <span className="agent-health"><Status status={a.status} /><small>{a.status === "running" ? "Healthy" : "Not deployed"}</small></span>
              <span className="chev">›</span>
            </button>
          ))}
        </div>
      </section>
      <section className="panel runtime-card"><div className="panel-head"><div><p className="eyebrow">RUNTIME</p><h2>OpenClaw</h2></div><span className="pulse"><i /> {data.agents.length > 0 ? "LIVE" : "IDLE"}</span></div><div className="runtime-orbit"><div className="core">ACS<small>CORE</small></div><span className="node n1">BT</span><span className="node n2">DV</span><span className="node n3">RS</span></div><dl><div><dt>Status</dt><dd><Status status={data.agents.length > 0 ? "Running" : "Idle"} /></dd></div><div><dt>Workspace</dt><dd className="mono">~/.openclaw</dd></div><div><dt>Uptime</dt><dd>--:--:--</dd></div><div><dt>Heartbeat</dt><dd>{data.agents.length > 0 ? "Healthy" : "None"}</dd></div></dl><button className="secondary full" onClick={() => setView("Runtime")}>Inspect runtime <span>→</span></button></section>
      <section className="panel activity"><div className="panel-head"><div><h2>Recent activity</h2><p>Changes across your environment</p></div><button className="icon-btn">•••</button></div><div className="empty-state">No recent events</div></section>
      <section className="panel quick"><div className="panel-head"><div><h2>Quick actions</h2><p>Common operator workflows</p></div></div><div className="quick-grid"><button onClick={() => setView("Agents")}><span>＋</span><b>Create agent</b><small>Configure a new agent</small></button><button onClick={() => setView("Logs")}><span>≡</span><b>Open logs</b><small>Inspect live events</small></button><button onClick={() => setView("Skills")}><span>✦</span><b>Install skill</b><small>Browse the registry</small></button><button onClick={() => setView("Runtime")}><span>↻</span><b>Validate runtime</b><small>Check OpenClaw health</small></button></div></section>
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

  const filtered = agents.filter(a => (a.name + a.agentId + (a.definition.roleId ?? "")).toLowerCase().includes(q.toLowerCase()));

  if (loading) return <div className="loading-screen">Loading agents...</div>;

  return <>
    <header className="page-head compact"><div><p className="eyebrow">INFRASTRUCTURE</p><h1>Agents</h1><p>Configure, validate, deploy and observe your agent fleet.</p></div><button className="primary">＋ Create agent</button></header>
    <div className="toolbar"><label className="search">⌕<input value={q} onChange={e => setQ(e.target.value)} placeholder="Search agents..." /></label><button className="filter">Status⌄</button><button className="filter">Role⌄</button></div>
    <section className="agent-cards">
      {filtered.length === 0 ? <div className="empty-state">No agents found</div> : filtered.map(a => (
        <article className="agent-card" key={a.agentId}>
          <div className="card-title"><span className={`avatar ${a.status !== "running" ? "gray" : ""}`}>{a.name.slice(0, 2).toUpperCase()}</span><div><h2>{a.name}</h2><p className="mono">{a.agentId}</p></div><Status status={a.status} /></div>
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
    } catch (e: any) {
      setDeployError(e.message);
    } finally {
      setDeploying(false);
    }
  }

  if (loading) return <div className="loading-screen">Loading agent...</div>;
  if (!agent) return <div className="empty-state">Agent not found</div>;

  return <>
    <button className="back" onClick={back}>← Agents</button>
    <header className="detail-head"><div className="detail-id"><span className="avatar large">{agent.name.slice(0, 2).toUpperCase()}</span><div><div className="title-status"><h1>{agent.name}</h1><Status status={agent.status} /></div><p className="mono">{agent.agentId} · {agent.definition.roleId ?? "unassigned"}</p></div></div><div className="actions"><button className="secondary">■ Stop</button><button className="secondary">▷ Test</button><button className="primary" disabled={deploying} onClick={handleDeploy}>{deploying ? "Deploying..." : "↑ Deploy"}</button><button className="icon-btn">•••</button></div></header>
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
  const { agentId } = useParams();
  const navigate = useNavigate();
  return <AgentDetail agentId={agentId} back={() => navigate("/agents")} />;
}

export default function App() {
  const [wizard, setWizard] = useState(false);
  const [palette, setPalette] = useState(false);
  const [dark, setDark] = useState(true);
  const [mobile, setMobile] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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

  const openAgent = (a: Agent) => navigate(`/agents/${a.agentId}`);
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
        <div className="workspace-switch"><span className="workspace-icon">⌘</span><div><b>Local workspace</b><small>~/.openclaw</small></div><span>⌄</span></div>
        <nav>{navGroups.map((g, i) => <div className="nav-group" key={i}>{g.map(v => <button className={!agentDetail && view === v ? "active" : ""} onClick={() => go(v)} key={v}><span>{icons[v]}</span>{v}{v === "Skills" && <i className="count">2</i>}</button>)}</div>)}</nav>
        <div className="connection"><div><span className="openclaw-mark">🦞</span><div><b>OpenClaw</b><small><i /> Connected</small></div></div><span className="mono">v0.9.4</span></div>
      </aside>
      <main className="main">
        <header className="topbar">
          <button className="menu" onClick={() => setMobile(true)}>☰</button>
          <div className="crumb"><span>ACS</span><i>/</i><b>{title}</b></div>
          <div className="top-actions"><Status status="Runtime healthy" /><button className="command" onClick={() => setPalette(true)}>⌕ <span>Search ACS...</span><kbd>⌘ K</kbd></button><button className="icon-btn" onClick={() => setDark(!dark)}>{dark ? "☼" : "◐"}</button><button className="icon-btn notification">♢<i /></button></div>
        </header>
        <div className="content">
          <Routes>
            <Route path="/" element={<Dashboard setView={go} />} />
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
        <footer><span><i /> OpenClaw connected</span><span className="mono">~/.openclaw</span><span>ACS Core v0.8.1</span></footer>
      </main>
      {wizard && <div className="modal-wrap"><div className="wizard"><div className="wizard-head"><h1>Create Agent</h1><button onClick={() => setWizard(false)}>×</button></div><div className="wizard-body"><p>Agent creation is handled via ACS CLI or governed Product API requests.</p></div></div></div>}
      {palette && <div className="palette-wrap" onClick={() => setPalette(false)}><div className="palette" onClick={e => e.stopPropagation()}><label>⌕<input autoFocus placeholder="Search ACS or run a command..." /></label><p>QUICK ACTIONS</p><button onClick={() => setWizard(true)}><span>＋</span><div><b>Create agent</b><small>Configure a new ACS agent</small></div><kbd>↵</kbd></button></div></div>}
    </div>
  );
}
