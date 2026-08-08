import { useEffect, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

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
  name: string;
  id: string;
  role: string;
  profile: string;
  status: "Running" | "Stopped";
  skills: number;
  plugins: number;
  heartbeat: string;
};

const agents: Agent[] = [
  { name: "Beta Tester", id: "beta-tester", role: "Technical Assistant", profile: "beta tester agent", status: "Running", skills: 6, plugins: 3, heartbeat: "12 sec ago" },
  { name: "Developer", id: "developer", role: "Software Engineer", profile: "software engineer default", status: "Running", skills: 8, plugins: 4, heartbeat: "8 sec ago" },
  { name: "Researcher", id: "researcher", role: "Research Agent", profile: "research agent", status: "Stopped", skills: 4, plugins: 2, heartbeat: "2 hr ago" },
];

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
  const tone = /running|healthy|connected|installed/i.test(status) ? "good" : /warning|updating/i.test(status) ? "warn" : "muted";
  return <span className={`status ${tone}`}><i />{status}</span>;
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return <article className="metric"><div className="metric-top"><span>{label}</span><span className="metric-mark">↗</span></div><strong>{value}</strong><small>{note}</small></article>;
}

function Dashboard({ openAgent, setView }: { openAgent: (a: Agent) => void; setView: (v: View) => void }) {
  return <>
    <header className="page-head"><div><p className="eyebrow">LOCAL CONTROL PLANE</p><h1>Good morning, operator.</h1><p>Your ACS environment is healthy and ready for work.</p></div><button className="primary" onClick={() => setView("Agents")}>＋ Create agent</button></header>
    <section className="metrics"><Metric label="Agents" value="4" note="3 running" /><Metric label="Skills" value="18" note="installed" /><Metric label="Plugins" value="7" note="6 healthy" /><Metric label="Runtime" value="Running" note="OpenClaw connected" /></section>
    <div className="dashboard-grid">
      <section className="panel agents-panel"><div className="panel-head"><div><h2>Agents</h2><p>Deployed in this workspace</p></div><button className="text-btn" onClick={() => setView("Agents")}>View all →</button></div>
        <div className="agent-list">{agents.map(a => <button className="agent-row" key={a.id} onClick={() => openAgent(a)}><span className={`avatar ${a.status === "Stopped" ? "gray" : ""}`}>{a.name.split(" ").map(x => x[0]).join("")}</span><span className="agent-main"><b>{a.name}</b><small>{a.id} · {a.role}</small></span><span className="agent-health"><Status status={a.status} /><small>{a.status === "Running" ? `Heartbeat ${a.heartbeat}` : "Not deployed"}</small></span><span className="chev">›</span></button>)}</div>
      </section>
      <section className="panel runtime-card"><div className="panel-head"><div><p className="eyebrow">RUNTIME</p><h2>OpenClaw</h2></div><span className="pulse"><i /> LIVE</span></div><div className="runtime-orbit"><div className="core">ACS<small>CORE</small></div><span className="node n1">BT</span><span className="node n2">DV</span><span className="node n3">RS</span></div><dl><div><dt>Status</dt><dd><Status status="Running" /></dd></div><div><dt>Workspace</dt><dd className="mono">~/.openclaw</dd></div><div><dt>Uptime</dt><dd>05:18:42</dd></div><div><dt>Heartbeat</dt><dd>Healthy</dd></div></dl><button className="secondary full" onClick={() => setView("Runtime")}>Inspect runtime <span>→</span></button></section>
      <section className="panel activity"><div className="panel-head"><div><h2>Recent activity</h2><p>Changes across your environment</p></div><button className="icon-btn">•••</button></div>{[["05:41", "beta-tester", "Heartbeat received", "good"], ["05:38", "developer", "Agent deployed", "info"], ["05:35", "github", "Skill updated to v1.4.2", "violet"], ["05:31", "profile", "Revision 4 created", "neutral"]].map((x, i) => <div className="activity-row" key={i}><time>{x[0]}</time><i className={x[3]} /><div><b>{x[1]}</b><span>{x[2]}</span></div></div>)}</section>
      <section className="panel quick"><div className="panel-head"><div><h2>Quick actions</h2><p>Common operator workflows</p></div></div><div className="quick-grid"><button onClick={() => setView("Agents")}><span>＋</span><b>Create agent</b><small>Configure a new agent</small></button><button onClick={() => setView("Logs")}><span>≡</span><b>Open logs</b><small>Inspect live events</small></button><button onClick={() => setView("Skills")}><span>✦</span><b>Install skill</b><small>Browse the registry</small></button><button onClick={() => setView("Runtime")}><span>↻</span><b>Validate runtime</b><small>Check OpenClaw health</small></button></div></section>
    </div>
  </>;
}

