import { useEffect, useState } from 'react'
import { Header } from './components/Header'
import { ProductUI } from './components/ProductUI'
import { Architecture, OpenClawDiagram } from './components/Diagrams'
import { HeroSystemGraphic } from './components/HeroSystemGraphic'
import { CoreEvolution, WorkflowEvidence } from './components/CoreEvolution'
import { TenantAdministrationApp } from './admin/TenantAdministrationApp'
import { EXTERNAL_LINKS } from './config/links'

const APP=import.meta.env.VITE_ACS_APP_URL||'https://acs-app.axodus.country'
const GITHUB=import.meta.env.VITE_ACS_GITHUB_URL||'https://github.com/Axodus/ACS'
const DOCS=EXTERNAL_LINKS.docs
const concepts=[
 ['01','Agents','Create, configure, validate, deploy and inspect autonomous agent instances.'],
 ['02','Roles','Define reusable responsibilities without duplicating an agent’s entire configuration.'],
 ['03','Profiles','Manage identity, behavior, user context, memory and heartbeat as transparent resources.'],
 ['04','Skills','Install reusable capabilities once, then attach them precisely where they are needed.'],
 ['05','Tools & Plugins','Connect external systems with explicit configuration, permissions and health.'],
 ['06','Runtime','See execution, heartbeat, deployment state and logs from one operational surface.']]

function SectionHead({eyebrow,title,copy}:{eyebrow:string,title:string,copy?:string}){return <div className="section-head"><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{copy&&<p>{copy}</p>}</div>}

function usePathname() {
 const [pathname, setPathname] = useState(() => window.location.pathname)
 useEffect(() => {
  const update = () => setPathname(window.location.pathname)
  window.addEventListener('popstate', update)
  window.addEventListener('acs:navigation', update)
  return () => {
   window.removeEventListener('popstate', update)
   window.removeEventListener('acs:navigation', update)
  }
 }, [])
 return pathname
}

