import * as React from "react";
import * as Router from "react-router-dom";
import * as Icons from "@phosphor-icons/react";
import * as Api from "../../api/product-api";
import * as Shared from "../../shared";

const AGENT_OPERATIONAL_PAGE_LIMIT = 50;
const AGENT_OPERATIONAL_MAX_OFFSET = 10_000;

function readAgentOperationalOffset(value: string | null): number {
  if (!value || !/^(0|[1-9][0-9]*)$/.test(value)) return 0;
  const offset = Number(value);
  return Number.isSafeInteger(offset) && offset <= AGENT_OPERATIONAL_MAX_OFFSET ? offset : 0;
}

function formatRunDuration(value: number | undefined): string {
  if (value === undefined || value < 0) return "unavailable";
  if (value < 1_000) return `${value} ms`;
  if (value < 60_000) return `${(value / 1_000).toFixed(value % 1_000 === 0 ? 0 : 1)} s`;
  const minutes = Math.floor(value / 60_000);
  const seconds = Math.floor((value % 60_000) / 1_000);
  return `${minutes}m ${seconds}s`;
}

function AgentOperationalPagination({ offset, returned, onPage }: { offset: number; returned: number; onPage: (offset: number) => void }) {
  const firstRecord = offset + 1;
  const lastRecord = offset + returned;
  const nextAvailable = returned === AGENT_OPERATIONAL_PAGE_LIMIT && offset + AGENT_OPERATIONAL_PAGE_LIMIT <= AGENT_OPERATIONAL_MAX_OFFSET;

  return <nav className="agent-operational-pagination" aria-label="Operational record pagination">
    <span className="pagination-summary">
      {returned > 0 ? `Showing records ${firstRecord}–${lastRecord}` : `Page starting at record ${firstRecord}`}
    </span>
    <div className="pagination-actions">
      <button className="secondary" disabled={offset === 0} onClick={() => onPage(Math.max(0, offset - AGENT_OPERATIONAL_PAGE_LIMIT))}>Previous</button>
      <button className="secondary" disabled={!nextAvailable} onClick={() => onPage(offset + AGENT_OPERATIONAL_PAGE_LIMIT)}>Next</button>
    </div>
  </nav>;
}

function parseList(value: string): string[] {
  return value.split(",").map(item => item.trim()).filter(Boolean);
}

function AgentFormSection({ title, description, tier, open = false, children }: { title: string; description: string; tier: string; open?: boolean; children: React.ReactNode }) {
  return <details className="disclosure agent-form-section" open={open}>
    <summary>
      <div><b>{title}</b><small>{description}</small></div>
      <span className="disclosure-tier">{tier}</span>
    </summary>
    <div className="disclosure-body">{children}</div>
  </details>;
}

function AgentCard({ agent }: { agent: Api.AgentListItem }) {
  return <article className={`agent-card inventory-card ${agent.archived ? "archived" : ""}`}>
    <div className="card-title">
      <span className={`avatar ${agent.archived ? "gray" : ""}`}>{agent.name.slice(0, 2).toUpperCase()}</span>
      <div><h2>{agent.name}</h2><p className="mono">{agent.agentId} · {agent.environment}</p></div>
      <div className="card-badges"><Shared.Status status={agent.status} />{agent.archived && <Shared.Badge tone="muted">archived</Shared.Badge>}</div>
    </div>
    <div className="card-specs">
      <span>Revision<b className="mono">r{agent.currentRevisionId}</b></span>
      <span>Readiness<b><Shared.ReadinessBadge summary={agent.readinessSummary} /></b></span>
      <span>Deployment<b>{agent.deploymentSummary.state}</b></span>
      <span>Runtime<b>{agent.runtimeSummary.state}</b></span>
    </div>
    <div className="cap-row">
      <span>{agent.compositionSummary.ready ? "composition ready" : `composition blocked (${agent.compositionSummary.errorCount} errors)`}</span>
      <span>{agent.readinessSummary.blockerCount} blockers</span>
      <span>{agent.readinessSummary.warningCount} warnings</span>
    </div>
    <div className="card-actions">
      <Router.Link className="secondary action-link" to={`/agents/${agent.agentId}`}>Open agent</Router.Link>
      <span className="checked-at">checked {new Date(agent.checkedAt).toLocaleTimeString()}</span>
    </div>
  </article>;
}

export function AgentInventory() {
  const { data: agents, loadState, loadError, stale, refresh } = Shared.useOperationalSummary<Api.AgentListItem[]>(
    () => Api.productApi.listAgents(),
    "Unable to load agents from Product API",
    list => list.some(agent => agent.checkedAt < Date.now() - 60_000),
  );
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [sort, setSort] = React.useState<"name" | "updatedAt" | "status">("name");

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
    <Shared.DomainHeader domain="Agents" title="Agent Inventory" description="Search, review and manage governed agents across lifecycle, readiness, deployment and runtime." actions={
      <>
        <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadError ? "Retry" : loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
        <Router.Link className="primary action-link" to="/agents/new">＋ Create agent</Router.Link>
      </>
    } />
    <div className="guardrail-banner compact" role="note"><span>Sandbox · Inspection mode</span></div>
    {stale && <div className="stale-banner" role="status">Showing a stale agent snapshot. Refresh to recover live state.</div>}
    {loadState === "refreshing" && <div className="refresh-banner" role="status">Refreshing agents...</div>}
    {loadError && <div className="error-banner" role="alert">{loadError}</div>}
    <div className="toolbar agents-toolbar">
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
    {agents && agents.length === 0 && <section className="panel"><div className="empty-state">No agents registered yet. <Router.Link className="surface-link" to="/agents/new">Create the first agent →</Router.Link></div></section>}
    {agents && agents.length > 0 && filtered.length === 0 && <section className="panel"><div className="empty-state">No agents match your search or filters.</div></section>}
    {filtered.length > 0 && <section className="agent-cards inventory-grid">{filtered.map(agent => <AgentCard key={agent.agentId} agent={agent} />)}</section>}
  </>;
}