function Agents({ openAgent, create }: { openAgent: (a: Agent) => void; create: () => void }) {
  const [q, setQ] = useState("");
  const filtered = agents.filter(a => (a.name + a.id + a.role).toLowerCase().includes(q.toLowerCase()));
  return <>
    <header className="page-head compact"><div><p className="eyebrow">INFRASTRUCTURE</p><h1>Agents</h1><p>Configure, validate, deploy and observe your agent fleet.</p></div><button className="primary" onClick={create}>＋ Create agent</button></header>
    <div className="toolbar"><label className="search">⌕<input value={q} onChange={e => setQ(e.target.value)} placeholder="Search agents..." /></label><button className="filter">Status⌄</button><button className="filter">Role⌄</button></div>
    <section className="agent-cards">{filtered.map(a => <article className="agent-card" key={a.id}><div className="card-title"><span className={`avatar ${a.status === "Stopped" ? "gray" : ""}`}>{a.name.slice(0, 2).toUpperCase()}</span><div><h2>{a.name}</h2><p className="mono">{a.id}</p></div><Status status={a.status} /></div><div className="card-specs"><span>Role<b>{a.role}</b></span><span>Profile<b>{a.profile}</b></span><span>Revision<b>4</b></span></div><div className="cap-row"><span>✦ {a.skills} skills</span><span>⌘ {a.plugins} plugins</span><span>◎ Memory enabled</span></div><div className="card-actions"><button className="secondary" onClick={() => openAgent(a)}>Open agent</button><button className="icon-btn">•••</button></div></article>)}</section>
  </>;
}

function AgentDetail({ agent, back }: { agent: Agent; back: () => void }) {
  const [tab, setTab] = useState("Overview");
  const tabs = ["Overview", "Profile", "Skills", "Plugins", "Memory", "Runtime", "Logs"];
  return <>
    <button className="back" onClick={back}>← Agents</button>
    <header className="detail-head"><div className="detail-id"><span className="avatar large">{agent.name.slice(0, 2).toUpperCase()}</span><div><div className="title-status"><h1>{agent.name}</h1><Status status={agent.status} /></div><p className="mono">{agent.id} · {agent.role}</p></div></div><div className="actions"><button className="secondary">■ Stop</button><button className="secondary">▷ Test</button><button className="primary">↑ Deploy</button><button className="icon-btn">•••</button></div></header>
    <div className="tabs">{tabs.map(t => <button className={tab === t ? "active" : ""} onClick={() => setTab(t)} key={t}>{t}</button>)}</div>
    {tab === "Profile" ? <ProfileEditor /> : <div className="detail-grid">
      <section className="panel"><div className="panel-head"><div><h2>{tab === "Overview" ? "Configuration" : tab}</h2><p>{tab === "Overview" ? "Current agent specification" : `Attached ${tab.toLowerCase()} and configuration`}</p></div><button className="text-btn">Edit →</button></div><dl className="config-list"><div><dt>Agent ID</dt><dd className="mono">{agent.id}</dd></div><div><dt>Role</dt><dd>{agent.role}</dd></div><div><dt>Profile</dt><dd>{agent.profile}</dd></div><div><dt>Revision</dt><dd>4 <span className="tag">Current</span></dd></div></dl></section>
      <section className="panel"><div className="panel-head"><div><h2>Runtime</h2><p>Live OpenClaw process</p></div><Status status={agent.status} /></div><dl className="config-list"><div><dt>Last heartbeat</dt><dd>{agent.heartbeat}</dd></div><div><dt>Compatibility</dt><dd>OpenClaw <span className="check">✓</span></dd></div><div><dt>Process ID</dt><dd className="mono">18422</dd></div><div><dt>Heartbeat</dt><dd>Every 30 seconds</dd></div></dl></section>
      <section className="panel wide"><div className="panel-head"><div><h2>Capabilities</h2><p>Attached resources</p></div></div><div className="capabilities"><div><span>✦</span><b>{agent.skills}</b><small>Skills</small></div><div><span>⌘</span><b>{agent.plugins}</b><small>Plugins</small></div><div><span>◎</span><b>On</b><small>Memory</small></div><div><span>◉</span><b>30s</b><small>Heartbeat</small></div></div></section>
    </div>}
  </>;
}

