import * as Router from "react-router-dom";
import * as Api from "../../api/product-api";
import * as Shared from "../../shared";

export function GenericView({ view }: { view: Shared.View }) {
  return <>
    <Shared.DomainHeader domain="Administration" title={view} description={`${view} is unavailable because the Product API integration is pending.`} />
    <section className="resource-list"><div className="empty-state">No {view.toLowerCase()} records can be inspected until this Product API integration is available.</div></section>
  </>;
}

export function Runtime() {
  const runtimes = Shared.useOperationalSummary<Api.RuntimeSummary[]>(
    () => Api.productApi.listRuntimes(),
    "Unable to load runtime instances from Product API",
    () => false,
  );
  const workers = Shared.useOperationalSummary<Api.WorkerSummary[]>(
    () => Api.productApi.listWorkers(),
    "Unable to load workers from Product API",
    () => false,
  );
  return <>
    <Shared.DomainHeader domain="Operations" title="Runtime" description="Runtime instance and worker state reported by the Product API. Direct process access is not available in this milestone." entityLabel="Runtime inventory" actions={<button className="secondary" disabled={runtimes.loadState === "loading" || runtimes.loadState === "refreshing"} onClick={runtimes.refresh}>{runtimes.loadError ? "Retry" : runtimes.loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>} />
    <div className="guardrail-banner" role="note"><span>Inspection mode</span><span>Sandbox only</span><span>Read-only</span><span>Runtime state governed by Product API</span><span>Production ready = false</span></div>
    {Shared.staleBanner(runtimes, "runtime")}
    <div className="flow-group">
      <div className="flow-group-head"><h2>Runtime instances</h2><p>Deployment-backed runtime records with health, isolation, drift and reconciliation state.</p></div>
      <div className="dashboard-grid execution-grid">
        <section className="panel wide">
          <div className="panel-head"><div><h2>Runtime instances</h2><p>Read-only inventory from the Product API</p></div><Shared.Badge tone={runtimes.data?.length ? "good" : "muted"}>{runtimes.data?.length ?? 0}</Shared.Badge></div>
          <div className="panel-body">
            {runtimes.data?.length
              ? runtimes.data.map(item => <div className="catalog-row" key={item.runtimeId}><div className="catalog-row-main"><b>{item.runtimeId}</b><small>{item.status} · {item.health} · {item.target} · {item.engine}</small><p>reconciliation: {item.reconciliationState} · isolation: {item.isolationState} · drift: {item.driftState} · failure: {item.failureState}</p></div><div className="catalog-badges"><Shared.Badge tone={item.health === "healthy" ? "good" : item.health === "degraded" ? "warn" : "muted"}>{item.health}</Shared.Badge><Router.Link className="detail-link" to={`/agents/${item.agentId}`}>agent →</Router.Link></div></div>)
              : <Shared.PanelStateLine state={runtimes.loadState} error={runtimes.loadError} emptyMessage="No runtime instances recorded" />}
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head"><h2>Workers</h2><p>Worker health and reconciliation visibility for runtime execution.</p></div>
      <div className="dashboard-grid execution-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Workers</h2><p>Capacity and failure visibility</p></div><Shared.Badge tone={workers.data?.length ? "good" : "muted"}>{workers.data?.length ?? 0}</Shared.Badge></div>
          <div className="panel-body">
            {workers.data?.length
              ? workers.data.map(item => <div className="catalog-row" key={item.workerId}><div className="catalog-row-main"><b>{item.workerId}</b><small>{item.status} · {item.health} · capacity {item.availableCapacity}/{item.capacity}</small></div><Shared.Badge tone={item.health === "healthy" ? "good" : item.health === "degraded" ? "warn" : "muted"}>{item.failureState}</Shared.Badge></div>)
              : <Shared.PanelStateLine state={workers.loadState} error={workers.loadError} emptyMessage="No workers registered" />}
          </div>
        </section>
        <Shared.UnsupportedPanel title="Runtime control" note="Start, stop and direct process access" reason="Runtime control actions are not supported in this milestone. Runtime state is reported by the Product API and is never mutated from this surface." />
      </div>
    </div>
  </>;
}

export function Logs() {
  const { data: events, loadState, loadError, stale, refresh } = Shared.useOperationalSummary<Api.EventRecord[]>(
    () => Api.productApi.listEvents(),
    "Unable to load events from Product API",
    () => false,
  );
  return <>
    <Shared.DomainHeader domain="Evidence" title="Events & Logs" description="System and agent event inventory from the Product API. Logs remain diagnostic evidence, not primary operational state." actions={<button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>Refresh</button>} />
    <div className="guardrail-banner" role="note"><span>Inspection mode</span><span>Sandbox only</span><span>Production ready = false</span><span>Evidence governed by Product API</span><span>Not billing</span></div>
    {stale && <div className="stale-banner" role="status">Showing a stale evidence snapshot.</div>}
    {loadState === "refreshing" && <div className="refresh-banner" role="status">Refreshing evidence...</div>}
    {loadError && <div className="error-banner" role="alert">{loadError}</div>}
    <Shared.CrossLinks links={[{ to: "/operational-evidence", label: "Operational evidence" }, { to: "/audit", label: "Audit trail" }, { to: "/economics", label: "Economics" }]} />
    <section className="panel">
      <div className="panel-head"><div><h2>Events</h2><p>System and agent event inventory</p></div><Shared.Badge tone="muted">{events?.length ?? 0}</Shared.Badge></div>
      <div className="panel-body">
        <Shared.TimelineList limit={10} items={(events ?? []).map(event => ({ id: event.eventId, title: event.type, meta: `${event.severity} · ${event.source} · ${new Date(event.createdAt).toLocaleTimeString()}`, detail: event.message, tone: event.severity === "error" || event.severity === "critical" ? "warn" : undefined }))} />
      </div>
    </section>
  </>;
}

export function EvidenceView() {
  const { data: evidence, loadState, loadError, stale, refresh } = Shared.useOperationalSummary<Api.EvidenceRecord[]>(
    () => Api.productApi.listEvidence(),
    "Unable to load evidence from Product API",
    () => false,
  );
  const { data: diagnostics } = Shared.useOperationalSummary<Api.DiagnosticReport[]>(
    () => Api.productApi.listDiagnostics(),
    "Unable to load diagnostics from Product API",
    () => false,
  );
  return <>
    <Shared.DomainHeader domain="Evidence" title="Operational Evidence" description="Evidence records and diagnostic findings reported by the Product API. Evidence truth is never recomputed in the UI." actions={<button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>Refresh</button>} />
    <div className="guardrail-banner" role="note"><span>Inspection mode</span><span>Sandbox only</span><span>Production ready = false</span><span>Evidence governed by Product API</span></div>
    {Shared.staleBanner({ stale, loadState, loadError }, "evidence")}
    <Shared.CrossLinks links={[{ to: "/logs", label: "Events & logs" }, { to: "/audit", label: "Audit trail" }, { to: "/economics", label: "Economics" }]} />
    <div className="dashboard-grid evidence-grid">
      <section className="panel">
        <div className="panel-head"><div><h2>Evidence records</h2><p>Operational evidence inventory</p></div><Shared.Badge tone="muted">{evidence?.length ?? 0}</Shared.Badge></div>
        <div className="panel-body">
          <Shared.TimelineList limit={10} items={(evidence ?? []).map(item => ({ id: item.evidenceId, title: item.title, meta: `${item.kind} · ${item.source} · ${new Date(item.createdAt).toLocaleTimeString()}`, detail: item.summary }))} />
        </div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Diagnostics</h2><p>Readiness diagnostics and recommended actions</p></div><Shared.Badge tone="muted">{diagnostics?.length ?? 0}</Shared.Badge></div>
        <div className="panel-body">
          <Shared.TimelineList limit={10} items={(diagnostics ?? []).map(item => ({ id: item.diagnosticId, title: item.status, meta: new Date(item.createdAt).toLocaleTimeString(), detail: item.summary, tone: item.status === "pass" ? "good" : item.status === "fail" || item.status === "error" ? "warn" : "muted" }))} />
        </div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Traceability</h2><p>Follow the operational flow</p></div></div>
        <div className="panel-body">
          <p className="panel-note">Evidence links Agents → Composition → Execution → Economics. Each surface renders Product API projections only.</p>
          <Shared.CrossLinks links={[{ to: "/agents", label: "Agents" }, { to: "/operational-execution", label: "Execution" }, { to: "/economics", label: "Economics" }]} />
        </div>
      </section>
    </div>
  </>;
}

export function AuditView() {
  const { data: audit, loadState, loadError, stale, refresh } = Shared.useOperationalSummary<Api.AuditEntry[]>(
    () => Api.productApi.listAuditEntries(),
    "Unable to load audit trail from Product API",
    () => false,
  );
  return <>
    <Shared.DomainHeader domain="Evidence" title="Audit Trail" description="Governed operations and audit evidence from the Product API. Audit truth is never recomputed in the UI." actions={<button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>Refresh</button>} />
    <div className="guardrail-banner" role="note"><span>Inspection mode</span><span>Sandbox only</span><span>Read-only</span><span>Audit truth governed by Product API</span></div>
    {Shared.staleBanner({ stale, loadState, loadError }, "audit")}
    <Shared.CrossLinks links={[{ to: "/logs", label: "Events & logs" }, { to: "/operational-evidence", label: "Evidence" }, { to: "/economics", label: "Economics" }]} />
    <section className="panel">
      <div className="panel-head"><div><h2>Audit entries</h2><p>Governed operations history</p></div><Shared.Badge tone="muted">{audit?.length ?? 0}</Shared.Badge></div>
      <div className="panel-body">
        <Shared.TimelineList limit={12} items={(audit ?? []).map(entry => ({ id: entry.auditId, title: entry.operation, meta: `${entry.status} · ${entry.actor} · ${entry.entityType}:${entry.entityId} · ${new Date(entry.createdAt).toLocaleTimeString()}`, detail: entry.message, tone: entry.status === "failure" ? "warn" : entry.status === "success" ? "good" : "muted" }))} />
      </div>
    </section>
  </>;
}
