const layers=[
 ['Control plane','CURRENT','Agents · Profiles · Skills · Plugins'],
 ['Coordination','IN DEVELOPMENT','Deterministic workflows · Provider routing'],
 ['Policy boundary','IN DEVELOPMENT','Permissions · approvals · sandbox'],
 ['Evidence layer','IMPLEMENTED IN CORE','Receipts · telemetry · idempotency'],
]

export function CoreEvolution(){return <div className="core-evolution-visual">
  <div className="core-rail"><span>OPERATOR</span><i/><b>ACS CORE</b><i/><span>OPENCLAW</span></div>
  <div className="layer-stack">{layers.map(([title,state,detail],i)=><article key={title}>
    <span>{String(i+1).padStart(2,'0')}</span><div><b>{title}</b><small>{detail}</small></div><em className={state==='CURRENT'?'current':''}>{state}</em>
  </article>)}</div>
  <div className="core-caption"><span>PUBLIC PRODUCT</span><p>Agent Control System</p><i>operates through</i><span>EVOLVING CORE</span><p>Autonomous coordination primitives</p></div>
 </div>}

export function WorkflowEvidence(){return <div className="evidence-grid">
  <div className="workflow-track"><div className="track-head"><span>WORKFLOW / dev-coordination</span><em>workflowRunId: stable</em></div>{[['01','Request','accepted'],['02','Policy','evaluated'],['03','Capability','matched'],['04','Agent','routed'],['05','Receipt','written']].map(([n,t,s],i)=><div className="track-step" key={t}><span>{n}</span><b>{t}</b><i>{i<4?'→':'✓'}</i><em>{s}</em></div>)}</div>
  <div className="receipt-card"><div><span>EXECUTION RECEIPT</span><em>COMPLETED</em></div><code>{`{\n  "workflowId": "dev-coordination",\n  "status": "completed",\n  "policy": "bounded-default",\n  "steps": 4,\n  "telemetryIds": [ ... ]\n}`}</code><p>Every bounded run produces evidence instead of hidden side effects.</p></div>
 </div>}
