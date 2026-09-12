import * as React from "react";
import * as Router from "react-router-dom";
import * as Api from "../../api/product-api";
import * as Shared from "../../shared";

function formatRevision(ref: Api.WorkforceRevisionRef | undefined): string {
  return ref ? `${ref.entity_id} · r${ref.revision}` : "unavailable";
}

function WorkforceState({ state }: { state: string }) {
  return <Shared.Status status={state} />;
}

function WorkforceCard({ workforce }: { workforce: Api.WorkforceListItem }) {
  return <article className="agent-card inventory-card">
    <div className="card-title">
      <span className="avatar">WF</span>
      <div><h2>{workforce.name}</h2><p className="mono">{workforce.workforceId}</p></div>
      <div className="card-badges"><WorkforceState state={workforce.lifecycleState} /></div>
    </div>
    <div className="card-specs">
      <span>Current revision<b className="mono">r{workforce.currentRevision}</b></span>
      <span>Members<b>{workforce.memberCount}</b></span>
      <span>Updated<b><Shared.Time value={workforce.updatedAt} /></b></span>
    </div>
    <div className="cap-row"><span>Reusable Agent composition</span><span>Canonical Product API projection</span></div>
    <div className="card-actions"><Router.Link className="secondary action-link" to={`/workforces/${encodeURIComponent(workforce.workforceId)}`}>Open Workforce</Router.Link></div>
  </article>;
}

export function WorkforceInventory() {
  const { data: workforces, loadState, loadError, stale, refresh } = Shared.useOperationalSummary<Api.WorkforceListItem[]>(
    () => Api.productApi.listWorkforces(),
    "Unable to load Workforces from Product API",
    () => false,
  );
  const [query, setQuery] = React.useState("");
  const [lifecycle, setLifecycle] = React.useState("all");
  const [sort, setSort] = React.useState<"name" | "updatedAt" | "lifecycle">("name");
  const filtered = (workforces ?? [])
    .filter(item => (!query.trim() || item.name.toLowerCase().includes(query.trim().toLowerCase()) || item.workforceId.toLowerCase().includes(query.trim().toLowerCase())) && (lifecycle === "all" || item.lifecycleState === lifecycle))
    .sort((left, right) => sort === "updatedAt" ? right.updatedAt - left.updatedAt : sort === "lifecycle" ? left.lifecycleState.localeCompare(right.lifecycleState) : left.name.localeCompare(right.name));

  return <>
    <Shared.DomainHeader domain="Workforces" title="Workforce Inventory" description="Discover canonical Agent compositions, their current revision and lifecycle." actions={<><Router.Link className="primary action-link" to="/workforces/new">Create Workforce</Router.Link><button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadError ? "Retry" : loadState === "refreshing" ? "Refreshing" : "Refresh"}</button></>} />
    <div className="guardrail-banner compact" role="note"><span>Canonical creation</span><span>Initial draft revision only</span><span>Product API is authoritative</span></div>
    {stale && <div className="stale-banner" role="status">Showing a stale Workforce snapshot. Refresh to recover live state.</div>}
    {loadState === "refreshing" && <div className="refresh-banner" role="status">Refreshing Workforces...</div>}
    {loadError && <div className="error-banner" role="alert">{loadError}</div>}
    <div className="toolbar agents-toolbar">
      <label className="search">⌕<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search Workforces by name or ID..." /></label>
      <select className="filter select-filter" value={lifecycle} onChange={event => setLifecycle(event.target.value)} aria-label="Filter by Workforce lifecycle">
        <option value="all">All lifecycle states</option><option value="draft">Draft</option><option value="active">Active</option><option value="disabled">Disabled</option><option value="archived">Archived</option>
      </select>
      <select className="filter select-filter" value={sort} onChange={event => setSort(event.target.value as "name" | "updatedAt" | "lifecycle")} aria-label="Sort Workforces">
        <option value="name">Sort: name</option><option value="updatedAt">Sort: updated</option><option value="lifecycle">Sort: lifecycle</option>
      </select>
    </div>
    {loadState === "loading" && !workforces && <div className="loading-screen">Loading Workforces...</div>}
    {loadState === "error" && !workforces && <section className="panel"><div className="empty-state">Unable to load Workforces. Check Product API connectivity and retry.</div></section>}
    {workforces && workforces.length === 0 && <section className="panel"><div className="empty-state">No Workforces exist. A Workforce composes Agents into a reusable execution unit.<br /><Router.Link className="primary action-link" to="/workforces/new">Create Workforce</Router.Link></div></section>}
    {workforces && workforces.length > 0 && filtered.length === 0 && <section className="panel"><div className="empty-state">No Workforces match your search or filters.</div></section>}
    {filtered.length > 0 && <section className="agent-cards inventory-grid">{filtered.map(workforce => <WorkforceCard key={workforce.workforceId} workforce={workforce} />)}</section>}
  </>;
}