function ProfileEditor() {
  const [file, setFile] = useState("AGENTS.md");
  const copy: Record<string, string> = {
    "AGENTS.md": "# Beta Tester\n\nYou are responsible for testing ACS deployments and reporting operational issues.\n\n## Responsibilities\n\n- Validate before claiming success\n- Reproduce failures consistently\n- Report evidence clearly",
    "SOUL.md": "# Soul\n\nAnalytical, skeptical and methodical. Communicate concisely and prefer evidence over assumption.",
    "USER.md": "# User\n\nSupport the local ACS operator. Respect workspace boundaries and confirm destructive actions.",
    "MEMORY.md": "# Memory\n\nMaintain durable facts about deployments, preferences and recurring failures.",
    "HEARTBEAT.md": "# Heartbeat\n\nInterval: 30s\nReport runtime health and pending work.",
  };
  return <section className="editor-shell"><aside>{Object.keys(copy).map(f => <button className={file === f ? "active" : ""} onClick={() => setFile(f)} key={f}><span>◇</span>{f}</button>)}</aside><div className="editor"><div className="editor-bar"><span className="mono">profiles/beta-tester/{file}</span><span>Markdown · UTF-8</span></div><pre>{copy[file]}</pre><div className="editor-actions"><span><i /> Valid OpenClaw profile</span><button className="secondary">Validate</button><button className="primary">Save revision</button></div></div></section>;
}

function Wizard({ close }: { close: () => void }) {
  const [step, setStep] = useState(1);
  const labels = ["Identity", "Role", "Profile", "Skills", "Plugins", "Review"];
  return <div className="modal-wrap"><div className="wizard"><div className="wizard-head"><div><p className="eyebrow">NEW INFRASTRUCTURE</p><h1>Create agent</h1></div><button className="icon-btn" onClick={close}>×</button></div><div className="steps">{labels.map((l, i) => <div className={step === i + 1 ? "active" : step > i + 1 ? "done" : ""} key={l}><span>{step > i + 1 ? "✓" : i + 1}</span><small>{l}</small></div>)}</div><div className="wizard-body"><p className="eyebrow">STEP {step} OF 6</p><h2>{labels[step - 1]}</h2><p>{step === 1 ? "Define how this agent will be identified across ACS and OpenClaw." : `Configure the agent ${labels[step - 1].toLowerCase()} before review.`}</p>{step === 1 ? <div className="form"><label>Name<input defaultValue="Beta Tester" /></label><label>Agent ID<input className="mono" defaultValue="beta-tester" /><small className="valid">✓ beta-tester is available</small></label><label>Description<textarea defaultValue="Tests ACS deployments and reports issues." /></label><label>Workspace<select defaultValue="Default"><option>Default</option></select></label></div> : step === 2 ? <div className="role-list">{["Technical Assistant", "Software Engineer", "Researcher", "Custom Role"].map((r, i) => <label key={r}><input type="radio" name="role" defaultChecked={i === 0} /><span><b>{r}</b><small>{i === 0 ? "General technical operations and troubleshooting." : "Configure domain responsibilities and permissions."}</small></span></label>)}</div> : <div className="empty-step"><span>{icons[labels[step - 1] as View] || "◇"}</span><b>{labels[step - 1]} configuration</b><p>This stage remains compatible with the equivalent ACS CLI workflow.</p></div>}</div><div className="wizard-foot"><button className="secondary" onClick={() => step === 1 ? close() : setStep(step - 1)}>{step === 1 ? "Cancel" : "← Back"}</button><span>Draft saved locally</span><button className="primary" onClick={() => step === 6 ? close() : setStep(step + 1)}>{step === 6 ? "Create agent" : "Continue →"}</button></div></div></div>;
}

