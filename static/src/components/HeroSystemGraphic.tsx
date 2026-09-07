const leftNodes = [
  ['01','AGENT','identity + role'],
  ['02','PROFILE','soul + memory'],
  ['03','CAPABILITY','skills + tools'],
]
const rightNodes = [
  ['04','POLICY','bounded execution'],
  ['05','RECEIPT','append-only record'],
  ['06','TELEMETRY','observable state'],
]

export function HeroSystemGraphic(){return <div className="hero-system" aria-hidden="true">
  <svg className="hero-wiring" viewBox="0 0 1440 760" preserveAspectRatio="none">
    <defs><linearGradient id="wire" x1="0" x2="1"><stop stopColor="#67d9dd" stopOpacity="0"/><stop offset=".5" stopColor="#67d9dd" stopOpacity=".42"/><stop offset="1" stopColor="#67d9dd" stopOpacity="0"/></linearGradient></defs>
    <path d="M0 112H290L410 232H560"/><path d="M0 274H238L390 364H560"/><path d="M0 528H310L430 452H560"/>
    <path d="M1440 136H1160L1030 250H880"/><path d="M1440 330H1180L1030 364H880"/><path d="M1440 566H1140L1010 468H880"/>
    <path className="signal" d="M0 364H1440"/><circle cx="720" cy="364" r="126"/><circle cx="720" cy="364" r="174" strokeDasharray="4 12"/>
  </svg>
  <div className="hero-node-stack left">{leftNodes.map(([n,t,c])=><div className="system-node" key={t}><span>{n}</span><div><b>{t}</b><small>{c}</small></div><i>→</i></div>)}</div>
  <div className="hero-node-stack right">{rightNodes.map(([n,t,c])=><div className="system-node" key={t}><i>←</i><span>{n}</span><div><b>{t}</b><small>{c}</small></div></div>)}</div>
  <div className="hero-core-orbit"><span>ACS</span><small>CONTROL PLANE</small><i className="orbit-dot"/></div>
  <div className="coordinate c-top">RUNTIME / 00:ACTIVE</div><div className="coordinate c-bottom">WORKSPACE / LOCAL</div>
 </div>}
