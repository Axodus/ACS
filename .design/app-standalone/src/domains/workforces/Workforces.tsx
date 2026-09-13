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
  const agents = Shared.useOperationalSummary<Api.AgentListItem[]>(
    () => Api.productApi.listAgents(),
    "Unable to load Agents for Workforce creation",
    () => false,
  );
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
  const selectedAgent = agents.data?.find(agent => agent.agentId === agentId);
  const canSubmit = agents.loadState === "ready" && agents.data !== null && !submitting;
  return <>
    <Router.Link className="back" to="/workforces">← Back to Workforces</Router.Link>
    <Shared.DomainHeader domain="Workforces" title="Create Workforce" description="Create the initial canonical draft revision from an existing eligible Agent." />
    <form className="workforce-create-form" onSubmit={submit}>
      <section className="panel workforce-create-section">
        <div className="panel-head"><div><h2>Basic Information</h2><p>Human-facing identity for the Workforce. The API creates draft revision r1.</p></div></div>
        <div className="panel-body form-grid">
          <label>Workforce ID<input value={workforceId} onChange={event => setWorkforceId(event.target.value)} required aria-describedby="workforce-id-help" /><small id="workforce-id-help">Canonical identifier used for idempotency and later navigation.</small></label>
          <label>Display name<input value={displayName} onChange={event => setDisplayName(event.target.value)} required /></label>
          <label className="field-span-2">Purpose<textarea value={purpose} onChange={event => setPurpose(event.target.value)} required rows={3} /></label>
        </div>
      </section>

      <section className="panel workforce-create-section">
        <div className="panel-head"><div><h2>Composition</h2><p>Each member has its own slot. Slot identity is distinct from Agent identity.</p></div></div>
        <div className="panel-body">
          <article className="workforce-member-card">
            <div className="workforce-member-head"><div><h3>Member 1</h3><p>Initial member for the canonical Workforce definition.</p></div><Shared.Badge tone="muted">required</Shared.Badge></div>
            <div className="form-grid">
              <label>Slot<input value={slotId} onChange={event => setSlotId(event.target.value)} required aria-describedby="slot-help" /><small id="slot-help">The same Agent may occupy more than one slot.</small></label>
              <label>Agent<select value={agentId} onChange={event => setAgentId(event.target.value)} required disabled={agents.loadState !== "ready"} aria-describedby="agent-help"><option value="">{agents.loadState === "loading" ? "Loading Agents..." : "Select an Agent"}</option>{(agents.data ?? []).filter(agent => !agent.archived).map(agent => <option key={agent.agentId} value={agent.agentId}>{agent.name} · {agent.agentId} · r{agent.currentRevisionId}</option>)}</select><small id="agent-help">Select an existing Agent. Its canonical ID is retained in the request.</small></label>
              <label>Responsibilities<input value={responsibilities} onChange={event => setResponsibilities(event.target.value)} placeholder="Comma-separated responsibilities" /></label>
            </div>
            {selectedAgent && <div className="selection-meta" aria-live="polite"><b>{selectedAgent.name}</b><span>Agent ID: <code>{selectedAgent.agentId}</code></span><span>Current revision: <code>r{selectedAgent.currentRevisionId}</code></span><span>Status: {selectedAgent.status}</span></div>}
          </article>
          {agents.loadError && <div className="error-banner" role="alert">{agents.loadError}. Refresh the page before creating a Workforce.</div>}
          {agents.data?.length === 0 && <div className="empty-state">No Agents are available for Workforce composition.</div>}
        </div>
      </section>

      <section className="panel workforce-create-section">
        <div className="panel-head"><div><h2>Governance &amp; Authority</h2><p>Canonical policies and references required by the accepted creation contract.</p></div></div>
        <div className="panel-body form-grid">
          <label>Ownership reference<input value={ownershipRef} onChange={event => setOwnershipRef(event.target.value)} required aria-describedby="ownership-help" /><small id="ownership-help">No accepted authority lookup is exposed by the Product API for this form.</small></label>
          <label>Membership policy ID<input value={membershipPolicyId} onChange={event => setMembershipPolicyId(event.target.value)} required /></label>
          <label>Membership policy revision<input type="number" min="1" value={membershipPolicyRevision} onChange={event => setMembershipPolicyRevision(event.target.value)} required /></label>
          <label>Membership policy fingerprint<input value={membershipPolicyFingerprint} onChange={event => setMembershipPolicyFingerprint(event.target.value)} required /></label>
          <label>Audit policy ID<input value={auditPolicyId} onChange={event => setAuditPolicyId(event.target.value)} required /></label>
          <label>Audit policy revision<input type="number" min="1" value={auditPolicyRevision} onChange={event => setAuditPolicyRevision(event.target.value)} required /></label>
          <label>Audit policy fingerprint<input value={auditPolicyFingerprint} onChange={event => setAuditPolicyFingerprint(event.target.value)} required /></label>
        </div>
      </section>

      <section className="panel workforce-create-section">
        <div className="panel-head"><div><h2>Runtime / Admission Configuration</h2><p>Revision resolution remains governed by the Workforce contract.</p></div></div>
        <div className="panel-body form-grid">
          <div className="field-span-2 revision-choice"><span className="field-label">Agent revision strategy</span><label className="radio-row"><input type="radio" checked readOnly /> Current head at Run admission</label><small>The current Agent head at Run admission is resolved when a Run is admitted and preserved in that Run's immutable membership snapshot.</small></div>
          <label className="field-span-2">Change reason<input value={changeReason} onChange={event => setChangeReason(event.target.value)} /></label>
        </div>
      </section>

      {error && <div className="error-banner" role="alert">{error}</div>}
      <div className="form-actions workforce-create-actions"><Router.Link className="secondary action-link" to="/workforces">Cancel</Router.Link><button className="primary" type="submit" aria-label="Create draft r1" disabled={!canSubmit}>{submitting ? "Creating Workforce..." : "Create Workforce"}</button></div>
    </form>
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

