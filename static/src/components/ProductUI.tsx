const agents=[['BT','Beta Tester','beta-tester','Running'],['SE','Software Engineer','software-engineer','Ready'],['RS','Research Agent','research-agent','Stopped']]

export function ProductUI({compact=false}:{compact?:boolean}){
 return <div className={`product-ui ${compact?'compact':''}`} aria-label="ACS Standalone App interface preview" role="img">
  <div className="window-bar"><i/><i/><i/><span>ACS / localhost:3141</span><b>● OpenClaw connected</b></div>
  <div className="app-shell">
   <aside><div className="app-logo"><img className="app-logo-mark" src="/assets/Axodus_logo.svg" alt="Axodus"/><b>ACS</b><small>CONTROL PLANE</small></div>{['Overview','Agents','Roles','Profiles','Skills','Plugins','Memory','Runtime','Logs'].map((x,i)=><div className={`side-item ${i===1?'active':''}`} key={x}><span>{['◇','⬡','⌁','◎','✦','⎔','◫','◉','≡'][i]}</span>{x}{i===1&&<em>3</em>}</div>)}<div className="workspace"><i>MB</i><span>local workspace<small>OpenClaw running</small></span></div></aside>
   <main><div className="crumb">Workspace <span>/</span> Agents</div><div className="app-title"><div><h3>Agents</h3><p>Configure, validate and operate agent instances.</p></div><button>＋ Create agent</button></div><div className="stat-row"><div><small>TOTAL AGENTS</small><strong>03</strong><span>2 configured</span></div><div><small>RUNNING</small><strong className="green">01</strong><span>Healthy runtime</span></div><div><small>VALIDATION</small><strong>02</strong><span>Ready to deploy</span></div></div><div className="list-head"><b>Agent instances</b><span>⌕ Search agents…</span></div><div className="agent-table"><div className="table-head"><span>AGENT</span><span>ROLE / PROFILE</span><span>CAPABILITIES</span><span>STATUS</span></div>{agents.map((a,i)=><div className="agent-row" key={a[2]}><span className="agent-name"><i>{a[0]}</i><b>{a[1]}<small>{a[2]}</small></b></span><span>Technical {i?'operator':'assistant'}<small>{a[2]}-profile</small></span><span><b>{6-i*2}</b> skills &nbsp; <b>{3-i}</b> plugins</span><span className={`status s${i}`}>● {a[3]}</span></div>)}</div>
  </main></div>
 </div>
}