export function WorkforceCreate() {
  const navigate = Router.useNavigate();
  const [workforceId, setWorkforceId] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [purpose, setPurpose] = React.useState("");
  const [ownershipRef, setOwnershipRef] = React.useState("");
  const [slotId, setSlotId] = React.useState("primary");
  const [agentId, setAgentId] = React.useState("");
  const [responsibilities, setResponsibilities] = React.useState("");
  const [membershipPolicyId, setMembershipPolicyId] = React.useState("");
  const [membershipPolicyRevision, setMembershipPolicyRevision] = React.useState("1");
  const [membershipPolicyFingerprint, setMembershipPolicyFingerprint] = React.useState("");
  const [auditPolicyId, setAuditPolicyId] = React.useState("");
  const [auditPolicyRevision, setAuditPolicyRevision] = React.useState("1");
  const [auditPolicyFingerprint, setAuditPolicyFingerprint] = React.useState("");
  const [changeReason, setChangeReason] = React.useState("Initial Workforce creation");
  const [idempotencyKey] = React.useState(() => crypto.randomUUID());
  const [requestedAt] = React.useState(() => Date.now());
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const policyRef = (entityId: string, revision: string, fingerprint: string): Api.WorkforceRevisionRef => ({ entity_kind: "policy", entity_id: entityId.trim(), revision: Number(revision), fingerprint: fingerprint.trim() });
  const validFingerprint = (value: string) => /^[a-f0-9]{64}$/i.test(value.trim());
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    if (![workforceId, displayName, purpose, ownershipRef, slotId, agentId, membershipPolicyId, auditPolicyId].every(value => value.trim())) return setError("Complete identity, one member slot, and both canonical policy references.");
    if (![workforceId, slotId, agentId].every(value => Shared.SAFE_IDENTIFIER.test(value.trim()))) return setError("Workforce, slot, and Agent IDs support letters, numbers, dots, underscores, colons and dashes only.");
    if (![membershipPolicyFingerprint, auditPolicyFingerprint].every(validFingerprint)) return setError("Policy fingerprints must be SHA-256 values with 64 hexadecimal characters.");
    if (![membershipPolicyRevision, auditPolicyRevision].every(value => Number.isSafeInteger(Number(value)) && Number(value) > 0)) return setError("Policy revisions must be positive integers.");
    setSubmitting(true); setError(null);
    try {
      const created = await Api.productApi.createWorkforce({ workforceId: workforceId.trim(), displayName: displayName.trim(), purpose: purpose.trim(), ownershipRef: ownershipRef.trim(), slotId: slotId.trim(), agentId: agentId.trim(), responsibilities: responsibilities.split(",").map(value => value.trim()).filter(Boolean), membershipPolicyRef: policyRef(membershipPolicyId, membershipPolicyRevision, membershipPolicyFingerprint), auditPolicyRef: policyRef(auditPolicyId, auditPolicyRevision, auditPolicyFingerprint), changeReason: changeReason.trim() || undefined, idempotencyKey, requestedAt });
      navigate(`/workforces/${encodeURIComponent(created.identity.workforce_id)}`);
    } catch (cause) { setError(Shared.apiErrorMessage(cause)); setSubmitting(false); }
  }
  return <>
    <Router.Link className="back" to="/workforces">← Back to Workforces</Router.Link>
    <Shared.DomainHeader domain="Workforces" title="Create Workforce" description="Create the initial canonical draft revision from an existing eligible Agent." />
    <form className="panel" onSubmit={submit}><div className="panel-head"><div><h2>Identity</h2><p>The API derives tenant scope from the selected Agent and creates draft revision r1.</p></div></div><div className="panel-body form-grid"><label>Workforce ID<input value={workforceId} onChange={event => setWorkforceId(event.target.value)} required /></label><label>Display name<input value={displayName} onChange={event => setDisplayName(event.target.value)} required /></label><label>Purpose<input value={purpose} onChange={event => setPurpose(event.target.value)} required /></label><label>Ownership reference<input value={ownershipRef} onChange={event => setOwnershipRef(event.target.value)} required /></label><h3>Basic composition</h3><label>Slot ID<input value={slotId} onChange={event => setSlotId(event.target.value)} required /></label><label>Agent ID<input value={agentId} onChange={event => setAgentId(event.target.value)} required /></label><label>Responsibilities (comma separated)<input value={responsibilities} onChange={event => setResponsibilities(event.target.value)} /></label><h3>Canonical policies</h3><label>Membership policy ID<input value={membershipPolicyId} onChange={event => setMembershipPolicyId(event.target.value)} required /></label><label>Membership policy revision<input type="number" min="1" value={membershipPolicyRevision} onChange={event => setMembershipPolicyRevision(event.target.value)} required /></label><label>Membership policy fingerprint<input value={membershipPolicyFingerprint} onChange={event => setMembershipPolicyFingerprint(event.target.value)} required /></label><label>Audit policy ID<input value={auditPolicyId} onChange={event => setAuditPolicyId(event.target.value)} required /></label><label>Audit policy revision<input type="number" min="1" value={auditPolicyRevision} onChange={event => setAuditPolicyRevision(event.target.value)} required /></label><label>Audit policy fingerprint<input value={auditPolicyFingerprint} onChange={event => setAuditPolicyFingerprint(event.target.value)} required /></label><label>Change reason<input value={changeReason} onChange={event => setChangeReason(event.target.value)} /></label>{error && <div className="error-banner" role="alert">{error}</div>}<div className="form-actions"><button className="primary" type="submit" disabled={submitting}>{submitting ? "Creating Workforce..." : "Create draft r1"}</button></div></div></form>
  </>;
}