function GenericView({ view }: { view: View }) {
  const data: Record<string, [string, string, string][]> = {
    Roles: [["Technical Assistant", "technical-assistant", "Used by 3 agents"], ["Software Engineer", "software-engineer", "Used by 2 agents"], ["Researcher", "research-agent", "Used by 1 agent"]],
    Profiles: [["Beta Tester", "beta-tester-agent", "Revision 4"], ["Developer", "software-engineer-default", "Revision 7"], ["Research", "research-agent", "Revision 2"]],
    Skills: [["GitHub", "Repository and pull-request operations", "v1.4.2 · ClawHub"], ["Browser", "Web navigation and retrieval", "v2.1.0 · ClawHub"], ["Filesystem", "Safe workspace file operations", "v1.8.3 · Built-in"]],
    "Tools & Plugins": [["GitHub", "Connected", "Repositories · Pull Requests · Issues"], ["Local Shell", "Connected", "Workspace-scoped execution"], ["Slack", "Not configured", "Messaging and notifications"]],
    Memory: [["Beta Tester", "12 memory entries", "Updated 4 min ago"], ["Developer", "34 memory entries", "Updated 8 min ago"], ["Researcher", "21 memory entries", "Updated yesterday"]],
  };
  if (view === "Runtime") return <Runtime />;
  if (view === "Logs") return <Logs />;
  if (view === "Settings") return <Settings />;
  return <>
    <header className="page-head compact"><div><p className="eyebrow">ACS CORE</p><h1>{view}</h1><p>Manage {view.toLowerCase()} available to this local workspace.</p></div><button className="primary">＋ {view === "Skills" ? "Discover skills" : `New ${view.replace(/s$/, "")}`}</button></header>
    {view === "Skills" && <div className="subtabs"><button className="active">Installed</button><button>Discover</button><button>Updates <span className="tag">2</span></button></div>}
    <section className="resource-list">{(data[view] || []).map(x => <article key={x[0]}><span className="resource-icon">{icons[view]}</span><div><h2>{x[0]}</h2><p>{x[1]}</p></div><span className="resource-meta">{x[2]}</span>{view === "Tools & Plugins" && <Status status={x[1]} />}<button className="secondary">Configure</button><button className="icon-btn">•••</button></article>)}</section>
  </>;
}

function Runtime() {
  return <>
    <header className="page-head compact"><div><p className="eyebrow">OPENCLAW</p><h1>Runtime</h1><p>Process health, compatibility and deployed agents.</p></div><Status status="Running" /></header>
    <section className="runtime-hero panel"><div className="runtime-big"><div className="core">ACS<small>CORE</small></div><div><p className="eyebrow">OPENCLAW RUNTIME</p><h2>All systems operational</h2><p>3 agents are running in <span className="mono">~/.openclaw</span></p></div></div><div className="actions"><button className="secondary">↻ Restart runtime</button><button className="primary">✓ Validate</button></div></section>
    <section className="runtime-stats"><Metric label="Uptime" value="05:18:42" note="Since last restart" /><Metric label="Agents" value="3" note="running" /><Metric label="Heartbeats" value="Healthy" note="0 missed" /></section>
    <section className="panel"><div className="panel-head"><div><h2>Running agents</h2><p>Live processes managed by OpenClaw</p></div><button className="text-btn">Open logs →</button></div>{agents.filter(a => a.status === "Running").map((a, i) => <div className="process" key={a.id}><span className="avatar">{a.name.slice(0, 2)}</span><div><b>{a.id}</b><small>{a.role}</small></div><Status status="Healthy" /><span className="mono">PID {18422 + i * 9}</span><span>{a.heartbeat}</span></div>)}</section>
  </>;
}

function Logs() {
  return <>
    <header className="page-head compact"><div><p className="eyebrow">OBSERVABILITY</p><h1>Logs</h1><p>Live events from ACS Core, agents and plugins.</p></div><span className="pulse"><i /> LIVE</span></header>
    <div className="toolbar"><button className="filter">All agents⌄</button><button className="filter">All levels⌄</button><label className="search">⌕<input placeholder="Search logs..." /></label><button className="secondary">Pause</button><button className="secondary">Download</button></div>
    <div className="log-viewer">{[["05:48:12", "INFO", "beta-tester", "heartbeat received"], ["05:48:08", "TOOL", "developer", "github.pull_request completed in 842ms"], ["05:48:05", "INFO", "developer", "memory.write · 1 entry persisted"], ["05:48:01", "WARN", "researcher", "plugin timeout · retrying (1/3)"], ["05:47:58", "INFO", "acs-core", "configuration validation passed"], ["05:47:32", "INFO", "beta-tester", "heartbeat received"]].map((l, i) => <div key={i}><time>{l[0]}</time><span className={`level ${l[1].toLowerCase()}`}>{l[1]}</span><b>{l[2]}</b><code>{l[3]}</code></div>)}</div>
  </>;
}