function PublicLandingPage(){return <div id="top">
 <Header getStarted={APP}/>
 <main>
  <section className="hero"><div className="hero-grid"/><HeroSystemGraphic/><div className="hero-copy"><div className="availability"><i/> OPEN CONTROL PLANE <span>Built around OpenClaw</span></div><h1>Operate AI agents<br/><em>like infrastructure.</em></h1><p>ACS turns agent configuration, capabilities, permissions and runtime state into an operational system you can inspect, validate and control.</p><div className="cta-group"><a className="button" href={APP}>Open control plane <span>↗</span></a><a className="button ghost" href="#system">Explore the system <span>↓</span></a></div><div className="hero-note"><span>LOCAL-FIRST</span><span>POLICY-BOUND</span><span>AUDITABLE</span><span>OPENCLAW-NATIVE</span></div></div><div className="hero-product"><ProductUI/><div className="product-glow"/></div></section>

  <section className="principle"><span>01 / PRINCIPLE</span><h2>The interface is the surface.<br/><em>The system is the product.</em></h2><div><p>A production agent is identity, behavior, memory, capabilities, permissions, workflow state and execution evidence. ACS makes each concern explicit and operable.</p><a href="#system">See the complete model →</a></div></section>

  <section id="product" className="section product-section"><SectionHead eyebrow="PRODUCT / CONTROL PLANE" title="One operational surface for your agents." copy="Move from configuration fragments to a system you can inspect, validate and control."/><div className="preview-wrap"><ProductUI/><div className="callout c1"><b>01</b><span>Agent lifecycle<small>Create → Validate → Deploy</small></span></div><div className="callout c2"><b>02</b><span>Runtime state<small>Visible, not assumed</small></span></div></div></section>

  <section id="system" className="section core-evolution"><div className="core-evolution-copy"><SectionHead eyebrow="PRODUCT + EVOLVING CORE" title="A control plane today. A coordination layer underneath."/><p className="lead">The public ACS product is the <strong>Agent Control System</strong>: the operational interface for OpenClaw agents. Its core is evolving toward broader autonomous coordination — adding deterministic workflows, bounded policy and verifiable execution without changing the product’s current promise.</p><div className="scope-note"><span>DEVELOPMENT BOUNDARY</span><p>Coordination, tenant and product-consumption primitives are active core development. This site presents the architectural direction, not finished product availability.</p></div></div><CoreEvolution/></section>

  <section className="section neurons-section" aria-label="$Neurons in the Axodus ecosystem"><div className="neurons-visual"><img src="/assets/neurons-logo.svg" alt="Neurons token"/></div><div className="neurons-copy"><SectionHead eyebrow="AXODUS ECOSYSTEM" title="$Neurons connects ACS to the broader Axodus ecosystem."/><p>ACS is part of the Axodus ecosystem, where infrastructure, automation and autonomous agents are designed to operate as interconnected components.</p><p>$Neurons is the ecosystem token associated with this broader architecture, providing a common economic layer for the evolution of the Axodus ecosystem.</p></div></section>

  <section className="section concepts"><SectionHead eyebrow="CORE MODEL" title="Everything your agents need. One system."/><div className="concept-grid">{concepts.map(([n,t,c],i)=><article className={i===0||i===5?'featured':''} key={t}><div><span>{n}</span><i>{['⬡','⌁','◎','✦','⎔','◉'][i]}</i></div><h3>{t}</h3><p>{c}</p><a href="#architecture" aria-label={`Learn about ${t}`}>Explore resource <b>↗</b></a></article>)}</div></section>

  <section className="section evidence-section"><SectionHead eyebrow="BOUNDED COORDINATION" title="From intent to evidence — without hidden execution." copy="The evolving ACS Core models workflows as explicit steps. Policies gate execution, capabilities make routing visible, and append-only receipts record the result."/><WorkflowEvidence/><div className="evidence-principles">{[['Deterministic','A stable workflow run ID prevents accidental duplicate execution.'],['Policy-bound','Permissions and risk are evaluated before work proceeds.'],['Capability-routed','Providers are selected by declared capability, not hidden logic.'],['Observable','Accepted, rejected, started, completed and failed states emit telemetry.']].map(([a,b])=><div key={a}><span>◇</span><b>{a}</b><p>{b}</p></div>)}</div></section>

  <section id="openclaw" className="section split openclaw"><div><SectionHead eyebrow="NATIVE COMPATIBILITY" title="Built around OpenClaw."/><p className="lead">ACS doesn’t replace OpenClaw. It gives OpenClaw an operational control plane.</p><blockquote>“OpenClaw is the runtime.<br/><strong>ACS is the control plane.</strong>”</blockquote><div className="file-tags">{['AGENTS.md','SOUL.md','USER.md','MEMORY.md','HEARTBEAT.md'].map(x=><code key={x}>{x}</code>)}</div><p className="muted">Native concepts remain visible, editable and portable — never hidden behind a generic “system prompt.”</p></div><OpenClawDiagram/></section>

  <section className="section profile-section"><div className="profile-card"><div className="profile-top"><span>PROFILE / beta-tester-profile</span><em>v1.4 · Active</em></div><div className="profile-body"><div className="profile-root"><span>◎</span><b>Profile</b><small>Behavior + context</small></div><div className="profile-tree">{[['ID','Identity','Who the agent is'],['AG','AGENTS','Operational instructions'],['SO','SOUL','Behavior and principles'],['US','USER','Operator context'],['ME','MEMORY','Persistent knowledge'],['HB','HEARTBEAT','Recurring activity']].map(([a,b,c])=><div key={b}><i>{a}</i><span><b>{b}</b><small>{c}</small></span><em>Configured</em></div>)}</div></div></div><div className="profile-copy"><SectionHead eyebrow="PROFILE ARCHITECTURE" title="Agent configuration is more than a system prompt."/><p>ACS makes identity, behavior, user context, memory and heartbeat independently manageable — without hiding the files and models OpenClaw already understands.</p><ul><li>Human-readable and transparent</li><li>Reusable across agent instances</li><li>Validated before deployment</li></ul></div></section>

  <section className="section capabilities"><SectionHead eyebrow="COMPOSABLE CAPABILITIES" title="Install once. Attach where needed." copy="Skills describe what agents can do. Plugins define which external systems they can access. Both remain independent of identity."/><div className="cap-flow"><div className="flow-column"><span>CAPABILITY</span>{['Registry / ClawHub','Install skill','ACS workspace','Selected agents'].map((x,i)=><div key={x}><i>{['⌘','↓','✦','⬡'][i]}</i><b>{x}</b>{i<3&&<em>↓</em>}</div>)}</div><div className="flow-divider"><span>COMPOSE</span></div><div className="flow-column"><span>INTEGRATION</span>{['External service','Tool / Plugin','Permission scope','Selected agents'].map((x,i)=><div key={x}><i>{['◫','↓','⎔','⬡'][i]}</i><b>{x}</b>{i<3&&<em>↓</em>}</div>)}</div></div></section>

  <section className="section cli-gui"><div className="cli-copy"><SectionHead eyebrow="MULTIPLE INTERFACES" title="GUI when you want it. CLI when you need it."/><p>Different workflows. The same domain, validation rules and runtime state underneath.</p><div className="terminal"><div><i/><i/><i/><span>~/acs</span></div><pre><span>$</span> acs agent{`\n`}<span>$</span> acs agent create{`\n`}<span>$</span> acs agent validate <b>beta-tester</b>{`\n`}<span>$</span> acs agent deploy <b>beta-tester</b>{`\n\n`}<em>✓ Agent validated{`\n`}✓ Deployment ready</em></pre></div></div><div className="gui-card"><ProductUI compact/><div className="same-core"><span>CLI</span><i>→</i><b>ACS CORE</b><i>←</i><span>GUI</span></div></div></section>

  <section id="architecture" className="section architecture-section"><SectionHead eyebrow="SYSTEM ARCHITECTURE" title="Different interfaces. One bounded core." copy="The CLI and Standalone App operate the same model. ACS Core coordinates agents, capabilities, policy decisions, telemetry and receipts before handing bounded execution to OpenClaw."/><Architecture/><div className="architecture-legend"><span><i className="solid"/> Available product surface</span><span><i className="outline"/> Evolving core capability</span><span><i className="pulse"/> Observable runtime state</span></div></section>

  <section className="section runtime"><div className="runtime-copy"><SectionHead eyebrow="RUNTIME VISIBILITY" title="Know what is actually running — and why."/><p>Configuration is only half the problem. ACS connects declared state to runtime health, policy decisions, heartbeat, telemetry and inspection.</p><div className="runtime-points"><span><i/> Local OpenClaw discovery without code execution</span><span><i/> Append-only JSONL telemetry and receipts</span><span><i/> Bounded permissions and visible provider routing</span><span><i/> Idempotent workflow execution by default</span></div></div><div className="runtime-panel"><div className="runtime-head"><span><i/> OpenClaw Running</span><small>local operational runtime</small></div><div className="runtime-stats"><div><small>AGENTS</small><b>03</b><span>discovered</span></div><div><small>POLICY</small><b className="green">Bounded</b><span>default gate</span></div><div><small>RECEIPTS</small><b>24</b><span>append-only</span></div><div><small>TELEMETRY</small><b>Live</b><span>observable</span></div></div><div className="runtime-log"><span>06:41:12</span> workflow.accepted / dev-coordination<br/><span>06:41:04</span> provider.capability / validation matched<br/><span>06:40:58</span> receipt.created / execution completed</div></div></section>

  <section id="developers" className="section developer"><div><SectionHead eyebrow="DEVELOPER EXPERIENCE" title="Designed for operators and developers."/><p>Concrete workflows, explicit state and configuration you can understand outside the interface.</p><a className="text-link" href={DOCS} target="_blank" rel="noopener noreferrer">Read the documentation →</a></div><div className="dev-list">{['Human-readable configuration','CLI and graphical workflows','Reusable roles and profiles','Composable skills','Explicit plugin permissions','Validation before deployment','Runtime health and logs'].map((x,i)=><div key={x}><span>{String(i+1).padStart(2,'0')}</span><b>{x}</b><i>✓</i></div>)}</div></section>

  <section className="final-cta"><div className="cta-grid"/><img className="node-logo logo-mark" src="/assets/Axodus_logo.svg" alt="Axodus"/><p>INFRASTRUCTURE FOR AUTONOMOUS AGENTS</p><h2>Take control of<br/><em>your agents.</em></h2><p>Configure, deploy and operate OpenClaw agents from one coherent control plane.</p><div className="cta-group"><a className="button light" href={APP}>Get started <span>↗</span></a><a className="button ghost" href={DOCS} target="_blank" rel="noopener noreferrer">View documentation</a></div></section>
 </main>
 <footer><div className="footer-brand"><div className="brand"><img className="footer-axodus" src="/assets/Axodus_logo.svg" alt="Axodus"/><span>ACS</span></div><p>Agent Control System<br/>Part of the Axodus ecosystem.</p></div><div className="footer-links"><div><b>Product</b><a href="#product">Overview</a><a href="#architecture">Architecture</a><a href="#openclaw">OpenClaw</a></div><div><b>Developers</b><a href={DOCS} target="_blank" rel="noopener noreferrer">Documentation</a><a href={GITHUB}>GitHub</a><a href="#developers">CLI</a></div><div><b>Project</b><a href={GITHUB}>Releases</a><a href={GITHUB}>License</a></div></div><div className="footer-bottom"><span>© 2026 ACS — Agent Control System</span><span><i/> Open development</span></div></footer>
 </div>}

export default function App() {
 const pathname = usePathname()
 return pathname.startsWith('/admin/tenants') ? <TenantAdministrationApp /> : <PublicLandingPage />
}