function useWorkforceSurface(workforceId: string) {
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [data, setData] = React.useState<{ detail: Api.WorkforceDetail; revisions: Api.WorkforceRevision[] } | null>(null);
  const [loadState, setLoadState] = React.useState<Shared.DashboardLoadState>("loading");
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const loaded = React.useRef(false);
  React.useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    setLoadState(loaded.current ? "refreshing" : "loading");
    Promise.all([Api.productApi.getWorkforce(workforceId), Api.productApi.getWorkforceRevisions(workforceId)])
      .then(([detail, revisions]) => {
        if (!cancelled) { loaded.current = true; setData({ detail, revisions }); setLoadState("ready"); }
      })
      .catch(error => {
        if (!cancelled) {
          if (loaded.current) { setLoadState("ready"); setLoadError("Refresh failed; keeping previous Workforce data"); }
          else { setLoadState("error"); setLoadError(Shared.apiErrorMessage(error)); }
        }
      });
    return () => { cancelled = true; };
  }, [refreshKey, workforceId]);
  return { data, loadState, loadError, refresh: () => setRefreshKey(value => value + 1) };
}

function WorkforcePageHeader({ workforceId, title, description, refresh, loadState, loadError }: { workforceId: string; title: string; description: string; refresh: () => void; loadState: Shared.DashboardLoadState; loadError: string | null }) {
  return <>
    <Shared.DomainHeader domain="Workforces" title={title} description={description} entityLabel={workforceId} actions={<button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadError ? "Retry" : loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>} />
    <div className="guardrail-banner compact" role="note"><span>Workforce definition</span><span>Not a Run</span><span>Product API is authoritative</span></div>
    {loadState === "refreshing" && <div className="refresh-banner" role="status">Refreshing Workforce data...</div>}
    {loadError && <div className="error-banner" role="alert">{loadError}</div>}
  </>;
}