export function useAgentSurface(agentId: string) {
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [data, setData] = React.useState<{
    detail: Api.AgentDetail;
    revisions: Api.AgentRevisionSummary[];
    lifecycle: Api.AgentLifecycleStateView;
  } | null>(null);
  const [loadState, setLoadState] = React.useState<Shared.DashboardLoadState>("loading");
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [stale, setStale] = React.useState(false);
  const hasDataRef = React.useRef(false);

  React.useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    setLoadState(hasDataRef.current ? "refreshing" : "loading");
    Promise.all([
      Api.productApi.getAgent(agentId),
      Api.productApi.getAgentRevisions(agentId),
      Api.productApi.getAgentLifecycle(agentId),
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
            setLoadError(Shared.apiErrorMessage(error));
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

export function OperationalExecution() {
  const credentials = Shared.useOperationalSummary<Api.CredentialSummary[]>(
    () => Api.productApi.listCredentials(),
    "Unable to load credentials",
    () => false,
  );
  const connections = Shared.useOperationalSummary<Api.ProviderConnectionSummary[]>(
    () => Api.productApi.listProviderConnections(),
    "Unable to load provider connections",
    () => false,
  );
  const readiness = Shared.useOperationalSummary<Api.AgentReadinessDetail>(
    async () => {
      const agents = await Api.productApi.listAgents();
      const agent = agents.find(item => !item.archived) ?? agents[0];
      if (!agent) throw new Error("No agent available for readiness planning context");
      return Api.productApi.getAgentReadiness(agent.agentId);
    },
    "Unable to load operational readiness",
    data => data.stale,
  );
  const plans = Shared.useOperationalSummary<[Api.DeploymentPlan | null, Api.ExecutionPlan | null]>(
    async () => {
      const agents = await Api.productApi.listAgents();
      const agent = agents.find(item => !item.archived) ?? agents[0];
      if (!agent) return [null, null];
      return [await Api.productApi.getAgentDeploymentPlan(agent.agentId), await Api.productApi.getAgentExecutionPlan(agent.agentId)];
    },
    "Unable to load deployment planning",
    () => false,
  );
  const deployments = Shared.useOperationalSummary<Api.DeploymentSummary[]>(
    () => Api.productApi.listDeployments(),
    "Unable to load deployments",
    () => false,
  );
  const runtimes = Shared.useOperationalSummary<Api.RuntimeSummary[]>(
    () => Api.productApi.listRuntimes(),
    "Unable to load runtimes",
    () => false,
  );
  const runs = Shared.useOperationalSummary<Api.ExecutionRunSummary[]>(
    () => Api.productApi.listExecutionRuns(),
    "Unable to load execution runs",
    () => false,
  );
  const workers = Shared.useOperationalSummary<Api.WorkerSummary[]>(
    () => Api.productApi.listWorkers(),
    "Unable to load workers",
    () => false,
  );

  const refreshAll = () => {
    credentials.refresh();
    connections.refresh();
    readiness.refresh();
    plans.refresh();
    deployments.refresh();
    runtimes.refresh();
    runs.refresh();
    workers.refresh();
  };

  return <>
    <Shared.DomainHeader domain="Operations" title="Governed execution surface" description="Read-only operational projections from the Product API. No raw secrets or direct runtime access." entityLabel={readiness.data ? `Planning context: ${readiness.data.agentId ?? readiness.data.agentName}` : "Aggregate operations"} actions={<button className="secondary" onClick={refreshAll}>Refresh all</button>} />
    <Shared.OperationalModeNotice guardrails={credentials.data?.[0]?.guardrails ?? connections.data?.[0]?.guardrails} />
    {staleBanner(credentials, "credentials")}
    <Shared.SectionDisclosure title="Access & connections" summary="Secondary visibility for credentials and provider connectivity; never primary operational state." tier="Secondary" defaultOpen>
    <div className="flow-group">
      <div className="flow-group-head"><h2>Access & connections</h2><p>Credentials and provider connections — redacted references only, never secret material.</p></div>
      <div className="dashboard-grid execution-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Credentials</h2><p>Redacted secret references and validation state</p></div><Shared.Badge tone={credentials.data?.length ? "good" : "muted"}>{credentials.data?.length ?? 0}</Shared.Badge></div>
          <div className="panel-body">
            {credentials.data?.length
              ? credentials.data.map(item => <div className="catalog-row" key={item.credentialId}><div className="catalog-row-main"><b>{item.providerName}</b><small className="mono">{item.credentialId}</small><p>{item.secretRefRedacted} · {item.status} · validated={String(item.validated)}</p></div><Shared.Badge tone={item.validated ? "good" : "warn"}>{item.validated ? "validated" : "unvalidated"}</Shared.Badge></div>)
              : <Shared.PanelStateLine state={credentials.loadState} error={credentials.loadError} emptyMessage="No credentials reported" />}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Provider connections</h2><p>Health and authentication state</p></div><Shared.Badge tone={connections.data?.length ? "good" : "muted"}>{connections.data?.length ?? 0}</Shared.Badge></div>
          <div className="panel-body">
            {connections.data?.length
              ? connections.data.map(item => <div className="catalog-row" key={item.connectionId}><div className="catalog-row-main"><b>{item.providerName}</b><small className="mono">{item.connectionId}</small><p>{item.health} · {item.authState} · {item.availability}</p></div><Shared.Badge tone={item.health === "healthy" ? "good" : item.health === "degraded" ? "warn" : "muted"}>{item.health}</Shared.Badge></div>)
              : <Shared.PanelStateLine state={connections.loadState} error={connections.loadError} emptyMessage="No provider connections reported" />}
          </div>
        </section>
      </div>
    </div>
    </Shared.SectionDisclosure>
    <div className="flow-group">
      <div className="flow-group-head"><h2>Readiness & planning</h2><p>Operational readiness and deployment previews for the selected planning context — Product API is the source of truth.</p></div>
      <div className="dashboard-grid execution-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Operational readiness</h2><p>Readiness categories and blockers</p></div><Shared.Badge tone={readiness.data?.ready ? "good" : "warn"}>{readiness.data?.status ?? "unavailable"}</Shared.Badge></div>
          <div className="panel-body">
            {readiness.data
              ? <>
                <Shared.SummaryRow label="Agent" value={readiness.data.agentName} />
                <Shared.SummaryRow label="Blockers" value={readiness.data.blockers.length} />
                <Shared.SummaryRow label="Warnings" value={readiness.data.warnings.length} />
                {readiness.data.categories.map(category => <div className="finding-row" key={category.id}><span>{category.status}</span><div className="finding-content"><b>{category.label}</b><p>{category.blockerCount} blockers · {category.warningCount} warnings</p></div></div>)}
              </>
              : <Shared.PanelStateLine state={readiness.loadState} error={readiness.loadError} emptyMessage="No readiness data for the current planning context" />}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Deployment plan</h2><p>Preview only, governed by Product API</p></div><Shared.Badge tone={plans.data?.[0]?.eligible ? "good" : "muted"}>{plans.data?.[0]?.eligible ? "eligible" : "preview"}</Shared.Badge></div>
          <div className="panel-body">
            {plans.data?.[0]
              ? <><Shared.SummaryRow label="Plan" value={plans.data[0].planId} /><Shared.SummaryRow label="Target" value={plans.data[0].target} /><Shared.SummaryRow label="Engine" value={plans.data[0].engine} /><Shared.SummaryRow label="Eligible" value={String(plans.data[0].eligible)} /><Shared.SummaryRow label="Blockers" value={plans.data[0].blockers.length} /></>
              : <Shared.PanelStateLine state={plans.loadState} error={plans.loadError} emptyMessage="No deployment plan available" />}
          </div>
        </section>
      </div>
    </div>
    <Shared.SectionDisclosure title="Deployments, runtimes & execution history" summary="Diagnostic operational records stay reachable without dominating the entry surface." tier="Diagnostic" defaultOpen>
    <div className="flow-group">
      <div className="flow-group-head"><h2>Deployments & runtimes</h2><p>Deployment records, runtime instances and execution runs. Runtime control actions are not exposed in this milestone.</p></div>
      <div className="dashboard-grid execution-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Deployments</h2><p>Sandbox deployment inventory</p></div><Shared.Badge tone={deployments.data?.length ? "good" : "muted"}>{deployments.data?.length ?? 0}</Shared.Badge></div>
          <div className="panel-body">
            {deployments.data?.length
              ? deployments.data.map(item => <div className="catalog-row" key={item.deploymentId}><div className="catalog-row-main"><b>{item.deploymentId}</b><small>{item.status} · {item.engine} · {item.target}</small></div><div className="catalog-badges"><Shared.Badge tone={item.active ? "good" : "muted"}>{item.active ? "active" : "inactive"}</Shared.Badge><Router.Link className="detail-link" to={`/agents/${item.agentId}`}>agent</Router.Link></div></div>)
              : <Shared.PanelStateLine state={deployments.loadState} error={deployments.loadError} emptyMessage="No deployments recorded" />}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Runtimes</h2><p>Runtime inventory, health and reconciliation</p></div><Shared.Badge tone={runtimes.data?.length ? "good" : "muted"}>{runtimes.data?.length ?? 0}</Shared.Badge></div>
          <div className="panel-body">
            {runtimes.data?.length
              ? runtimes.data.map(item => <div className="catalog-row" key={item.runtimeId}><div className="catalog-row-main"><b>{item.runtimeId}</b><small>{item.status} · {item.health} · {item.target}</small><p>reconciliation: {item.reconciliationState} · isolation: {item.isolationState} · drift: {item.driftState}</p></div><div className="catalog-badges"><Shared.Badge tone={item.health === "healthy" ? "good" : item.health === "degraded" ? "warn" : "muted"}>{item.health}</Shared.Badge><Router.Link className="detail-link" to={`/agents/${item.agentId}`}>agent</Router.Link></div></div>)
              : <Shared.PanelStateLine state={runtimes.loadState} error={runtimes.loadError} emptyMessage="No runtime instances" />}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Execution runs</h2><p>ExecutionRun history — recent first</p></div><Shared.Badge tone={runs.data?.length ? "good" : "muted"}>{runs.data?.length ?? 0}</Shared.Badge></div>
          <div className="panel-body">
            {runs.data?.length
              ? runs.data.slice(0, 8).map(item => <div className="catalog-row" key={item.runId}><div className="catalog-row-main"><b>{item.runId}</b><small>{item.status} · runtime {item.runtimeId}</small><p>{item.resultSummary ?? item.failureReason ?? "n/a"}</p></div><span className="catalog-count">{new Date(item.startedAt).toLocaleTimeString()}</span></div>)
              : <Shared.PanelStateLine state={runs.loadState} error={runs.loadError} emptyMessage="No execution runs recorded" />}
          </div>
        </section>
      </div>
    </div>
    </Shared.SectionDisclosure>
    <Shared.SectionDisclosure title="Workers & raw operational identifiers" summary="Expert investigation details and low-level inventory." tier="Raw">
    <div className="flow-group">
      <div className="flow-group-head"><h2>Workers</h2><p>Worker capacity, health and isolation visibility. Advanced fleet scheduling is future scope.</p></div>
      <div className="dashboard-grid execution-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Workers</h2><p>Capacity, health and workload visibility</p></div><Shared.Badge tone={workers.data?.length ? "good" : "muted"}>{workers.data?.length ?? 0}</Shared.Badge></div>
          <div className="panel-body">
            {workers.data?.length
              ? workers.data.map(item => <div className="catalog-row" key={item.workerId}><div className="catalog-row-main"><b>{item.workerId}</b><small>{item.status} · {item.health} · capacity {item.availableCapacity}/{item.capacity}</small><p>failure: {item.failureState} · reconciliation: {item.reconciliationState} · tenant isolation: {item.tenantIsolation ? "yes" : "no"} · workload isolation: {item.workloadIsolation ? "yes" : "no"}</p></div><Shared.Badge tone={item.health === "healthy" ? "good" : item.health === "degraded" ? "warn" : "muted"}>{item.reconciliationState}</Shared.Badge></div>)
              : <Shared.PanelStateLine state={workers.loadState} error={workers.loadError} emptyMessage="No workers registered" />}
          </div>
        </section>
        <Shared.UnsupportedPanel title="Worker operations" note="Fleet controls in this milestone" reason="Worker registration, autoscaling and advanced fleet scheduling are future scope. Worker state is displayed from the Product API and is never mutated from this surface." />
      </div>
    </div>
    <div className="flow-group-note">Every block above is a read-only projection. Deployment, runtime, worker and readiness truth stays in the Product API — nothing here is recomputed by the UI.</div>
    </Shared.SectionDisclosure>
  </>;
}

function staleBanner(state: { stale: boolean; loadState: Shared.DashboardLoadState; loadError: string | null }, subject: string) {
  return <>
    {state.stale && <div className="stale-banner" role="status">Showing a stale {subject} snapshot. Refresh to recover live state.</div>}
    {state.loadState === "refreshing" && <div className="refresh-banner" role="status">Refreshing {subject}...</div>}
    {state.loadError && <div className="error-banner" role="alert">{state.loadError}</div>}
  </>;
}

function IdList({ label, ids }: { label: string; ids: readonly string[] }) {
  if (ids.length === 0) return null;
  return <div className="id-list"><span>{label}</span><div>{ids.map(id => <code key={id} className="mono">{id}</code>)}</div></div>;
}

function OperationResultBox({ result }: { result: Api.AgentOperationResult }) {
  return <div className={`operation-result ${result.ok ? "ok" : "failed"}`} role="status">
    <div className="operation-result-head"><b>{result.ok ? "Operation succeeded" : "Operation failed"}</b><code className="mono">{result.operation}</code></div>
    <p>{result.message}</p>
    <dl className="config-list">
      <div><dt>Entity</dt><dd className="mono">{result.entityId}</dd></div>
      <div><dt>Shared.Status</dt><dd>{result.status}</dd></div>
      <div><dt>Audit ref</dt><dd className="mono">{result.auditRef ?? "—"}</dd></div>
      <div><dt>Checked at</dt><dd><Shared.Time value={result.checkedAt} /></dd></div>
    </dl>
    {result.warnings.length > 0 && <div className="warning-banner">{result.warnings.join("; ")}</div>}
    {result.errors.length > 0 && <div className="error-banner">{result.errors.join("; ")}</div>}
  </div>;
}

export function AgentDetail() {
  const { agentId } = Router.useParams();
  const navigate = Router.useNavigate();
  const { data, loadState, loadError, stale, refresh } = useAgentSurface(agentId ?? "");
  const [confirming, setConfirming] = React.useState<Api.AgentLifecycleActionView | null>(null);
  const [duplicateOpen, setDuplicateOpen] = React.useState(false);
  const [duplicateAgentId, setDuplicateAgentId] = React.useState("");
  const [duplicateName, setDuplicateName] = React.useState("");
  const [duplicateError, setDuplicateError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState<Api.AgentLifecycleActionName | null>(null);
  const [operationResult, setOperationResult] = React.useState<Api.AgentOperationResult | null>(null);
  const [operationError, setOperationError] = React.useState<string | null>(null);

  if (!agentId) return <Router.Navigate to="/agents" replace />;

  const detail = data?.detail ?? null;

  async function runDirectAction(action: Api.AgentLifecycleActionView) {
    if (!detail) return;
    setSubmitting(action.action);
    setOperationError(null);
    setOperationResult(null);
    try {
      let result: Api.AgentOperationResult;
      if (action.action === "archive") {
        result = await Api.productApi.archiveAgent(detail.agentId);
      } else if (action.action === "restore") {
        result = await Api.productApi.restoreAgent(detail.agentId);
      } else if (action.action === "delete") {
        result = await Api.productApi.deleteAgent(detail.agentId);
      } else {
        return;
      }
      setOperationResult(result);
      refresh();
    } catch (error) {
      setOperationError(Shared.apiErrorMessage(error));
    } finally {
      setSubmitting(null);
    }
  }

  async function handleRevisionAction(action: "adopt" | "restore", revision: Api.AgentRevisionSummary) {
    if (!detail) return;
    setSubmitting(action === "adopt" ? "adoptRevision" : "restoreRevision");
    setOperationError(null);
    setOperationResult(null);
    try {
      const result = action === "adopt"
        ? await Api.productApi.adoptAgentRevision(detail.agentId, revision.revisionId)
        : await Api.productApi.restoreAgentRevision(detail.agentId, revision.revisionId);
      setOperationResult(result);
      refresh();
    } catch (error) {
      setOperationError(Shared.apiErrorMessage(error));
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
      const input: Api.AgentDuplicateInput = { newAgentId: duplicateAgentId.trim() };
      if (duplicateName.trim()) input.name = duplicateName.trim();
      const result = await Api.productApi.duplicateAgent(detail.agentId, input);
      setOperationResult(result);
      setDuplicateOpen(false);
      setDuplicateAgentId("");
      setDuplicateName("");
      refresh();
    } catch (error) {
      setDuplicateError(Shared.apiErrorMessage(error));
    } finally {
      setSubmitting(null);
    }
  }

  function handleActionClick(action: Api.AgentLifecycleActionView) {
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
    <Router.Link className="back" to="/agents">← Agents</Router.Link>
    <section className="panel"><div className="empty-state">{loadError ?? "Agent not found"}</div></section>
  </>;
  if (!detail || !data) return <div className="empty-state">Agent not found</div>;

  const definition = detail.agentDefinition;
  const lifecycle = detail.lifecycleState;
  const currentDetail = detail;
  const revisions = [...data.revisions].sort((left, right) => right.revisionNumber - left.revisionNumber);
  const recentHistoricalRevisions = revisions.filter(revision => revision.status !== "current").slice(0, 2);

  function renderNextSafeAction() {
    if (lifecycle.archived) {
      const restore = currentDetail.availableActions.find(action => action.action === "restore");
      return restore?.available
        ? <button className="primary" disabled={submitting !== null} onClick={() => void handleActionClick(restore)}>Restore Agent</button>
        : <Router.Link className="primary action-link" to={`/agents/${currentDetail.agentId}/revisions`}>Review revision history</Router.Link>;
    }
    if (currentDetail.readinessSummary.blockerCount > 0 || currentDetail.readinessSummary.state !== "ready") {
      return <Router.Link className="primary action-link" to={`/agents/${currentDetail.agentId}/validate`}>Validate configuration</Router.Link>;
    }
    return <Router.Link className="primary action-link" to={`/agents/${currentDetail.agentId}/configuration`}>Edit configuration</Router.Link>;
  }

  return <>
    <Shared.DomainHeader domain="Agents" title={definition.name} description="Agent lifecycle, readiness and related evidence." entityLabel={`Agent: ${detail.agentId}`} />
    {loadError && <div className="error-banner" role="alert">{loadError}</div>}
    {stale && <div className="stale-banner" role="status">Showing a stale agent snapshot. Refresh to recover live state.</div>}
    {loadState === "refreshing" && <div className="refresh-banner" role="status">Refreshing agent state...</div>}
    <Shared.AgentGuardrailBanner guardrails={detail.guardrails} />
    <section className="overview-hero">
      <div>
        <p className="eyebrow">AGENT OVERVIEW</p>
        <div className="title-status"><h2>{definition.name}</h2><Shared.Status status={lifecycle.status} /></div>
        <p className="mono">{detail.agentId} · current revision r{detail.currentRevision.revision}</p>
      </div>
      <div className="overview-hero-actions">
        <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
      </div>
    </section>
    <div className="overview-grid">
      <section className="panel overview-primary">
        <div className="panel-head"><div><h2>Current state</h2><p>ACS-owned identity and lifecycle state</p></div><Shared.Status status={lifecycle.status} /></div>
        <dl className="config-list">
          <div><dt>Agent ID</dt><dd className="mono">{definition.agentId}</dd></div>
          <div><dt>Lifecycle</dt><dd>{lifecycle.archived ? "Archived" : lifecycle.status}</dd></div>
          <div><dt>Protected</dt><dd>{lifecycle.protected ? "Yes" : "No"}</dd></div>
          {lifecycle.archivedAt !== undefined && <div><dt>Archived at</dt><dd><Shared.Time value={lifecycle.archivedAt} /></dd></div>}
          {lifecycle.restoredAt !== undefined && <div><dt>Restored at</dt><dd><Shared.Time value={lifecycle.restoredAt} /></dd></div>}
        </dl>
      </section>
      <section className="panel overview-primary">
        <div className="panel-head"><div><h2>Current revision</h2><p>Canonical immutable revision head</p></div><Shared.Badge tone="good">CURRENT r{detail.currentRevision.revision}</Shared.Badge></div>
        <dl className="config-list">
          <div><dt>Revision</dt><dd className="mono">r{detail.currentRevision.revision}</dd></div>
          <div><dt>Updated</dt><dd><Shared.Time value={detail.currentRevision.updatedAt} /></dd></div>
          <div><dt>Changed by</dt><dd>{detail.currentRevision.createdBy ?? "unknown"}</dd></div>
        </dl>
        <div className="panel-actions"><Router.Link className="secondary action-link" to={`/agents/${detail.agentId}/revisions`}>Shared.View revision history</Router.Link><Router.Link className="detail-link" to={`/agents/${detail.agentId}/configuration`}>Configuration</Router.Link></div>
      </section>
      <section className="panel overview-primary">
        <div className="panel-head"><div><h2>Readiness</h2><p>Composition and configuration status</p></div><Shared.ReadinessBadge summary={detail.readinessSummary} /></div>
        <dl className="config-list">
          <div><dt>State</dt><dd>{detail.readinessSummary.state}</dd></div>
          <div><dt>Blockers</dt><dd>{detail.readinessSummary.blockerCount}</dd></div>
          <div><dt>Warnings</dt><dd>{detail.readinessSummary.warningCount}</dd></div>
        </dl>
        <p className="panel-note">Detailed findings remain in Validate; this summary is not recomputed in the browser.</p>
        <Router.Link className="surface-link" to={`/agents/${detail.agentId}/validate`}>Open Validate →</Router.Link>
      </section>
      <section className="panel overview-primary">
        <div className="panel-head"><div><h2>Next safe action</h2><p>Selected from current lifecycle and readiness state</p></div></div>
        {lifecycle.archived
          ? <p className="panel-note">Archived Agents cannot be edited or receive revisions until restored.</p>
          : detail.readinessSummary.blockerCount > 0 || detail.readinessSummary.state !== "ready"
            ? <p className="panel-note">Review Product API readiness findings before changing operational context.</p>
            : <p className="panel-note">Configuration changes create a new immutable revision and retain the current head until saved.</p>}
        <div className="panel-actions">{renderNextSafeAction()}</div>
      </section>
      <section className="panel overview-secondary">
        <div className="panel-head"><div><h2>Deployment and runtime context</h2><p>Related operational state; distinct from Agent lifecycle</p></div></div>
        <dl className="config-list">
          <div><dt>Deployment</dt><dd>{detail.deploymentSummary.state} · {detail.deploymentSummary.count} records</dd></div>
          <div><dt>Runtime</dt><dd>{detail.runtimeSummary.state} · {detail.runtimeSummary.count} instances</dd></div>
        </dl>
        <p className="panel-note">Operational controls and execution history remain in their canonical global surfaces.</p>
      </section>
      <section className="panel overview-secondary">
        <div className="panel-head"><div><h2>Recent revision context</h2><p>Lineage remains immutable; historical revisions are not editable in place</p></div><Router.Link className="detail-link" to={`/agents/${detail.agentId}/revisions`}>All revisions</Router.Link></div>
        <div className="overview-revision-summary">
          <div><b className="mono">r{detail.currentRevision.revision}</b><Shared.Badge tone="good">CURRENT</Shared.Badge><small>Updated <Shared.Time value={detail.currentRevision.updatedAt} /></small></div>
          {recentHistoricalRevisions.map(revision => <div key={revision.revisionId}>
            <b className="mono">r{revision.revisionNumber}</b><Shared.Badge tone="muted">HISTORICAL</Shared.Badge>
            <small>Created <Shared.Time value={revision.createdAt} /> · read-only record</small>
            <span className="overview-revision-actions">{revision.availableActions.map(action => <button key={action.action} className="secondary" disabled={!action.available || submitting !== null} title={action.reason} onClick={() => void handleRevisionAction(action.action, revision)}>{action.action === "adopt" ? "Adopt" : "Restore"}</button>)}</span>
          </div>)}
        </div>
      </section>
      <section className="panel overview-secondary">
        <div className="panel-head"><div><h2>Governed lifecycle actions</h2><p>Only existing Product API commands are exposed</p></div></div>
        <div className="action-grid overview-action-grid">
          {detail.availableActions.filter(action => ["duplicate", "archive", "restore", "delete"].includes(action.action)).map(action => {
            const destructive = action.action === "archive" || action.action === "delete";
            return <div className={`action-tile ${action.available ? "" : "disabled"} ${destructive ? "destructive" : ""}`} key={action.action}>
              <b>{action.label}</b>
              {action.reason && <small className="action-reason">{action.reason}</small>}
              {action.available
                ? <button className={`secondary ${destructive ? "danger" : ""}`} disabled={submitting !== null} onClick={() => handleActionClick(action)}>{destructive ? `Confirm ${action.action}` : action.action === "duplicate" ? "Duplicate" : "Restore Agent"}</button>
                : <span className="unavailable">Unavailable</span>}
            </div>;
          })}
        </div>
      </section>
      <section className="panel overview-secondary">
        <div className="panel-head"><div><h2>Technical context</h2><p>Provider, model, composition and diagnostics are secondary to Agent identity</p></div><Shared.Badge tone="muted">advanced</Shared.Badge></div>
        <p className="panel-note">Technical bindings remain available without redefining this Agent by provider, model or runtime.</p>
        <div className="panel-actions"><Router.Link className="secondary action-link" to={`/agents/${detail.agentId}/advanced`}>Open Advanced</Router.Link><Router.Link className="detail-link" to={`/agents/${detail.agentId}/composition`}>Composition detail</Router.Link></div>
      </section>
    </div>
    {duplicateOpen && detail && (
      <section className="panel duplicate-form">
        <div><b>Duplicate {detail.agentId}</b><p className="panel-note">Creates a separate Agent identity through the existing Product API command.</p></div>
        <div className="form">
          <label>New agent ID<input className="mono" value={duplicateAgentId} onChange={e => setDuplicateAgentId(e.target.value)} placeholder="e.g. morpheus-copy" /></label>
          <label>Name (optional)<input value={duplicateName} onChange={e => setDuplicateName(e.target.value)} placeholder={definition.name} /></label>
        </div>
        {duplicateError && <div className="error-banner" role="alert">{duplicateError}</div>}
        <div className="confirm-actions">
          <button className="secondary" onClick={() => { setDuplicateOpen(false); setDuplicateError(null); }}>Cancel</button>
          <button className="primary" disabled={submitting !== null || !duplicateAgentId.trim()} onClick={() => void handleDuplicate()}>Duplicate</button>
        </div>
      </section>
    )}
    {operationResult && <OperationResultBox result={operationResult} />}
    {operationError && <div className="error-banner" role="alert">{operationError}</div>}
    {confirming && (
      <div className="modal-wrap">
        <div className="wizard confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-agent-action-title">
          <div className="wizard-head"><h1 id="confirm-agent-action-title">Confirm {confirming.label}</h1><button aria-label="Close confirmation" onClick={() => setConfirming(null)}>×</button></div>
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

function AgentLocalHeader({ agentId, title, description }: { agentId: string; title: string; description: string }) {
  return <Shared.DomainHeader domain="Agents" title={title} description={description} entityLabel={`Agent: ${agentId}`} />;
}

export function AgentConfigurationView() {
  const { agentId } = Router.useParams();
  const surface = useAgentSurface(agentId ?? "");
  if (!agentId) return <Router.Navigate to="/agents" replace />;
  const detail = surface.data?.detail;
  return <>
    <AgentLocalHeader agentId={agentId} title="Configuration" description="Current Agent definition and the existing governed editor." />
    {surface.loadError && <div className="error-banner" role="alert">{surface.loadError}</div>}
    {surface.stale && <div className="stale-banner" role="status">Showing a stale configuration snapshot. Refresh from Agent overview to recover live state.</div>}
    <section className="panel">
      <div className="panel-head"><div><h2>Configuration boundary</h2><p>ACS owns the Agent definition and revision lineage.</p></div><span className="tag">{detail ? `r${detail.currentRevision.revision}` : "loading"}</span></div>
      {surface.loadState === "loading" && !detail
        ? <div className="state-line">Loading current configuration...</div>
        : surface.loadState === "error" && !detail
          ? <div className="state-line error">Unable to load the current configuration.</div>
          : detail
            ? <>
              <dl className="config-list">
                <div><dt>Agent</dt><dd>{detail.agentDefinition.name} <code className="mono">{detail.agentId}</code></dd></div>
                <div><dt>Shared.Status</dt><dd>{detail.agentDefinition.status}</dd></div>
                <div><dt>Current revision</dt><dd className="mono">r{detail.currentRevision.revision}</dd></div>
                <div><dt>Composition</dt><dd>{detail.composition ? (detail.composition.ready ? "ready" : "attention") : "unavailable"}</dd></div>
              </dl>
              <div className="panel-actions"><Router.Link className="primary action-link" to={`/agents/${agentId}/edit`}>Open configuration</Router.Link><Router.Link className="secondary action-link" to={`/agents/${agentId}`}>Shared.View overview</Router.Link></div>
              <p className="panel-note">Configuration uses the same identity, functional, composition, and advanced hierarchy as Agent creation.</p>
            </>
            : <div className="state-line empty">Agent configuration is unavailable.</div>}
    </section>
  </>;
}

export function AgentValidateView() {
  const { agentId } = Router.useParams();
  const surface = useAgentSurface(agentId ?? "");
  if (!agentId) return <Router.Navigate to="/agents" replace />;
  const detail = surface.data?.detail;
  return <>
    <AgentLocalHeader agentId={agentId} title="Validate" description="Composition and readiness validation for this Agent." />
    {surface.loadError && <div className="error-banner" role="alert">{surface.loadError}</div>}
    <div className="guardrail-banner" role="note"><span>Inspection mode</span><span>Sandbox only</span><span>Product API source of truth</span><span>No test or playground execution</span></div>
    <div className="detail-grid">
      <section className="panel">
        <div className="panel-head"><div><h2>Composition validation</h2><p>Existing Agent composition and compatibility surface.</p></div><Shared.Badge tone={detail?.composition?.ready ? "good" : "warn"}>{detail?.composition ? (detail.composition.ready ? "ready" : "attention") : "unavailable"}</Shared.Badge></div>
        <p className="panel-note">Validate means configuration, composition and readiness validation in this milestone.</p>
        <Router.Link className="primary action-link" to={`/agents/${agentId}/composition`}>Open composition validation</Router.Link>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Readiness validation</h2><p>Current readiness summary from the Agent detail read model.</p></div><Shared.ReadinessBadge summary={detail?.readinessSummary ?? { state: "unavailable", blockerCount: 0, warningCount: 0 }} /></div>
        {detail
          ? <dl className="config-list"><div><dt>State</dt><dd>{detail.readinessSummary.state}</dd></div><div><dt>Blockers</dt><dd>{detail.readinessSummary.blockerCount}</dd></div><div><dt>Warnings</dt><dd>{detail.readinessSummary.warningCount}</dd></div></dl>
          : <div className="state-line">Loading readiness...</div>}
        <Router.Link className="surface-link" to="/readiness">Open global readiness evidence →</Router.Link>
      </section>
    </div>
  </>;
}

export function AgentRevisionsView() {
  const { agentId } = Router.useParams();
  const surface = useAgentSurface(agentId ?? "");
  if (!agentId) return <Router.Navigate to="/agents" replace />;
  const revisions = surface.data ? [...surface.data.revisions].sort((left, right) => right.revisionNumber - left.revisionNumber) : [];

  return <>
    <AgentLocalHeader agentId={agentId} title="Revisions" description="Immutable Agent revision lineage and canonical current head." />
    {surface.loadError && <div className="error-banner" role="alert">{surface.loadError}</div>}
    <section className="panel">
      <div className="panel-head"><div><h2>Revision history</h2><p>Current is the canonical head. Historical revisions are read-only records.</p></div><Router.Link className="secondary action-link" to={`/agents/${agentId}`}>Open overview</Router.Link></div>
      {surface.loadState === "loading" && !surface.data
        ? <div className="state-line">Loading revisions...</div>
        : revisions.length
          ? <div className="revision-list">{revisions.map(revision => {
            const current = revision.status === "current";
            return <div className={`revision-row ${current ? "current" : "historical"}`} key={revision.revisionId}>
              <div className="revision-main">
                <div className="revision-top"><b className="mono">r{revision.revisionNumber}</b><Shared.Badge tone={current ? "good" : "muted"}>{current ? "CURRENT" : "HISTORICAL"}</Shared.Badge>{revision.restoredFrom !== undefined && <span className="tag">restored from r{revision.restoredFrom}</span>}</div>
                <small>{current ? "Canonical current revision" : "Historical revision — read-only"} · Created <Shared.Time value={revision.createdAt} /></small>
                {revision.adoptedAt !== revision.createdAt && <small>Adopted <Shared.Time value={revision.adoptedAt} /></small>}
                {revision.changeSummary && <small>{revision.changeSummary}</small>}
                {revision.compositionHash && <code className="mono hash">{revision.compositionHash}</code>}
              </div>
              <div className="revision-actions">
                {current
                  ? <Router.Link className="secondary action-link" to={`/agents/${agentId}/configuration`}>Edit current</Router.Link>
                  : <span className="action-reason">Historical records cannot be edited directly.</span>}
              </div>
            </div>;
          })}</div>
          : <div className="state-line empty">No revision history is available.</div>}
      <p className="panel-note">Adopt and restore retain immutable history by creating a new current revision through the existing governed API. They remain available from Overview when the backend marks them available; revision comparison is deferred.</p>
    </section>
  </>;
}

export function AgentRunsView() {
  const { agentId } = Router.useParams();
  const [searchParams, setSearchParams] = Router.useSearchParams();
  if (!agentId) return <Router.Navigate to="/agents" replace />;
  const offset = readAgentOperationalOffset(searchParams.get("offset"));
  const setOffset = (nextOffset: number) => {
    const next = new URLSearchParams(searchParams);
    if (nextOffset === 0) next.delete("offset");
    else next.set("offset", String(nextOffset));
    setSearchParams(next);
  };
  return <AgentRunsContent key={`${agentId}:${offset}`} agentId={agentId} offset={offset} onPage={setOffset} />;
}

function AgentRunsContent({ agentId, offset, onPage }: { agentId: string; offset: number; onPage: (offset: number) => void }) {
  const runs = Shared.useOperationalSummary<Api.ExecutionRunSummary[]>(
    () => Api.productApi.listAgentExecutionRuns(agentId, { limit: AGENT_OPERATIONAL_PAGE_LIMIT, offset }),
    "Unable to load Agent-scoped Runs from Product API",
    () => false,
  );

  return <>
    <AgentLocalHeader agentId={agentId} title="Runs" description="Bounded execution history for this Agent." />
    <section className="panel">
      <div className="panel-head"><div><h2>Agent Runs</h2><p>Up to {AGENT_OPERATIONAL_PAGE_LIMIT} records in Product API order: started time descending, then Run ID descending.</p></div><button className="secondary" disabled={runs.loadState === "loading" || runs.loadState === "refreshing"} onClick={runs.refresh}>{runs.loadState === "refreshing" ? "Refreshing" : "Refresh"}</button></div>
      {runs.loadError && runs.data && <Shared.ErrorBanner error={runs.loadError} />}
      {runs.loadState === "loading" && !runs.data
        ? <div className="state-line">Loading Agent Runs...</div>
        : runs.data?.length
          ? <div className="catalog-list">{runs.data.map(run => <article className="catalog-row operational-record" key={run.runId}>
            <div className="catalog-row-main">
              <div className="operational-record-title"><b>Run</b><Shared.Badge tone={Shared.statusTone(run.status)}>{run.status}</Shared.Badge></div>
              <small className="mono">{run.runId}</small>
              <p>Started <Shared.Time value={run.startedAt} />{run.endedAt !== undefined ? <> · completed <Shared.Time value={run.endedAt} /></> : " · completion not recorded"}{run.durationMs !== undefined ? ` · duration ${formatRunDuration(run.durationMs)}` : ""}</p>
              {(run.resultSummary || run.failureReason) && <small>{run.failureReason ?? run.resultSummary}</small>}
            </div>
            <div className="catalog-badges operational-correlation">
              {run.runtimeId !== "unknown" && <span className="tag mono">Runtime {run.runtimeId}</span>}
              {run.deploymentId !== "unknown" && <span className="tag mono">Deployment {run.deploymentId}</span>}
            </div>
          </article>)}</div>
          : <Shared.PanelStateLine state={runs.loadState} error={runs.loadError} emptyMessage={offset === 0 ? "No Runs have been recorded for this Agent." : "No Runs were returned for this page. Use Previous to return to earlier records."} />}
      {runs.data && (runs.data.length > 0 || offset > 0) && <AgentOperationalPagination offset={offset} returned={runs.data.length} onPage={onPage} />}
      <p className="panel-note">Run execution revision provenance is not supplied by this query. The current Agent revision is not used as a historical substitute.</p>
      <div className="panel-actions"><Router.Link className="secondary action-link" to={`/agents/${agentId}`}>Shared.View Agent overview</Router.Link><Router.Link className="detail-link" to={`/agents/${agentId}/evidence`}>Open Agent Evidence</Router.Link><Router.Link className="detail-link" to={`/agents/${agentId}/usage-cost`}>Open Usage & Cost</Router.Link></div>
    </section>
  </>;
}

export function AgentEvidenceView() {
  const { agentId } = Router.useParams();
  const [searchParams, setSearchParams] = Router.useSearchParams();
  if (!agentId) return <Router.Navigate to="/agents" replace />;
  const offset = readAgentOperationalOffset(searchParams.get("offset"));
  const setOffset = (nextOffset: number) => {
    const next = new URLSearchParams(searchParams);
    if (nextOffset === 0) next.delete("offset");
    else next.set("offset", String(nextOffset));
    setSearchParams(next);
  };
  return <AgentEvidenceContent key={`${agentId}:${offset}`} agentId={agentId} offset={offset} onPage={setOffset} />;
}

function AgentEvidenceContent({ agentId, offset, onPage }: { agentId: string; offset: number; onPage: (offset: number) => void }) {
  const evidence = Shared.useOperationalSummary<Api.EvidenceRecord[]>(
    () => Api.productApi.listAgentEvidence(agentId, { limit: AGENT_OPERATIONAL_PAGE_LIMIT, offset }),
    "Unable to load Agent-scoped Evidence from Product API",
    () => false,
  );

  return <>
    <AgentLocalHeader agentId={agentId} title="Evidence" description="Bounded operational Evidence for this Agent." />
    <section className="panel">
      <div className="panel-head"><div><h2>Agent Evidence</h2><p>Up to {AGENT_OPERATIONAL_PAGE_LIMIT} Evidence records in Product API order: created time descending, then Evidence ID descending.</p></div><button className="secondary" disabled={evidence.loadState === "loading" || evidence.loadState === "refreshing"} onClick={evidence.refresh}>{evidence.loadState === "refreshing" ? "Refreshing" : "Refresh"}</button></div>
      {evidence.loadError && evidence.data && <Shared.ErrorBanner error={evidence.loadError} />}
      {evidence.loadState === "loading" && !evidence.data
        ? <div className="state-line">Loading Agent Evidence...</div>
        : evidence.data?.length
          ? <div className="catalog-list">{evidence.data.map(record => <article className="catalog-row operational-record" key={record.evidenceId}>
            <div className="catalog-row-main">
              <div className="operational-record-title"><b>{record.title}</b><Shared.Badge tone="muted">{record.kind}</Shared.Badge></div>
              <small className="mono">{record.evidenceId}</small>
              <p>{record.summary}</p>
              <small>Source {record.source} · recorded <Shared.Time value={record.createdAt} /></small>
            </div>
            <div className="catalog-badges operational-correlation">
              {record.entityRefs?.map(reference => <span className="tag mono" key={`${reference.entityType}:${reference.entityId}`}>{reference.entityType} {reference.entityId}</span>)}
              {record.correlationId && <span className="tag mono">Correlation {record.correlationId}</span>}
            </div>
          </article>)}</div>
          : <Shared.PanelStateLine state={evidence.loadState} error={evidence.loadError} emptyMessage={offset === 0 ? "No Evidence has been recorded for this Agent." : "No Evidence was returned for this page. Use Previous to return to earlier records."} />}
      {evidence.data && (evidence.data.length > 0 || offset > 0) && <AgentOperationalPagination offset={offset} returned={evidence.data.length} onPage={onPage} />}
      <p className="panel-note">Evidence is distinct from Events, Audit, and Runtime Events. Source, correlation, and entity references are shown only when supplied by the Product API; no provenance or integrity claim is synthesized.</p>
      <div className="panel-actions"><Router.Link className="secondary action-link" to={`/agents/${agentId}`}>Shared.View Agent overview</Router.Link><Router.Link className="detail-link" to={`/agents/${agentId}/runs`}>Open Agent Runs</Router.Link><Router.Link className="detail-link" to={`/agents/${agentId}/usage-cost`}>Open Usage & Cost</Router.Link></div>
    </section>
  </>;
}

export function AgentUsageCostView() {
  const { agentId } = Router.useParams();
  if (!agentId) return <Router.Navigate to="/agents" replace />;
  return <AgentUsageCostContent key={agentId} agentId={agentId} />;
}

function AgentUsageCostContent({ agentId }: { agentId: string }) {
  const usage = Shared.useOperationalSummary<Api.UsageInspectionRecord[]>(
    () => Api.productApi.listUsageRecords({ agentId, limit: AGENT_OPERATIONAL_PAGE_LIMIT }),
    "Unable to load Agent-scoped usage records from Product API",
    () => false,
  );
  const summary = Shared.useOperationalSummary<Api.AgentOperationalEconomicSummary>(
    () => Api.productApi.getAgentOperationalEconomicSummary(agentId),
    "Unable to load the Agent-scoped economic summary from Product API",
    () => false,
  );

  return <>
    <AgentLocalHeader agentId={agentId} title="Usage & Cost" description="Economic records canonically attributed to this Agent." />
    <div className="guardrail-banner" role="note"><span>Inspection mode</span><span>Product API source of truth</span><span>No browser-side accounting</span><span>Missing values are unavailable, not zero</span></div>
    <section className="panel">
      <div className="panel-head"><div><h2>Usage records</h2><p>Up to {AGENT_OPERATIONAL_PAGE_LIMIT} server-scoped records. The Usage contract does not define pagination or ordering.</p></div><button className="secondary" disabled={usage.loadState === "loading" || usage.loadState === "refreshing"} onClick={() => { usage.refresh(); summary.refresh(); }}>{usage.loadState === "refreshing" ? "Refreshing" : "Refresh"}</button></div>
      {usage.loadError && usage.data && <Shared.ErrorBanner error={usage.loadError} />}
      {usage.loadState === "loading" && !usage.data
        ? <div className="state-line">Loading Agent usage records...</div>
        : usage.data?.length
          ? <div className="catalog-list">{usage.data.map(record => <article className="catalog-row operational-record" key={record.usageId}>
            <div className="catalog-row-main">
              <div className="operational-record-title"><b>{record.dimension}</b><Shared.Badge tone={Shared.statusTone(record.status)}>{record.status}</Shared.Badge></div>
              <small className="mono">{record.usageId}</small>
              <p>{record.quantity} {record.unit} · {record.measurementState} · {record.settlementState}</p>
              <small>Observed <Shared.Time value={record.observedAt} /> · source {record.measurementSource}</small>
            </div>
            <div className="catalog-badges operational-correlation">
              <span className="tag mono">Run {record.executionRunId}</span>
              {record.reservationId && <span className="tag mono">Api.Reservation {record.reservationId}</span>}
              {record.quoteId && <span className="tag mono">Api.Quote {record.quoteId}</span>}
              {record.settlementId && <span className="tag mono">Api.Settlement {record.settlementId}</span>}
            </div>
          </article>)}</div>
          : <Shared.PanelStateLine state={usage.loadState} error={usage.loadError} emptyMessage="No Usage & Cost records have been recorded for this Agent." />}
      <section className="agent-economic-summary" aria-labelledby="agent-economic-summary-title">
        <h3 id="agent-economic-summary-title">Economic summary</h3>
        {summary.loadState === "loading" && !summary.data
          ? <div className="state-line">Loading the scoped economic summary...</div>
          : summary.data
            ? <div className="state-line">Agent-scoped operational summary checked <Shared.Time value={summary.data.checkedAt} />. Its zero-valued operational projections do not define a cost total, so no economic total is displayed.</div>
            : <div className="state-line error" role="alert">{summary.loadError ?? "The scoped economic summary is unavailable. Usage records remain independently available."}</div>}
      </section>
      <p className="panel-note">Usage correlation is reported by the Product API as Agent → Run → reservation → quote → settlement when those records exist. The UI does not derive cost totals from this bounded page, and partial or missing economic links are not converted into a complete cost claim.</p>
      <div className="panel-actions"><Router.Link className="secondary action-link" to={`/agents/${agentId}`}>Shared.View Agent overview</Router.Link><Router.Link className="detail-link" to={`/agents/${agentId}/runs`}>Open Agent Runs</Router.Link><Router.Link className="detail-link" to={`/agents/${agentId}/evidence`}>Open Agent Evidence</Router.Link></div>
    </section>
  </>;
}

export function AgentAdvancedView() {
  const { agentId } = Router.useParams();
  const surface = useAgentSurface(agentId ?? "");
  if (!agentId) return <Router.Navigate to="/agents" replace />;
  const detail = surface.data?.detail;
  const definition = detail?.agentDefinition;
  const composition = detail?.composition;

  return <>
    <AgentLocalHeader agentId={agentId} title="Advanced" description="Technical and diagnostic context for this Agent." />
    {surface.loadError && <div className="error-banner" role="alert">{surface.loadError}</div>}
    {surface.loadState === "loading" && !detail
      ? <div className="loading-screen">Loading technical Agent context...</div>
      : detail && definition
        ? <div className="detail-grid">
          <section className="panel">
            <div className="panel-head"><div><h2>Provider and model binding</h2><p>Technical composition, not Agent identity</p></div><Shared.Badge tone="muted">technical</Shared.Badge></div>
            {definition.modelStrategy
              ? <dl className="config-list">
                <div><dt>Provider</dt><dd className="mono">{definition.modelStrategy.primary.providerId}</dd></div>
                <div><dt>Model</dt><dd className="mono">{definition.modelStrategy.primary.modelId}</dd></div>
                <div><dt>Fallbacks</dt><dd>{definition.modelStrategy.fallbacks.length}</dd></div>
              </dl>
              : <div className="state-line empty">No model strategy is attached to this Agent definition.</div>}
          </section>
          <section className="panel">
            <div className="panel-head"><div><h2>Composition references</h2><p>ACS-owned references used by the current revision</p></div></div>
            <dl className="config-list">
              <div><dt>Role</dt><dd>{definition.roleId ? `${definition.roleId}${definition.roleRevision ? ` (r${definition.roleRevision})` : ""}` : "unassigned"}</dd></div>
              <div><dt>Profile</dt><dd>{definition.profileId ? `${definition.profileId}${definition.profileRevision ? ` (r${definition.profileRevision})` : ""}` : "unassigned"}</dd></div>
              <div><dt>Execution policy</dt><dd>{definition.executionPolicyId ?? "none"}</dd></div>
            </dl>
            <div className="panel-body"><IdList label="Capabilities" ids={definition.capabilityIds} /><IdList label="Skills" ids={definition.skillIds} /><IdList label="Tools" ids={definition.toolIds} /></div>
          </section>
          <section className="panel">
            <div className="panel-head"><div><h2>Credentials and runner preferences</h2><p>References only; secret values are never displayed</p></div></div>
            <div className="panel-body"><IdList label="Credential connections" ids={definition.credentialConnectionIds} /><IdList label="Runner preferences" ids={definition.runnerPreferences} /></div>
          </section>
          <section className="panel">
            <div className="panel-head"><div><h2>Revision and materialization</h2><p>Diagnostic identifiers for the current immutable revision</p></div></div>
            <dl className="config-list">
              <div><dt>Revision fingerprint</dt><dd className="mono hash">{detail.currentRevision.fingerprint}</dd></div>
              <div><dt>Composition fingerprint</dt><dd className="mono hash">{composition?.fingerprint ?? "unavailable"}</dd></div>
              <div><dt>Materialization</dt><dd>{composition?.materialization ? `${composition.materialization.artifactType} · ${composition.materialization.artifactFingerprint}` : "none"}</dd></div>
            </dl>
          </section>
          <section className="panel wide">
            <div className="panel-head"><div><h2>Advanced surfaces</h2><p>Existing detail endpoints preserve canonical ownership.</p></div></div>
            <div className="cross-links">
              <Router.Link className="detail-link" to={`/agents/${agentId}/composition`}>Composition detail →</Router.Link>
              <Router.Link className="detail-link" to={`/agents/${agentId}/validate`}>Readiness validation →</Router.Link>
              <Router.Link className="detail-link" to="/operational-execution">Deployment and execution planning →</Router.Link>
              <Router.Link className="detail-link" to="/runtime">Runtime support →</Router.Link>
              <Router.Link className="detail-link" to="/audit">Audit records →</Router.Link>
            </div>
          </section>
        </div>
        : <section className="panel"><div className="state-line empty">Technical Agent context is unavailable.</div></section>}
  </>;
}

type AgentFormMode = "create" | "edit" | "revision";

function AgentForm({ mode, agentId }: { mode: AgentFormMode; agentId?: string }) {
  const navigate = Router.useNavigate();
  const [agentIdValue, setAgentIdValue] = React.useState("");
  const [name, setName] = React.useState("");
  const [status, setStatus] = React.useState<Api.GovernedAgentStatus>("draft");
  const [roleId, setRoleId] = React.useState("");
  const [profileId, setProfileId] = React.useState("");
  const [capabilityIds, setCapabilityIds] = React.useState("");
  const [skillIds, setSkillIds] = React.useState("");
  const [toolIds, setToolIds] = React.useState("");
  const [credentialConnectionIds, setCredentialConnectionIds] = React.useState("");
  const [modelProviderId, setModelProviderId] = React.useState("");
  const [modelId, setModelId] = React.useState("");
  const [modelCredentialConnectionId, setModelCredentialConnectionId] = React.useState("");
  const [runnerPreferences, setRunnerPreferences] = React.useState("");
  const [loadingDetail, setLoadingDetail] = React.useState(mode !== "create");
  const [detailError, setDetailError] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<Api.AgentDetail | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [revisionConflict, setRevisionConflict] = React.useState(false);
  const prefilled = React.useRef(false);
  const roles = Shared.useOperationalSummary<Api.RoleSummary[]>(() => Api.productApi.listRoles(), "Unable to load roles for Agent form", () => false);
  const profiles = Shared.useOperationalSummary<Api.ProfileSummary[]>(() => Api.productApi.listProfiles(), "Unable to load profiles for Agent form", () => false);
  const capabilities = Shared.useOperationalSummary<Api.CapabilitySummary[]>(() => Api.productApi.listCapabilities(), "Unable to load capabilities for Agent form", () => false);
  const skills = Shared.useOperationalSummary<Api.SkillSummary[]>(() => Api.productApi.listSkills(), "Unable to load skills for Agent form", () => false);
  const tools = Shared.useOperationalSummary<Api.ToolSummary[]>(() => Api.productApi.listTools(), "Unable to load tools for Agent form", () => false);
  const providers = Shared.useOperationalSummary<Api.ProviderSummary[]>(() => Api.productApi.listProviders(), "Unable to load model providers for Agent form", () => false);
  const models = Shared.useOperationalSummary<Api.ModelSummary[]>(() => Api.productApi.listModels(), "Unable to load models for Agent form", () => false);
  const providerConnections = Shared.useOperationalSummary<Api.ProviderConnectionSummary[]>(() => Api.productApi.listProviderConnections(), "Unable to load credential references for Agent form", () => false);

  React.useEffect(() => {
    if (mode !== "create" || modelProviderId || !providers.data?.length) return;
    const provider = providers.data.find(item => item.availability === "available" && item.compatibility === "compatible")
      ?? providers.data.find(item => item.availability === "available")
      ?? providers.data[0];
    if (provider) setModelProviderId(provider.id);
  }, [mode, modelProviderId, providers.data]);

  React.useEffect(() => {
    if (mode !== "create" || modelId || !modelProviderId || !models.data?.length) return;
    const model = models.data.find(item => item.type === modelProviderId && item.availability === "available")
      ?? models.data.find(item => item.type === modelProviderId);
    if (model) setModelId(model.id.startsWith(`${modelProviderId}/`) ? model.id.slice(modelProviderId.length + 1) : model.id);
  }, [mode, modelId, modelProviderId, models.data]);

  React.useEffect(() => {
    if (mode === "create" || !agentId || prefilled.current) return;
    Api.productApi.getAgent(agentId)
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
        setModelProviderId(next.agentDefinition.modelStrategy?.primary.providerId ?? "");
        setModelId(next.agentDefinition.modelStrategy?.primary.modelId ?? "");
        setModelCredentialConnectionId(next.agentDefinition.modelStrategy?.primary.credentialConnectionId ?? "");
        setRunnerPreferences(next.agentDefinition.runnerPreferences.join(", "));
        setLoadingDetail(false);
      })
      .catch(error => {
        setDetailError(Shared.apiErrorMessage(error));
        setLoadingDetail(false);
      });
  }, [mode, agentId]);

  function validateForm(): string | null {
    const identifier = agentIdValue.trim();
    if (!identifier) return "Agent ID is required";
    if (identifier.length > 160) return "Agent ID must be at most 160 characters";
    if (!Shared.SAFE_IDENTIFIER.test(identifier)) return "Agent ID supports letters, numbers, dots, underscores, colons and dashes only";
    if (!name.trim()) return "Name is required";
    return null;
  }

  function buildDefinition(): Api.AgentDefinition {
    return {
      agentId: agentIdValue.trim(),
      name: name.trim(),
      status,
      capabilityIds: parseList(capabilityIds),
      skillIds: parseList(skillIds),
      toolIds: parseList(toolIds),
      credentialConnectionIds: parseList(credentialConnectionIds),
      runnerPreferences: parseList(runnerPreferences),
      ...(modelProviderId.trim() && modelId.trim() ? {
        modelStrategy: {
          primary: {
            providerId: modelProviderId.trim(),
            modelId: modelId.trim(),
            ...(modelCredentialConnectionId.trim() ? { credentialConnectionId: modelCredentialConnectionId.trim() } : {}),
          },
          fallbacks: [],
        },
      } : {}),
      ...(roleId.trim() ? { roleId: roleId.trim() } : {}),
      ...(profileId.trim() ? { profileId: profileId.trim() } : {}),
    };
  }

  async function handleSubmit() {
    if (submitting) return;
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setSubmitting(true);
    setFormError(null);
    setRevisionConflict(false);
    try {
      const definition = buildDefinition();
      if (mode === "create") {
        const result = await Api.productApi.createAgent({ definition, createdBy: "control-plane-ui" });
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
        await Api.productApi.createAgentRevision(agentId, { definition, expectedRevision, actor: "control-plane-ui" });
      } else {
        await Api.productApi.updateAgent(agentId, { definition, expectedRevision, updatedBy: "control-plane-ui" });
      }
      navigate(`/agents/${agentId}`);
    } catch (error) {
      const conflict = mode !== "create" && Shared.isApiConflict(error);
      setRevisionConflict(conflict);
      setFormError(conflict ? "This Agent changed after this configuration was loaded. Reload the current configuration before saving again." : Shared.apiErrorMessage(error));
      setSubmitting(false);
    }
  }

  if (loadingDetail) return <div className="loading-screen">Loading agent definition...</div>;
  if (detailError) return <>
    <Router.Link className="back" to={agentId ? `/agents/${agentId}` : "/agents"}>← Back</Router.Link>
    <section className="panel"><div className="empty-state">{detailError}</div></section>
  </>;

  const backTarget = agentId ? `/agents/${agentId}` : "/agents";
  const expectedRevision = detail?.currentRevision.revision ?? 1;
  const selectedConnectionIds = parseList(credentialConnectionIds);
  const connectionOptions = providerConnections.data ?? [];
  const knownConnectionIds = new Set(connectionOptions.map(connection => connection.connectionId));
  const unavailableConnectionIds = selectedConnectionIds.filter(connectionId => !knownConnectionIds.has(connectionId));
  const modelConnectionOptions = modelProviderId ? connectionOptions.filter(connection => connection.providerId === modelProviderId) : connectionOptions;
  const toggleCsv = (current: string, value: string) => {
    const values = parseList(current);
    return values.includes(value) ? values.filter(item => item !== value).join(", ") : [...values, value].join(", ");
  };
  const selectModelCredential = (connectionId: string) => {
    setModelCredentialConnectionId(connectionId);
    if (connectionId && !selectedConnectionIds.includes(connectionId)) setCredentialConnectionIds(toggleCsv(credentialConnectionIds, connectionId));
  };
  const formTitle = mode === "create" ? "Create Agent" : mode === "revision" ? "Create revision" : "Update configuration";
  const formDescription = mode === "create"
    ? "Define Agent identity first. Functional and technical composition choices remain available as you need them."
    : "Update the next immutable Agent revision with the same grouped configuration used during creation.";

  return <>
    <Shared.DomainHeader domain="Agents" title={formTitle} description={formDescription} />
    <Router.Link className="back" to={backTarget}>← Back</Router.Link>
    <div className="guardrail-banner compact" role="note"><span>Sandbox · Governed mutation</span></div>
    {mode === "revision" && <div className="info-banner">A new revision is created from this definition. The Product API validates references and governance; readiness is not recomputed in the UI.</div>}
    <section className="panel form-panel agent-form-panel">
      <div className="panel-head"><div><h2>Agent definition</h2><p>Required fields are limited to Agent ID and name. The Product API remains authoritative for catalog, governance, and composition validation.</p></div></div>
      <div className="agent-form-layout">
        <div className="agent-form-review">
          <AgentFormSection title={mode === "create" ? "Review and create" : "Review and save"} description="Confirm the current definition before the canonical Product API mutation." tier="review" open>
            <dl className="config-list form-review-list">
              <div><dt>Agent identity</dt><dd>{name.trim() || "Name required"} <code className="mono">{agentIdValue.trim() || "Agent ID required"}</code></dd></div>
              <div><dt>Lifecycle status</dt><dd>{status || "Not configured"}</dd></div>
              <div><dt>Capabilities</dt><dd>{parseList(capabilityIds).join(", ") || "None selected"}</dd></div>
              <div><dt>Provider / model</dt><dd>{modelProviderId && modelId ? `${modelProviderId} / ${modelId}` : "Not configured"}</dd></div>
              <div><dt>Credential references</dt><dd>{selectedConnectionIds.length ? selectedConnectionIds.join(", ") : "None selected"}</dd></div>
              <div><dt>Role / profile</dt><dd>{roleId || "No role selected"} / {profileId || "No profile selected"}</dd></div>
              <div><dt>Skills</dt><dd>{parseList(skillIds).join(", ") || "None selected"}</dd></div>
              <div><dt>Tools</dt><dd>{parseList(toolIds).join(", ") || "None selected"}</dd></div>
              <div><dt>Runner preferences</dt><dd>{parseList(runnerPreferences).join(", ") || "Not configured"}</dd></div>
              {mode !== "create" && <div><dt>Revision guard</dt><dd>Save uses expected revision <code className="mono">r{expectedRevision}</code>.</dd></div>}
            </dl>
            <p className="form-note">Form validation checks Agent ID and name. Server-side validation, authorization, governance, composition, and duplicate protection run when the definition is submitted. Validate configuration is available after the Agent exists.</p>
            {mode !== "create" && <Router.Link className="surface-link" to={`/agents/${agentId}/validate`}>Open current Validate surface →</Router.Link>}
            {formError && <div className="error-banner" role="alert">{formError}</div>}
            {revisionConflict && agentId && <div className="warning-banner" role="alert">The save was rejected to preserve immutable revision history. <Router.Link to={`/agents/${agentId}/edit`}>Reload current configuration</Router.Link></div>}
            <div className="form-actions">
              <button className="secondary" disabled={submitting} onClick={() => navigate(backTarget)}>Cancel</button>
              <button className="primary" disabled={submitting} onClick={() => void handleSubmit()}>{submitting ? "Saving..." : mode === "create" ? "Create agent" : mode === "revision" ? "Create revision" : "Save changes"}</button>
            </div>
          </AgentFormSection>
        </div>
        <div className="agent-form-configuration">
          <div className="agent-form-flow" aria-label="Agent configuration flow"><span>Identity</span><Icons.ArrowRight size={14} /><span>Functional configuration</span><Icons.ArrowRight size={14} /><span>Technical composition</span><Icons.ArrowRight size={14} /><span>Advanced</span></div>
          <AgentFormSection title="Identity" description="Establish the ACS-owned Agent identity. Provider, credential, and runtime choices do not belong here." tier="required" open>
        <div className="form">
          <label>Agent ID{mode !== "create" && <small>Read-only — this stable ACS identity cannot be changed by configuration.</small>}<input className="mono" value={agentIdValue} readOnly={mode !== "create"} onChange={e => setAgentIdValue(e.target.value)} placeholder="e.g. research-analyst" /></label>
          <label>Name<input value={name} onChange={e => setName(e.target.value)} placeholder="Agent display name" /><small>The operator-facing name for this Agent.</small></label>
        </div>
        <p className="form-note">Purpose and description are not shown because the current Agent contract has no durable ACS-owned field for either value.</p>
          </AgentFormSection>
          <AgentFormSection title="Functional configuration" description="Choose current Agent-level behavior without exposing provider or credential mechanics first." tier="configuration" open={mode !== "create"}>
        <div className="form">
          <label>Initial lifecycle status<select value={status} onChange={e => setStatus(e.target.value as Api.GovernedAgentStatus)}><option value="draft">draft</option><option value="active">active</option><option value="disabled">disabled</option></select><small>Draft is the default. Product API lifecycle and governance checks remain authoritative.</small></label>
          <fieldset className="catalog-selector"><legend>Capabilities</legend>{capabilities.data?.map(item => <label key={item.capabilityId}><input type="checkbox" checked={parseList(capabilityIds).includes(item.capabilityId)} onChange={() => setCapabilityIds(toggleCsv(capabilityIds, item.capabilityId))} /><span>{item.name}<small>{item.capabilityId}</small></span></label>)}{capabilities.loadError && <small>{capabilities.loadError}</small>}{capabilities.data?.length === 0 && <small>No capabilities are currently available.</small>}</fieldset>
        </div>
          </AgentFormSection>
          <AgentFormSection title="Technical composition" description="Optional runtime implementation choices. These configure how an Agent may run; they do not define the Agent." tier="technical">
        <div className="form">
          <label>Provider<select value={modelProviderId} onChange={event => {
            const nextProvider = event.target.value;
            setModelProviderId(nextProvider);
            const nextModel = models.data?.find(item => item.type === nextProvider && item.availability === "available")
              ?? models.data?.find(item => item.type === nextProvider);
            setModelId(nextModel ? nextModel.id.startsWith(`${nextProvider}/`) ? nextModel.id.slice(nextProvider.length + 1) : nextModel.id : "");
            setModelCredentialConnectionId("");
          }}><option value="">No provider selected</option>{providers.data?.map(provider => <option value={provider.id} key={provider.id}>{provider.name} — {provider.availability}</option>)}</select><small>{providers.loadError ?? "Provider catalog is authoritative. Provider selection is technical composition, not Agent identity."}</small></label>
          <label>Model<select value={modelId} disabled={!modelProviderId} onChange={event => setModelId(event.target.value)}><option value="">No model selected</option>{models.data?.filter(model => model.type === modelProviderId).map(model => {
            const value = model.id.startsWith(`${modelProviderId}/`) ? model.id.slice(modelProviderId.length + 1) : model.id;
            return <option value={value} key={model.id}>{model.name} — {value} ({model.availability})</option>;
          })}</select><small>{models.loadError ?? "Only catalog models for the selected provider are shown."}</small></label>
          <fieldset className="catalog-selector"><legend>Credential references</legend>{connectionOptions.map(connection => <label key={connection.connectionId}><input type="checkbox" checked={selectedConnectionIds.includes(connection.connectionId)} onChange={() => setCredentialConnectionIds(toggleCsv(credentialConnectionIds, connection.connectionId))} /><span>{connection.connectionId}<small>{connection.providerName} · {connection.availability}</small></span></label>)}{unavailableConnectionIds.map(connectionId => <label key={connectionId}><input type="checkbox" checked onChange={() => setCredentialConnectionIds(toggleCsv(credentialConnectionIds, connectionId))} /><span>{connectionId}<small>preserved unavailable reference</small></span></label>)}{providerConnections.loadError && <small>{providerConnections.loadError}</small>}{connectionOptions.length === 0 && !providerConnections.loadError && <small>No credential references are available. <Router.Link to="/credentials">Manage credential references</Router.Link></small>}</fieldset>
          <label>Model credential reference (optional)<select value={modelCredentialConnectionId} onChange={event => selectModelCredential(event.target.value)}><option value="">No model credential selected</option>{modelCredentialConnectionId && !modelConnectionOptions.some(connection => connection.connectionId === modelCredentialConnectionId) && <option value={modelCredentialConnectionId}>{modelCredentialConnectionId} — preserved unavailable reference</option>}{modelConnectionOptions.map(connection => <option value={connection.connectionId} key={connection.connectionId}>{connection.connectionId} — {connection.availability}</option>)}</select><small>The chosen reference is added to the Agent credential connections. Secrets never appear in this form.</small></label>
        </div>
          </AgentFormSection>
          <AgentFormSection title="Advanced" description="Low-frequency composition and diagnostic options. Required configuration is never hidden here." tier="advanced">
        <div className="form">
          <label>Role<select value={roleId} onChange={e => setRoleId(e.target.value)}><option value="">No role selected</option>{roles.data?.map(role => <option value={role.roleId} key={role.roleId}>{role.name} — {role.roleId}</option>)}</select><small>{roles.loadError ?? "Options from the Product API role catalog."}</small></label>
          <label>Profile<select value={profileId} onChange={e => setProfileId(e.target.value)}><option value="">No profile selected</option>{profiles.data?.map(profile => <option value={profile.profileId} key={profile.profileId}>{profile.name} — {profile.profileId}</option>)}</select><small>{profiles.loadError ?? "Options from the Product API profile catalog."}</small></label>
          <fieldset className="catalog-selector"><legend>Skills</legend>{skills.data?.map(item => <label key={item.skillId}><input type="checkbox" checked={parseList(skillIds).includes(item.skillId)} onChange={() => setSkillIds(toggleCsv(skillIds, item.skillId))} /><span>{item.name}<small>{item.skillId}</small></span></label>)}{skills.loadError && <small>{skills.loadError}</small>}</fieldset>
          <fieldset className="catalog-selector"><legend>Tools</legend>{tools.data?.map(item => <label key={item.toolId}><input type="checkbox" checked={parseList(toolIds).includes(item.toolId)} onChange={() => setToolIds(toggleCsv(toolIds, item.toolId))} /><span>{item.name}<small>{item.toolId}</small></span></label>)}{tools.loadError && <small>{tools.loadError}</small>}</fieldset>
          <label>Runner preferences<input className="mono" value={runnerPreferences} onChange={e => setRunnerPreferences(e.target.value)} placeholder="comma-separated runner preference ids" /><small>Existing low-level runner preference identifiers. Leave blank unless an operator has a known supported value.</small></label>
        </div>
          </AgentFormSection>
        </div>
        </div>
    </section>
  </>;
}

export function AgentCreate() {
  return <AgentForm mode="create" />;
}

export function AgentEdit() {
  const { agentId } = Router.useParams();
  const [searchParams] = Router.useSearchParams();
  const mode: AgentFormMode = searchParams.get("mode") === "revision" ? "revision" : "edit";
  if (!agentId) return <Router.Navigate to="/agents" replace />;
  return <AgentForm mode={mode} agentId={agentId} />;
}

/* ---------------------------------------------------------------------------
 * Milestone C — Composition surface views
 * ------------------------------------------------------------------------- */