function WorkforcePageHeader({ workforceId, title, description, refresh, loadState, loadError, actions }: { workforceId: string; title: string; description: string; refresh: () => void; loadState: Shared.DashboardLoadState; loadError: string | null; actions?: React.ReactNode }) {
  return <>
    <Shared.DomainHeader domain="Workforces" title={title} description={description} entityLabel={workforceId} actions={<>{actions}<button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadError ? "Retry" : loadState === "refreshing" ? "Refreshing" : "Refresh"}</button></>} />
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

const lifecycleTargets: Record<Api.WorkforceRevision["lifecycle_status"], readonly Api.WorkforceRevision["lifecycle_status"][]> = {
  draft: ["active", "archived"],
  active: ["disabled", "archived"],
  disabled: ["active", "archived"],
  archived: [],
};

function WorkforceLifecycleActions({ detail, refresh }: { detail: Api.WorkforceDetail; refresh: () => void }) {
  const current = detail.identity.current_status;
  const targets = lifecycleTargets[current];
  const [target, setTarget] = React.useState<Api.WorkforceRevision["lifecycle_status"]>(targets[0] ?? current);
  const [reason, setReason] = React.useState("");
  const [idempotencyKey, setIdempotencyKey] = React.useState(() => crypto.randomUUID());
  const [requestedAt, setRequestedAt] = React.useState(() => Date.now());
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setTarget(lifecycleTargets[current][0] ?? current);
    setReason("");
    setError(null);
  }, [current, detail.identity.current_revision]);

  if (targets.length === 0) return <section className="panel"><div className="panel-head"><div><h2>Lifecycle</h2><p>Archived is terminal in the canonical Workforce state machine.</p></div><WorkforceState state={current} /></div></section>;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    if (!reason.trim()) { setError("A change reason is required for a canonical lifecycle transition."); return; }
    setSubmitting(true);
    setError(null);
    try {
      await Api.productApi.transitionWorkforceLifecycle(detail.identity.workforce_id, {
        expectedRevision: detail.identity.current_revision,
        targetStatus: target,
        changeReason: reason.trim(),
        idempotencyKey,
        requestedAt,
      });
      setIdempotencyKey(crypto.randomUUID());
      setRequestedAt(Date.now());
      refresh();
    } catch (cause) {
      setError(Shared.isApiConflict(cause)
        ? "The Workforce changed after this page loaded. Refresh before attempting another lifecycle transition."
        : Shared.apiErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  return <section className="panel"><div className="panel-head"><div><h2>Lifecycle</h2><p>Transitions create an immutable successor revision through the Product API.</p></div><WorkforceState state={current} /></div><div className="panel-body"><form className="form-grid" onSubmit={submit}><label>Canonical target state<select value={target} onChange={event => setTarget(event.target.value as Api.WorkforceRevision["lifecycle_status"])}>{targets.map(value => <option value={value} key={value}>{value}</option>)}</select></label><label>Change reason<input value={reason} onChange={event => setReason(event.target.value)} required /></label>{error && <div className="error-banner" role="alert">{error}</div>}<div className="form-actions"><button className="secondary" type="submit" disabled={submitting}>{submitting ? "Transitioning..." : `Transition to ${target}`}</button></div></form></div></section>;
}

export function WorkforceDetail() {
  const { workforceId } = Router.useParams();
  const surface = useWorkforceSurface(workforceId ?? "");
  if (!workforceId) return <Router.Navigate to="/workforces" replace />;
  const detail = surface.data?.detail;
  return <>
    <WorkforcePageHeader workforceId={workforceId} title={detail?.currentRevision.display_name ?? "Workforce detail"} description="Current canonical Workforce definition and its reusable Agent composition." refresh={surface.refresh} loadState={surface.loadState} loadError={surface.loadError} actions={<Router.Link className="primary action-link" to={`/workforces/${encodeURIComponent(workforceId)}/revisions/new`}>Create revision</Router.Link>} />
    <WorkforceDetailLoading loadState={surface.loadState} data={surface.data} />
    {detail && <>
      <section className="panel"><div className="panel-head"><div><h2>Current definition</h2><p>Head revision only. Historical revisions remain separately addressable and read-only.</p></div><WorkforceState state={detail.identity.current_status} /></div><div className="panel-body"><Shared.SummaryRow label="Workforce ID" value={detail.identity.workforce_id} /><Shared.SummaryRow label="Current revision" value={`r${detail.identity.current_revision}`} /><Shared.SummaryRow label="Lifecycle" value={detail.identity.current_status} /><Shared.SummaryRow label="Members" value={detail.currentComposition.length} /><Shared.SummaryRow label="Purpose" value={detail.currentRevision.purpose} /><Shared.SummaryRow label="Last updated" value={new Date(detail.identity.updated_at).toLocaleString()} /></div></section>
      <div className="dashboard-grid execution-grid">
        <section className="panel"><div className="panel-head"><div><h2>Composition</h2><p>Slot identity is distinct from Agent identity.</p></div><Shared.Badge tone="muted">{detail.currentComposition.length}</Shared.Badge></div><div className="panel-body">{detail.currentComposition.slice(0, 4).map(member => <div className="catalog-row" key={member.slot_id}><div className="catalog-row-main"><b>{member.slot_id}</b><small>{member.agent_selector.agent_id} · {member.agent_selector.mode === "pinned" ? `pinned ${formatRevision(member.agent_selector.pinned_revision_ref)}` : "resolve current Agent head at Run admission"}</small></div><Router.Link className="detail-link" to={`/agents/${encodeURIComponent(member.agent_selector.agent_id)}`}>agent</Router.Link></div>)}{detail.currentComposition.length === 0 && <div className="empty-state">This revision has no member slots.</div>}<Router.Link className="surface-link" to={`/workforces/${encodeURIComponent(workforceId)}/members`}>Inspect members →</Router.Link></div></section>
        <section className="panel"><div className="panel-head"><div><h2>Revision lineage</h2><p>Current and historical definitions are distinct.</p></div><Shared.Badge tone="muted">{surface.data?.revisions.length ?? 0}</Shared.Badge></div><div className="panel-body"><Shared.SummaryRow label="Current revision" value={`r${detail.currentRevision.ref.revision}`} /><Shared.SummaryRow label="Committed by" value={detail.revisionMetadata.created_by} /><Shared.SummaryRow label="Change reason" value={detail.revisionMetadata.change_reason} /><Router.Link className="surface-link" to={`/workforces/${encodeURIComponent(workforceId)}/revisions`}>View revision history →</Router.Link></div></section>
      </div>
      <WorkforceLifecycleActions detail={detail} refresh={surface.refresh} />
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

type WorkforceMemberDraft = {
  slotId: string;
  agentId: string;
  selectorMode: "pinned" | "current_head_at_admission";
  pinnedRevision: string;
  pinnedFingerprint: string;
  roleKind: string;
  roleId: string;
  roleRevision: string;
  roleFingerprint: string;
  responsibilities: string;
  capabilityRequirementRefs: readonly Api.WorkforceEntityRef[];
  authorityConstraintRefs: readonly Api.WorkforceEntityRef[];
  participationConstraintRefs: readonly Api.WorkforceEntityRef[];
};

type WorkforceRevisionDraft = {
  sourceRevision: number;
  displayName: string;
  purpose: string;
  members: WorkforceMemberDraft[];
  membershipPolicy: Api.WorkforceRevisionRef;
  auditPolicy: Api.WorkforceRevisionRef;
  compositionConstraints: readonly Api.WorkforceEntityRef[];
  authorityRefs: readonly Api.WorkforceEntityRef[];
  changeReason: string;
};

function memberDraft(member: Api.WorkforceMember): WorkforceMemberDraft {
  const pinned = member.agent_selector.pinned_revision_ref;
  const role = member.role_ref;
  return {
    slotId: member.slot_id,
    agentId: member.agent_selector.agent_id,
    selectorMode: member.agent_selector.mode,
    pinnedRevision: pinned ? String(pinned.revision) : "",
    pinnedFingerprint: pinned?.fingerprint ?? "",
    roleKind: role?.entity_kind ?? "resource",
    roleId: role?.entity_id ?? "",
    roleRevision: role ? String(role.revision) : "",
    roleFingerprint: role?.fingerprint ?? "",
    responsibilities: member.responsibilities?.join(", ") ?? "",
    capabilityRequirementRefs: member.capability_requirement_refs ?? [],
    authorityConstraintRefs: member.authority_constraint_refs ?? [],
    participationConstraintRefs: member.participation_constraint_refs ?? [],
  };
}

function revisionDraft(revision: Api.WorkforceRevision): WorkforceRevisionDraft | null {
  if (!revision.governance?.membership_policy_ref || !revision.evidence?.audit_policy_ref) return null;
  return {
    sourceRevision: revision.ref.revision,
    displayName: revision.display_name,
    purpose: revision.purpose,
    members: revision.members.map(memberDraft),
    membershipPolicy: revision.governance.membership_policy_ref,
    auditPolicy: revision.evidence.audit_policy_ref,
    compositionConstraints: revision.composition_constraints ?? [],
    authorityRefs: revision.governance.authority_refs ?? [],
    changeReason: "",
  };
}

function validFingerprint(value: string | undefined): boolean {
  return Boolean(value && /^[a-f0-9]{64}$/i.test(value));
}

function revisionRefInput(entityKind: string, entityId: string, revision: string, fingerprint: string, label: string): Api.WorkforceRevisionRef {
  if (!entityId.trim() || !Number.isSafeInteger(Number(revision)) || Number(revision) < 1 || !validFingerprint(fingerprint.trim())) throw new Error(`${label} must include an ID, positive revision, and SHA-256 fingerprint.`);
  if (!(["workforce", "agent", "policy", "resource"] as const).includes(entityKind as Api.WorkforceRevisionRef["entity_kind"])) throw new Error(`${label} has an unsupported entity kind.`);
  return { entity_kind: entityKind as Api.WorkforceRevisionRef["entity_kind"], entity_id: entityId.trim(), revision: Number(revision), fingerprint: fingerprint.trim() };
}

function revisionMemberInput(member: WorkforceMemberDraft): Api.WorkforceRevisionMemberInput {
  if (!Shared.SAFE_IDENTIFIER.test(member.slotId.trim()) || !Shared.SAFE_IDENTIFIER.test(member.agentId.trim())) throw new Error("Member slot and Agent IDs support letters, numbers, dots, underscores, colons and dashes only.");
  const responsibilities = member.responsibilities.split(",").map(value => value.trim()).filter(Boolean);
  if (!responsibilities.length) throw new Error(`Member slot ${member.slotId.trim()} requires at least one responsibility.`);
  const agent_selector = member.selectorMode === "pinned"
    ? { mode: "pinned" as const, agent_id: member.agentId.trim(), pinned_revision_ref: revisionRefInput("agent", member.agentId, member.pinnedRevision, member.pinnedFingerprint, `Pinned Agent for ${member.slotId.trim()}`) }
    : { mode: "current_head_at_admission" as const, agent_id: member.agentId.trim() };
  const roleComplete = [member.roleId, member.roleRevision, member.roleFingerprint].some(value => value.trim());
  const role_ref = roleComplete ? revisionRefInput(member.roleKind, member.roleId, member.roleRevision, member.roleFingerprint, `Role for ${member.slotId.trim()}`) : undefined;
  return {
    slot_id: member.slotId.trim(),
    agent_selector,
    ...(role_ref ? { role_ref } : {}),
    responsibilities,
    capability_requirement_refs: member.capabilityRequirementRefs,
    authority_constraint_refs: member.authorityConstraintRefs,
    participation_constraint_refs: member.participationConstraintRefs,
  };
}

export function WorkforceRevisionCreate() {
  const { workforceId } = Router.useParams();
  const navigate = Router.useNavigate();
  const surface = useWorkforceSurface(workforceId ?? "");
  const [draft, setDraft] = React.useState<WorkforceRevisionDraft | null>(null);
  const [sourceRevision, setSourceRevision] = React.useState<number | null>(null);
  const [idempotencyKey, setIdempotencyKey] = React.useState(() => crypto.randomUUID());
  const [requestedAt, setRequestedAt] = React.useState(() => Date.now());
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const current = surface.data?.detail.currentRevision;
    if (current && sourceRevision !== current.ref.revision) {
      setDraft(revisionDraft(current));
      setSourceRevision(current.ref.revision);
      setError(null);
      setIdempotencyKey(crypto.randomUUID());
      setRequestedAt(Date.now());
    }
  }, [sourceRevision, surface.data?.detail.currentRevision]);

  if (!workforceId) return <Router.Navigate to="/workforces" replace />;
  const workforceKey = workforceId;
  const updateMember = (index: number, patch: Partial<WorkforceMemberDraft>) => setDraft(current => current ? { ...current, members: current.members.map((member, memberIndex) => memberIndex === index ? { ...member, ...patch } : member) } : current);
  const updatePolicy = (key: "membershipPolicy" | "auditPolicy", patch: Partial<Api.WorkforceRevisionRef>) => setDraft(current => current ? { ...current, [key]: { ...current[key], ...patch } } : current);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft || submitting) return;
    if (!draft.displayName.trim() || !draft.purpose.trim() || !draft.changeReason.trim()) { setError("Display name, purpose, and change reason are required."); return; }
    if (!draft.members.length) { setError("A Workforce successor must retain at least one member slot."); return; }
    if (new Set(draft.members.map(member => member.slotId.trim())).size !== draft.members.length) { setError("Member slot IDs must be unique."); return; }
    try {
      const membershipPolicyRef = revisionRefInput(draft.membershipPolicy.entity_kind, draft.membershipPolicy.entity_id, String(draft.membershipPolicy.revision), draft.membershipPolicy.fingerprint ?? "", "Membership policy");
      const auditPolicyRef = revisionRefInput(draft.auditPolicy.entity_kind, draft.auditPolicy.entity_id, String(draft.auditPolicy.revision), draft.auditPolicy.fingerprint ?? "", "Audit policy");
      const members = draft.members.map(revisionMemberInput);
      setSubmitting(true);
      setError(null);
      const created = await Api.productApi.createWorkforceRevision(workforceKey, {
        expectedRevision: draft.sourceRevision,
        displayName: draft.displayName.trim(),
        purpose: draft.purpose.trim(),
        members,
        compositionConstraints: draft.compositionConstraints,
        authorityRefs: draft.authorityRefs,
        membershipPolicyRef,
        auditPolicyRef,
        changeReason: draft.changeReason.trim(),
        idempotencyKey,
        requestedAt,
      });
      navigate(`/workforces/${encodeURIComponent(workforceKey)}/revisions/${created.identity.current_revision}`);
    } catch (cause) {
      setError(Shared.isApiConflict(cause)
        ? "The Workforce head changed after this form was loaded. Return to the current revision and create a new successor from that head."
        : Shared.apiErrorMessage(cause));
      setSubmitting(false);
    }
  }

  return <>
    <Router.Link className="back" to={`/workforces/${encodeURIComponent(workforceKey)}/revisions`}>← Back to revision history</Router.Link>
    <WorkforcePageHeader workforceId={workforceKey} title="Create Workforce revision" description="Prepare a full successor from the current canonical head. Historical revisions remain immutable." refresh={surface.refresh} loadState={surface.loadState} loadError={surface.loadError} />
    <WorkforceDetailLoading loadState={surface.loadState} data={surface.data} />
    {surface.data && !draft && <section className="panel"><div className="empty-state">The current revision does not expose the canonical policy references required to prepare a successor.</div></section>}
    {draft && <form className="panel form-panel" onSubmit={submit}><div className="panel-head"><div><h2>Successor of r{draft.sourceRevision}</h2><p>Save creates a new immutable revision through expected-head CAS. It never edits r{draft.sourceRevision}.</p></div><Shared.Badge tone="muted">expected r{draft.sourceRevision}</Shared.Badge></div><div className="panel-body form-grid"><label>Display name<input value={draft.displayName} onChange={event => setDraft(current => current ? { ...current, displayName: event.target.value } : current)} required /></label><label>Purpose<input value={draft.purpose} onChange={event => setDraft(current => current ? { ...current, purpose: event.target.value } : current)} required /></label><h3>Member composition</h3>{draft.members.map((member, index) => <section className="panel" key={`${member.slotId}-${index}`}><div className="panel-head"><div><h2>Member slot {index + 1}</h2><p>Canonical constraints already attached to this slot are preserved in the successor.</p></div><button className="secondary danger" type="button" disabled={draft.members.length === 1} onClick={() => setDraft(current => current ? { ...current, members: current.members.filter((_, memberIndex) => memberIndex !== index) } : current)}>Remove</button></div><div className="panel-body form-grid"><label>Slot ID<input value={member.slotId} onChange={event => updateMember(index, { slotId: event.target.value })} required /></label><label>Agent ID<input value={member.agentId} onChange={event => updateMember(index, { agentId: event.target.value })} required /></label><label>Resolution mode<select value={member.selectorMode} onChange={event => updateMember(index, { selectorMode: event.target.value as WorkforceMemberDraft["selectorMode"] })}><option value="current_head_at_admission">Current head at admission</option><option value="pinned">Pinned revision</option></select></label>{member.selectorMode === "pinned" && <><label>Pinned Agent revision<input type="number" min="1" value={member.pinnedRevision} onChange={event => updateMember(index, { pinnedRevision: event.target.value })} required /></label><label>Pinned Agent fingerprint<input value={member.pinnedFingerprint} onChange={event => updateMember(index, { pinnedFingerprint: event.target.value })} required /></label></>}<label>Responsibilities (comma separated)<input value={member.responsibilities} onChange={event => updateMember(index, { responsibilities: event.target.value })} required /></label><label>Role kind<select value={member.roleKind} onChange={event => updateMember(index, { roleKind: event.target.value })}><option value="resource">Resource</option><option value="agent">Agent</option><option value="policy">Policy</option><option value="workforce">Workforce</option></select></label><label>Role ID (optional)<input value={member.roleId} onChange={event => updateMember(index, { roleId: event.target.value })} /></label><label>Role revision<input type="number" min="1" value={member.roleRevision} onChange={event => updateMember(index, { roleRevision: event.target.value })} /></label><label>Role fingerprint<input value={member.roleFingerprint} onChange={event => updateMember(index, { roleFingerprint: event.target.value })} /></label></div></section>)}<div className="form-actions"><button className="secondary" type="button" onClick={() => setDraft(current => current ? { ...current, members: [...current.members, { slotId: "", agentId: "", selectorMode: "current_head_at_admission", pinnedRevision: "", pinnedFingerprint: "", roleKind: "resource", roleId: "", roleRevision: "", roleFingerprint: "", responsibilities: "", capabilityRequirementRefs: [], authorityConstraintRefs: [], participationConstraintRefs: [] }] } : current)}>Add member slot</button></div><h3>Canonical policies</h3><label>Membership policy ID<input value={draft.membershipPolicy.entity_id} onChange={event => updatePolicy("membershipPolicy", { entity_id: event.target.value })} required /></label><label>Membership policy revision<input type="number" min="1" value={draft.membershipPolicy.revision} onChange={event => updatePolicy("membershipPolicy", { revision: Number(event.target.value) })} required /></label><label>Membership policy fingerprint<input value={draft.membershipPolicy.fingerprint ?? ""} onChange={event => updatePolicy("membershipPolicy", { fingerprint: event.target.value })} required /></label><label>Audit policy ID<input value={draft.auditPolicy.entity_id} onChange={event => updatePolicy("auditPolicy", { entity_id: event.target.value })} required /></label><label>Audit policy revision<input type="number" min="1" value={draft.auditPolicy.revision} onChange={event => updatePolicy("auditPolicy", { revision: Number(event.target.value) })} required /></label><label>Audit policy fingerprint<input value={draft.auditPolicy.fingerprint ?? ""} onChange={event => updatePolicy("auditPolicy", { fingerprint: event.target.value })} required /></label><label>Change reason<input value={draft.changeReason} onChange={event => setDraft(current => current ? { ...current, changeReason: event.target.value } : current)} required /></label><div className="info-banner">Review: {draft.members.length} member slot{draft.members.length === 1 ? "" : "s"}; composition constraints and authority references are preserved from canonical r{draft.sourceRevision}. No Run is created.</div>{error && <div className="error-banner" role="alert">{error}</div>}<div className="form-actions"><button className="primary" type="submit" disabled={submitting}>{submitting ? "Creating revision..." : `Create canonical r${draft.sourceRevision + 1}`}</button></div></div></form>}
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
    <WorkforcePageHeader workforceId={workforceId} title={selectedRevision ? `Workforce revision r${selectedRevision}` : "Workforce revisions"} description="Immutable historical Workforce definitions. Current Agent heads never rewrite these references." refresh={surface.refresh} loadState={surface.loadState} loadError={surface.loadError} actions={!selectedRevision ? <Router.Link className="primary action-link" to={`/workforces/${encodeURIComponent(workforceId)}/revisions/new`}>Create revision</Router.Link> : undefined} />
    <WorkforceDetailLoading loadState={surface.loadState} data={surface.data} />
    {surface.data && <div className="dashboard-grid execution-grid"><section className="panel"><div className="panel-head"><div><h2>Revision history</h2><p>Choose a directly addressable revision.</p></div><Shared.Badge tone="muted">{surface.data.revisions.length}</Shared.Badge></div><div className="panel-body">{surface.data.revisions.map(item => <div className="catalog-row" key={item.ref.revision}><div className="catalog-row-main"><b>Revision r{item.ref.revision}{item.ref.revision === surface.data!.detail.currentRevision.ref.revision ? " · current" : ""}</b><small>{item.lifecycle_status} · committed by {item.commit.created_by}</small><p>{item.commit.change_reason}</p></div><Router.Link className="detail-link" to={`/workforces/${encodeURIComponent(workforceId)}/revisions/${item.ref.revision}`}>Inspect</Router.Link></div>)}</div></section><section className="panel"><div className="panel-head"><div><h2>{selected ? `Revision r${selected.ref.revision}` : "Revision unavailable"}</h2><p>{selected ? "Read-only historical composition." : "The requested revision is not returned by Product API."}</p></div>{selected && <WorkforceState state={selected.lifecycle_status} />}</div><div className="panel-body">{selected ? <><Shared.SummaryRow label="Revision ref" value={formatRevision(selected.ref)} /><Shared.SummaryRow label="Supersedes" value={selected.supersedes_revision ? `r${selected.supersedes_revision}` : "none"} /><Shared.SummaryRow label="Purpose" value={selected.purpose} /><MemberRows members={selected.members} /></> : <div className="empty-state">No matching historical revision.</div>}</div></section></div>}
  </>;
}