function WorkforceDetailLoading({ loadState, data }: { loadState: Shared.DashboardLoadState; data: unknown }) {
  if (loadState === "loading" && !data) return <div className="loading-screen">Loading Workforce...</div>;
  if (loadState === "error" && !data) return <section className="panel"><div className="empty-state">Unable to load this Workforce from Product API.</div></section>;
  return null;
}

export function WorkforceDetail() {
  const { workforceId } = Router.useParams();
  const surface = useWorkforceSurface(workforceId ?? "");
  if (!workforceId) return <Router.Navigate to="/workforces" replace />;
  const detail = surface.data?.detail;
  return <>
    <WorkforcePageHeader workforceId={workforceId} title={detail?.currentRevision.display_name ?? "Workforce detail"} description="Current canonical Workforce definition and its reusable Agent composition." refresh={surface.refresh} loadState={surface.loadState} loadError={surface.loadError} />
    <WorkforceDetailLoading loadState={surface.loadState} data={surface.data} />
    {detail && <>
      <section className="panel"><div className="panel-head"><div><h2>Current definition</h2><p>Head revision only. Historical revisions remain separately addressable and read-only.</p></div><WorkforceState state={detail.identity.current_status} /></div><div className="panel-body"><Shared.SummaryRow label="Workforce ID" value={detail.identity.workforce_id} /><Shared.SummaryRow label="Current revision" value={`r${detail.identity.current_revision}`} /><Shared.SummaryRow label="Lifecycle" value={detail.identity.current_status} /><Shared.SummaryRow label="Members" value={detail.currentComposition.length} /><Shared.SummaryRow label="Purpose" value={detail.currentRevision.purpose} /><Shared.SummaryRow label="Last updated" value={new Date(detail.identity.updated_at).toLocaleString()} /></div></section>
      <div className="dashboard-grid execution-grid">
        <section className="panel"><div className="panel-head"><div><h2>Composition</h2><p>Slot identity is distinct from Agent identity.</p></div><Shared.Badge tone="muted">{detail.currentComposition.length}</Shared.Badge></div><div className="panel-body">{detail.currentComposition.slice(0, 4).map(member => <div className="catalog-row" key={member.slot_id}><div className="catalog-row-main"><b>{member.slot_id}</b><small>{member.agent_selector.agent_id} · {member.agent_selector.mode === "pinned" ? `pinned ${formatRevision(member.agent_selector.pinned_revision_ref)}` : "resolve current Agent head at Run admission"}</small></div><Router.Link className="detail-link" to={`/agents/${encodeURIComponent(member.agent_selector.agent_id)}`}>agent</Router.Link></div>)}{detail.currentComposition.length === 0 && <div className="empty-state">This revision has no member slots.</div>}<Router.Link className="surface-link" to={`/workforces/${encodeURIComponent(workforceId)}/members`}>Inspect members →</Router.Link></div></section>
        <section className="panel"><div className="panel-head"><div><h2>Revision lineage</h2><p>Current and historical definitions are distinct.</p></div><Shared.Badge tone="muted">{surface.data?.revisions.length ?? 0}</Shared.Badge></div><div className="panel-body"><Shared.SummaryRow label="Current revision" value={`r${detail.currentRevision.ref.revision}`} /><Shared.SummaryRow label="Committed by" value={detail.revisionMetadata.created_by} /><Shared.SummaryRow label="Change reason" value={detail.revisionMetadata.change_reason} /><Router.Link className="surface-link" to={`/workforces/${encodeURIComponent(workforceId)}/revisions`}>View revision history →</Router.Link></div></section>
      </div>
      <div className="flow-group-note">A Workforce describes reusable composition. Run admission preserves an immutable snapshot and does not become the current Workforce definition.</div>
    </>}
  </>;
}