function Settings() {
  return <>
    <header className="page-head compact"><div><p className="eyebrow">WORKSPACE</p><h1>Settings</h1><p>Configure ACS, OpenClaw and local registries.</p></div></header>
    <div className="settings"><aside>{["General", "Workspace", "OpenClaw", "Registries", "Appearance", "Advanced"].map((x, i) => <button className={i === 1 ? "active" : ""} key={x}>{x}</button>)}</aside><section className="panel"><div className="panel-head"><div><h2>ACS Workspace</h2><p>Local paths used by the current control plane.</p></div></div><div className="form"><label>Workspace path<input className="mono" defaultValue="~/.openclaw" /></label><label>Configuration<input className="mono" defaultValue="~/.openclaw/acs" /></label></div><div className="settings-row"><div><b>OpenClaw</b><p>Detected at /usr/local/bin/openclaw</p></div><Status status="Connected" /><button className="secondary">Validate installation</button></div><div className="settings-row"><div><b>ClawHub registry</b><p>Official skill registry</p></div><Status status="Connected" /><button className="secondary">Configure</button></div></section></div>
  </>;
}

function AgentRoute() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const agent = agents.find(a => a.id === agentId);
  if (!agent) return <Navigate to="/agents" replace />;
  return <AgentDetail agent={agent} back={() => navigate("/agents")} />;
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

  const openAgent = (a: Agent) => navigate(`/agents/${a.id}`);
  const go = (v: View) => {
    navigate(viewPaths[v]);
    setMobile(false);
  };
  const view = viewOfPath(location.pathname);
  const agentDetail = agents.find(a => location.pathname === `/agents/${a.id}`) ?? null;
  const title = agentDetail ? agentDetail.name : (view ?? "ACS");

  return (
    <div className={dark ? "app dark" : "app light"}>
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <div className="brand"><img src="/assets/Axodus_logo.svg" /><div><b>ACS</b><small>CONTROL PLANE</small></div><button className="mobile-close" onClick={() => setMobile(false)}>×</button></div>
        <div className="workspace-switch"><span className="workspace-icon">⌘</span><div><b>Local workspace</b><small>~/.openclaw</small></div><span>⌄</span></div>
        <nav>{navGroups.map((g, i) => <div className="nav-group" key={i}>{g.map(v => <button className={!agentDetail && view === v ? "active" : ""} onClick={() => go(v)} key={v}><span>{icons[v]}</span>{v}{v === "Skills" && <i className="count">2</i>}</button>)}</div>)}</nav>
        <div className="connection"><div><span className="openclaw-mark">🦀</span><div><b>OpenClaw</b><small><i /> Connected</small></div></div><span className="mono">v0.9.4</span></div>
      </aside>
      <main className="main">
        <header className="topbar">
          <button className="menu" onClick={() => setMobile(true)}>☰</button>
          <div className="crumb"><span>ACS</span><i>/</i><b>{title}</b></div>
          <div className="top-actions"><Status status="Runtime healthy" /><button className="command" onClick={() => setPalette(true)}>⌕ <span>Search ACS...</span><kbd>⌘ K</kbd></button><button className="icon-btn" onClick={() => setDark(!dark)}>{dark ? "☼" : "◐"}</button><button className="icon-btn notification">♢<i /></button></div>
        </header>
        <div className="content">
          <Routes>
            <Route path="/" element={<Dashboard openAgent={openAgent} setView={go} />} />
            <Route path="/agents" element={<Agents openAgent={openAgent} create={() => setWizard(true)} />} />
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
      {wizard && <Wizard close={() => setWizard(false)} />}
      {palette && <div className="palette-wrap" onClick={() => setPalette(false)}><div className="palette" onClick={e => e.stopPropagation()}><label>⌕<input autoFocus placeholder="Search ACS or run a command..." /></label><p>QUICK ACTIONS</p>{[["＋", "Create agent", "Configure a new ACS agent"], ["↑", "Deploy beta-tester", "Start the latest revision"], ["≡", "Open developer logs", "Inspect live runtime events"], ["↻", "Restart runtime", "Restart OpenClaw safely"]].map(x => <button key={x[1]} onClick={() => { if (x[1] === "Create agent") setWizard(true); setPalette(false); }}><span>{x[0]}</span><div><b>{x[1]}</b><small>{x[2]}</small></div><kbd>↵</kbd></button>)}</div></div>}
    </div>
  );
}