export function WorkforceRuns() {
  const { workforceId } = Router.useParams();
  const surface = useWorkforceSurface(workforceId ?? "");
  const runs = Shared.useOperationalSummary<Api.WorkforceRunListItem[]>(() => Api.productApi.listWorkforceRuns(workforceId ?? ""), "Unable to load Workforce Runs from Product API", () => false);
  if (!workforceId) return <Router.Navigate to="/workforces" replace />;
  return <>
    <WorkforcePageHeader workforceId={workforceId} title="Workforce Runs" description="Every row retains the exact Workforce revision admitted by the canonical Run." refresh={() => { surface.refresh(); runs.refresh(); }} loadState={runs.loadState === "loading" ? surface.loadState : runs.loadState} loadError={runs.loadError ?? surface.loadError} />
    <WorkforceDetailLoading loadState={surface.loadState} data={surface.data} />
    {runs.loadState === "loading" && !runs.data && <div className="loading-screen">Loading Workforce Runs...</div>}
    {runs.loadError && <div className="error-banner" role="alert">{runs.loadError}</div>}
    {runs.data && runs.data.length === 0 && <section className="panel"><div className="empty-state">No Run has admitted this Workforce yet. A future admission will retain the revision that was current at that time.</div></section>}
    {runs.data && runs.data.length > 0 && <section className="panel"><div className="panel-head"><div><h2>Admitted Runs</h2><p>Historical usage is read from canonical admission, never inferred from the current Workforce head.</p></div><Shared.Badge tone="muted">{runs.data.length}</Shared.Badge></div><div className="panel-body catalog-list">{runs.data.map(run => <div className="catalog-row" key={run.runId}><div className="catalog-row-main"><b>{run.runId}</b><small>{run.status} · admitted <Shared.Time value={run.admittedAt} /></small><p>Workforce revision r{run.admittedWorkforceRevision} · snapshot {run.membershipSnapshotId ?? "unavailable"}</p></div><div className="card-actions"><Router.Link className="detail-link" to={`/workforces/${encodeURIComponent(workforceId)}/revisions/${run.admittedWorkforceRevision}`}>View admitted revision</Router.Link><Router.Link className="detail-link" to={`/workforces/${encodeURIComponent(workforceId)}/operations?runId=${encodeURIComponent(run.runId)}`}>Investigate</Router.Link></div></div>)}</div></section>}
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