function MemberRows({ members }: { members: readonly Api.WorkforceMember[] }) {
  if (members.length === 0) return <div className="empty-state">No member slots exist in this Workforce revision.</div>;
  return <div className="catalog-list">{members.map(member => <div className="catalog-row" key={member.slot_id}><div className="catalog-row-main"><b>Slot: {member.slot_id}</b><small>Agent: {member.agent_selector.agent_id}</small><p>{member.agent_selector.mode === "pinned" ? `Pinned Agent revision: ${formatRevision(member.agent_selector.pinned_revision_ref)}` : "Resolution: current Agent head at Run admission — no Agent revision is resolved in this Workforce definition."}</p>{member.role_ref && <p>Governed role revision: {formatRevision(member.role_ref)}</p>}{member.responsibilities && member.responsibilities.length > 0 && <p>Responsibilities: {member.responsibilities.join(", ")}</p>}</div><Router.Link className="detail-link" to={`/agents/${encodeURIComponent(member.agent_selector.agent_id)}`}>Open agent</Router.Link></div>)}</div>;
}

export function WorkforceMembers() {
  const { workforceId } = Router.useParams();
  const surface = useWorkforceSurface(workforceId ?? "");
  if (!workforceId) return <Router.Navigate to="/workforces" replace />;
  return <>
    <WorkforcePageHeader workforceId={workforceId} title="Workforce members" description="Canonical member slots and Agent reference semantics for the current Workforce revision." refresh={surface.refresh} loadState={surface.loadState} loadError={surface.loadError} />
    <WorkforceDetailLoading loadState={surface.loadState} data={surface.data} />
    {surface.data && <section className="panel"><div className="panel-head"><div><h2>Current revision r{surface.data.detail.currentRevision.ref.revision}</h2><p>Each record is a member slot. The same Agent can occupy more than one slot.</p></div><WorkforceState state={surface.data.detail.identity.current_status} /></div><div className="panel-body"><MemberRows members={surface.data.detail.currentComposition} /></div></section>}
  </>;
}

export function WorkforceRevisions() {
  const { workforceId, revision } = Router.useParams();
  const surface = useWorkforceSurface(workforceId ?? "");
  if (!workforceId) return <Router.Navigate to="/workforces" replace />;
  const selectedRevision = revision && /^(0|[1-9][0-9]*)$/.test(revision) ? Number(revision) : undefined;
  const surfaceData = surface.data;
  const selected = surfaceData?.revisions.find(item => item.ref.revision === (selectedRevision ?? surfaceData.detail.currentRevision.ref.revision));
  return <>
    <WorkforcePageHeader workforceId={workforceId} title={selectedRevision ? `Workforce revision r${selectedRevision}` : "Workforce revisions"} description="Immutable historical Workforce definitions. Current Agent heads never rewrite these references." refresh={surface.refresh} loadState={surface.loadState} loadError={surface.loadError} />
    <WorkforceDetailLoading loadState={surface.loadState} data={surface.data} />
    {surface.data && <div className="dashboard-grid execution-grid"><section className="panel"><div className="panel-head"><div><h2>Revision history</h2><p>Choose a directly addressable revision.</p></div><Shared.Badge tone="muted">{surface.data.revisions.length}</Shared.Badge></div><div className="panel-body">{surface.data.revisions.map(item => <div className="catalog-row" key={item.ref.revision}><div className="catalog-row-main"><b>Revision r{item.ref.revision}{item.ref.revision === surface.data!.detail.currentRevision.ref.revision ? " · current" : ""}</b><small>{item.lifecycle_status} · committed by {item.commit.created_by}</small><p>{item.commit.change_reason}</p></div><Router.Link className="detail-link" to={`/workforces/${encodeURIComponent(workforceId)}/revisions/${item.ref.revision}`}>Inspect</Router.Link></div>)}</div></section><section className="panel"><div className="panel-head"><div><h2>{selected ? `Revision r${selected.ref.revision}` : "Revision unavailable"}</h2><p>{selected ? "Read-only historical composition." : "The requested revision is not returned by Product API."}</p></div>{selected && <WorkforceState state={selected.lifecycle_status} />}</div><div className="panel-body">{selected ? <><Shared.SummaryRow label="Revision ref" value={formatRevision(selected.ref)} /><Shared.SummaryRow label="Supersedes" value={selected.supersedes_revision ? `r${selected.supersedes_revision}` : "none"} /><Shared.SummaryRow label="Purpose" value={selected.purpose} /><MemberRows members={selected.members} /></> : <div className="empty-state">No matching historical revision.</div>}</div></section></div>}
  </>;
}

export function WorkforceRuns() {
  const { workforceId } = Router.useParams();
  const surface = useWorkforceSurface(workforceId ?? "");
  if (!workforceId) return <Router.Navigate to="/workforces" replace />;
  return <>
    <WorkforcePageHeader workforceId={workforceId} title="Workforce Runs" description="Run admission is immutable and must be read from explicit Product API snapshot fields." refresh={surface.refresh} loadState={surface.loadState} loadError={surface.loadError} />
    <WorkforceDetailLoading loadState={surface.loadState} data={surface.data} />
    {surface.data && <><Shared.UnsupportedPanel title="Workforce-scoped Run list unavailable" reason="The accepted Product API exposes a Run Workforce snapshot by Run ID, but does not expose a list of Runs filtered by Workforce. This screen will not infer membership from current Workforce state." note="Browse cross-Workforce Runs, then inspect a known Run and Task in Workforce Operations." /><Router.Link className="surface-link" to="/executions">Browse cross-Workforce Runs →</Router.Link></>}
  </>;
}

function RuntimeInvestigation({ workforceId }: { workforceId: string }) {
  const [searchParams, setSearchParams] = Router.useSearchParams();
  const runId = searchParams.get("runId") ?? "";
  const taskId = searchParams.get("taskId") ?? "";
  const [draftRunId, setDraftRunId] = React.useState(runId);
  const [draftTaskId, setDraftTaskId] = React.useState(taskId);
  const [data, setData] = React.useState<{ run: Api.RunWorkforceView; coordination: Api.WorkforceCoordinationView; runtime: Api.WorkforceRuntimeView } | null>(null);
  const [state, setState] = React.useState<Shared.DashboardLoadState>("ready");
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => { setDraftRunId(runId); setDraftTaskId(taskId); }, [runId, taskId]);
  React.useEffect(() => {
    let cancelled = false;
    if (!runId || !taskId) { setData(null); setError(null); setState("ready"); return () => { cancelled = true; }; }
    setState("loading"); setError(null);
    Promise.all([Api.productApi.getRunWorkforce(runId), Api.productApi.getWorkforceCoordination(runId, taskId), Api.productApi.getWorkforceRuntime(runId, taskId)])
      .then(([run, coordination, runtime]) => {
        if (!cancelled) {
          if (run.workforce?.workforceId !== workforceId) throw new Error("The supplied Run was not admitted with this Workforce.");
          setData({ run, coordination, runtime }); setState("ready");
        }
      })
      .catch(loadError => { if (!cancelled) { setData(null); setState("error"); setError(Shared.apiErrorMessage(loadError)); } });
    return () => { cancelled = true; };
  }, [runId, taskId, workforceId]);
  const submit = (event: React.FormEvent) => { event.preventDefault(); setSearchParams(draftRunId && draftTaskId ? { runId: draftRunId, taskId: draftTaskId } : {}); };
  return <>
    <section className="panel"><div className="panel-head"><div><h2>Run and task investigation</h2><p>Supply canonical IDs to inspect an admitted snapshot, coordination and runtime attempts.</p></div></div><div className="panel-body"><form className="toolbar agents-toolbar" onSubmit={submit}><label className="search">Run ID<input value={draftRunId} onChange={event => setDraftRunId(event.target.value)} required /></label><label className="search">Task ID<input value={draftTaskId} onChange={event => setDraftTaskId(event.target.value)} required /></label><button className="secondary" type="submit">Inspect</button></form></div></section>
    {!runId || !taskId ? <section className="panel"><div className="empty-state">Run and Task IDs are required. The Product API does not provide an inferred current-run view for a Workforce.</div></section> : null}
    {state === "loading" && <div className="loading-screen">Loading admitted Run snapshot...</div>}
    {error && <div className="error-banner" role="alert">{error}</div>}
    {data && <><section className="panel"><div className="panel-head"><div><h2>Admitted Workforce snapshot</h2><p>Exact Run membership is immutable and distinct from the current Workforce head.</p></div><WorkforceState state={data.run.run.status} /></div><div className="panel-body"><Shared.SummaryRow label="Admitted Workforce revision" value={`r${data.run.workforce?.admittedRevision ?? "unavailable"}`} /><Shared.SummaryRow label="Current Workforce head" value={`r${data.run.workforce?.currentHeadRevision ?? "unavailable"}`} /><div className="catalog-list">{data.run.membership.map(member => <div className="catalog-row" key={member.snapshot_id + member.slot_id}><div className="catalog-row-main"><b>Slot: {member.slot_id}</b><small>Agent {member.agent_id} · admitted revision {formatRevision(member.resolved_agent_revision_ref)}</small><p>{member.resolution_mode} · resolved at <Shared.Time value={member.resolved_at} /></p>{member.role_ref && <p>Governed role: {formatRevision(member.role_ref)}</p>}</div></div>)}</div></div></section><div className="dashboard-grid execution-grid"><section className="panel"><div className="panel-head"><div><h2>Coordination</h2><p>Proposals are advisory; decisions are canonical.</p></div></div><div className="panel-body"><Shared.SummaryRow label="Advisory proposals" value={data.coordination.proposals.length} /><Shared.SummaryRow label="Canonical decisions" value={data.coordination.decisions.length} />{data.coordination.currentAssignment ? <><Shared.SummaryRow label="Current assignment" value={data.coordination.currentAssignment.assignment_id} /><Shared.SummaryRow label="Assignment generation" value={data.coordination.currentAssignment.generation} /><Shared.SummaryRow label="Assigned slot" value={data.coordination.currentAssignment.member_slot_id} /></> : <div className="empty-state">No current assignment is returned for this task.</div>}<div className="catalog-list">{data.coordination.assignmentHistory.map(assignment => <div className="catalog-row" key={assignment.assignment_id}><div className="catalog-row-main"><b>{assignment.assignment_id} · generation {assignment.generation}</b><small>slot {assignment.member_slot_id} · {formatRevision(assignment.resolved_agent_revision_ref)}</small><p>{assignment.supersedes_assignment_id ? `Supersedes ${assignment.supersedes_assignment_id}` : "Original assignment"}</p></div></div>)}</div></div></section><section className="panel"><div className="panel-head"><div><h2>Runtime attempts</h2><p>Attempt references are explicit Product API projections.</p></div><Shared.Badge tone="muted">{data.runtime.attempts.length}</Shared.Badge></div><div className="panel-body">{data.runtime.attempts.length ? data.runtime.attempts.map(attempt => <div className="catalog-row" key={attempt.attemptId}><div className="catalog-row-main"><b>{attempt.attemptId}</b><small>{attempt.status} · recovery {attempt.recoveryClassification}</small><p>slot {attempt.memberSlotId ?? "unavailable"} · Agent {formatRevision(attempt.agentRevisionRef)} · Workforce {formatRevision(attempt.workforceRevisionRef)}</p></div></div>) : <div className="empty-state">No attempts are returned for this task.</div>}</div></section></div></>}
  </>;
}

export function WorkforceOperations() {
  const { workforceId } = Router.useParams();
  if (!workforceId) return <Router.Navigate to="/workforces" replace />;
  return <><Shared.DomainHeader domain="Workforces" title="Workforce operations" description="Read-only investigation of explicit Run snapshots, coordination lineage and runtime attempts." entityLabel={workforceId} /><div className="guardrail-banner compact" role="note"><span>Read-only</span><span>Run snapshot is authoritative</span><span>No frontend orchestration</span></div><RuntimeInvestigation workforceId={workforceId} /></>;
}
