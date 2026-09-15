import * as Api from "../../api/product-api";
import * as Shared from "../../shared";

export function ProductionReadinessGateRow({ gate }: { gate: Api.ProductionReadinessReport["gates"][number] }) {
  const tone = gate.status === "pass" ? "good" : gate.status === "partial" ? "warn" : "muted";
  return <div className="catalog-row" key={gate.id}>
    <div className="catalog-row-main">
      <b>{gate.label}</b>
      <small className="mono">{gate.id} · {gate.responsibleDomain} · {gate.blockers.length} blockers</small>
      <p>{gate.dependencyOnFutureMilestones.join(" · ") || "No future milestone dependency"}</p>
    </div>
    <Shared.Badge tone={tone}>{gate.status}</Shared.Badge>
  </div>;
}

export function ProductionReadinessTimeline({
  title,
  meta,
  items,
  state,
  error,
  emptyMessage,
}: {
  title: string;
  meta: string;
  items: Shared.TimelineItem[];
  state: Shared.DashboardLoadState;
  error: string | null;
  emptyMessage: string;
}) {
  return <Shared.DashboardCard title={title} meta={meta} state={items.length > 0 ? "ready" : state} emptyMessage={emptyMessage}>
    {items.length > 0 && <Shared.TimelineList items={items} />}
    {state === "error" && <Shared.ErrorBanner error={error} />}
  </Shared.DashboardCard>;
}

export function GovernanceView() {
  const readiness = Shared.useOperationalSummary<Api.ProductionReadinessReport>(
    () => Api.productApi.getProductionReadinessReport(),
    "Unable to load production readiness from Product API",
    () => false,
  );
  const guardrails = Shared.useOperationalSummary<Api.SystemGuardrailsView>(
    () => Api.productApi.getSystemGuardrails(),
    "Unable to load system guardrails from Product API",
    () => false,
  );
  const configuration = Shared.useOperationalSummary<Api.SystemConfigurationView>(
    () => Api.productApi.getSystemConfiguration(),
    "Unable to load system configuration from Product API",
    () => false,
  );
  const policies = Shared.useOperationalSummary<Api.SystemPolicyVisibility[]>(
    () => Api.productApi.listSystemPolicies(),
    "Unable to load policy visibility from Product API",
    () => false,
  );
  const administration = Shared.useOperationalSummary<Api.SystemAdministrationView>(
    () => Api.productApi.getSystemAdministration(),
    "Unable to load administration boundary from Product API",
    () => false,
  );
  const tenants = Shared.useOperationalSummary<Api.SystemTenantsView>(
    () => Api.productApi.getSystemTenants(),
    "Unable to load tenant visibility from Product API",
    () => false,
  );
  const acceptance = Shared.useOperationalSummary<Api.Epic11AcceptanceReport>(
    () => Api.productApi.getEpic11AcceptanceReport(),
    "Unable to load EPIC-11 acceptance report from Product API",
    () => false,
  );
  const delegations = Shared.useOperationalSummary<readonly Api.DelegationGrantProjection[]>(
    () => Api.productApi.listDelegationGrants(),
    "Unable to load delegation grants from Product API",
    () => false,
  );
  const governanceBoundary = Shared.useOperationalSummary<Api.GovernanceBoundaryReport>(
    () => Api.productApi.getGovernanceBoundaryReport(),
    "Unable to load governance boundary from Product API",
    () => false,
  );

  const refreshAll = () => {
    readiness.refresh();
    guardrails.refresh();
    configuration.refresh();
    policies.refresh();
    administration.refresh();
    tenants.refresh();
    acceptance.refresh();
    delegations.refresh();
    governanceBoundary.refresh();
  };

  return <>
    <Shared.DomainHeader domain="Governance" title="Control Plane Boundaries" description="Guardrails, policy and configuration visibility. Tenant administration is represented through governed Product API projections." actions={<button className="secondary" onClick={refreshAll}>Refresh all</button>} />
    <Shared.ReportSectionNav sections={[{ id: "governance-guardrails", label: "Guardrails" }, { id: "governance-delegations", label: "Delegations" }, { id: "governance-readiness", label: "Readiness" }, { id: "governance-access", label: "Access boundary" }, { id: "governance-admin", label: "Administration" }, { id: "governance-tenants", label: "Tenants & isolation" }, { id: "governance-policies", label: "Policies" }, { id: "governance-configuration", label: "Configuration" }, { id: "governance-acceptance", label: "Acceptance" }, { id: "governance-caveats", label: "Caveats" }]} />
    <Shared.CrossLinks links={[{ to: "/system/operational-reliability", label: "Open operational reliability" }]} />
    {Shared.staleBanner(guardrails, "system guardrails")}
    {Shared.staleBanner(governanceBoundary, "governance boundary")}
    {Shared.staleBanner(delegations, "delegation grants")}
    <div className="flow-group" id="governance-delegations">
      <div className="flow-group-head"><h2>Delegation grants</h2><p>Tenant-scoped delegation and authority references, projected by the Product API.</p></div>
      <section className="panel">
        <div className="panel-head"><div><h2>Delegations</h2><p>Read-only grant projections. Redaction and reconstruction status remain as reported.</p></div><button className="secondary" onClick={delegations.refresh}>Refresh</button></div>
        {delegations.data?.length ? <div className="catalog-list">
          {delegations.data.map((grant, index) => {
            const source = grant.metadata.source;
            const metadata = grant.metadata;
            return <article className="catalog-row operational-record" key={[grant.grantId, index].join(":")}>
              <div className="catalog-row-main">
                <div className="operational-record-title"><b>{grant.grantId}</b><Shared.Badge tone={metadata.freshness === "CURRENT" ? "good" : "muted"}>{metadata.freshness}</Shared.Badge><Shared.Badge tone="muted">{source.addressing}</Shared.Badge>{metadata.reconstruction_state === "GAP" && <Shared.Badge tone="warn">RECONSTRUCTION GAP</Shared.Badge>}</div>
                <Shared.ProjectionStateBadges freshness={metadata.freshness} redactedFields={metadata.redacted_fields} reconstructionState={metadata.reconstruction_state} />
                <small className="mono">Tenant: {source.tenant_id} · Owner: {metadata.canonical_owner} · Projected <Shared.Time value={metadata.projected_at} /></small>
                <div className="summary-list">{Object.entries(grant.fields).map(([name, value]) => <Shared.SummaryRow key={name} label={name} value={Array.isArray(value) ? value.join(", ") : value === null ? "null" : typeof value === "object" ? JSON.stringify(value) : String(value)} />)}</div>
                {metadata.redacted_fields.length > 0 && <><Shared.InteractionStateNotice state="redacted" message="The Product API withheld the listed fields; disclosure is not authorized in this surface." /><Shared.IdList label="Redacted fields" ids={metadata.redacted_fields} /></>}
              </div>
              <div className="catalog-badges operational-correlation">{Object.entries(grant.references).flatMap(([kind, reference]) => (Array.isArray(reference) ? reference : [reference]).map((item, refIndex) => <span className="tag mono" key={[kind, item.kind, item.id, refIndex].join(":")}>{item.kind}: {item.id}</span>))}</div>
            </article>;
          })}
        </div> : <Shared.PanelStateLine state={delegations.loadState} error={delegations.loadError} unavailable={delegations.unavailable} emptyMessage="No delegation grants reported by the Product API." />}
      </section>
    </div>
    <div className="flow-group" id="governance-guardrails">
      <div className="flow-group-head"><h2>System guardrails</h2><p>Operational mode reported by the Product API — never inferred by this surface.</p></div>
      <div className="dashboard-grid execution-grid">
        <section className="panel wide">
          <div className="panel-head"><div><h2>Guardrail state</h2><p>Inspection, sandbox and read-only boundaries</p></div><Shared.Badge tone="warn">production ready = false</Shared.Badge></div>
          <div className="panel-body">
            {guardrails.data ? <>
              <div className="guardrail-banner" role="note"><span>Inspection mode</span><span>Sandbox only</span><span>Read-only</span><span>No mutable operations</span><span>Source of truth: product-api</span></div>
              <div className="summary-list">
                <Shared.SummaryRow label="Inspection mode" value={String(guardrails.data.inspectionMode)} tone="good" />
                <Shared.SummaryRow label="Sandbox only" value={String(guardrails.data.sandboxOnly)} tone="good" />
                <Shared.SummaryRow label="Read-only" value={String(guardrails.data.readOnly)} tone="good" />
                <Shared.SummaryRow label="Mutable operations" value={String(guardrails.data.mutableOperations)} tone="warn" />
                <Shared.SummaryRow label="Production ready" value={String(guardrails.data.productionReady)} tone="warn" />
              </div>
              <p className="panel-note">Future scope: {guardrails.data.futureScope.join(" · ")}</p>
            </> : <Shared.PanelStateLine state={guardrails.loadState} error={guardrails.loadError} emptyMessage="No guardrail data reported by the Product API." />}
            {guardrails.loadState === "error" && <Shared.ErrorBanner error={guardrails.loadError} />}
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group" id="governance-readiness">
      <div className="flow-group-head"><h2>Production readiness</h2><p>Readiness gates and boundaries projected by the Product API. This is evidence, not a production claim.</p></div>
      <div className="dashboard-grid execution-grid">
        <section className="panel wide">
          <div className="panel-head"><div><h2>Readiness status</h2><p>Current gate projection</p></div><Shared.Badge tone={readiness.data?.status === "blocked" || readiness.data?.status === "partial" ? "warn" : "muted"}>{readiness.data?.status ?? "unavailable"}</Shared.Badge></div>
          <div className="panel-body">
            {readiness.data ? <>
              <div className="guardrail-banner" role="note"><span>Production Ready: NO / not yet claimed</span><span>Billing Ready: NO</span><span>Administration Ready: NO</span><span>Tenant Governance Ready: NO</span><span>Source of truth: product-api</span></div>
              <div className="summary-list">
                <Shared.SummaryRow label="Production ready" value="NO / not yet claimed" tone="warn" />
                <Shared.SummaryRow label="Claim" value={readiness.data.claim} tone="warn" />
                <Shared.SummaryRow label="Environment" value={readiness.data.environment.current} />
                <Shared.SummaryRow label="Checked" value={new Date(readiness.data.checkedAt).toLocaleString()} />
                <Shared.SummaryRow label="Gates" value={readiness.data.summary.totalGates} />
                <Shared.SummaryRow label="Passed" value={readiness.data.summary.passed} tone="good" />
                <Shared.SummaryRow label="Partial" value={readiness.data.summary.partial} />
                <Shared.SummaryRow label="Blocked" value={readiness.data.summary.blocked} tone="warn" />
                <Shared.SummaryRow label="Deferred" value={readiness.data.summary.deferred} />
              </div>
              <p className="panel-note">{readiness.data.claimDiscipline.reason}</p>
            </> : <Shared.PanelStateLine state={readiness.loadState} error={readiness.loadError} emptyMessage="No production readiness reported by the Product API." />}
            {readiness.loadState === "error" && <Shared.ErrorBanner error={readiness.loadError} />}
          </div>
        </section>
      </div>
      <div className="dashboard-grid evidence-grid">
        <Shared.DashboardCard title="Readiness gates" meta="G01-G13 gate status" state={readiness.data ? "ready" : readiness.loadState} emptyMessage="No readiness gates reported">
          {readiness.data && <div className="catalog-list">{readiness.data.gates.map(gate => <ProductionReadinessGateRow gate={gate} key={gate.id} />)}</div>}
        </Shared.DashboardCard>
        <ProductionReadinessTimeline
          title="Blockers"
          meta="Production-blocking findings"
          items={(readiness.data?.blockers ?? []).map((finding, index) => ({
            id: `${finding.gateId}-${finding.code}-${index}`,
            title: `${finding.gateId} · ${finding.code}`,
            meta: `${finding.severity} · ${finding.responsibleDomain}`,
            detail: finding.message,
            tone: finding.severity === "critical" || finding.severity === "high" ? "warn" : undefined,
          }))}
          state={readiness.loadState}
          error={readiness.loadError}
          emptyMessage="No blockers reported."
        />
      </div>
      <div className="dashboard-grid evidence-grid">
        <ProductionReadinessTimeline
          title="Warnings"
          meta="Non-blocking readiness findings"
          items={(readiness.data?.warnings ?? []).map((finding, index) => ({
            id: `${finding.gateId}-${finding.code}-${index}`,
            title: `${finding.gateId} · ${finding.code}`,
            meta: `${finding.severity} · ${finding.responsibleDomain}`,
            detail: finding.message,
            tone: finding.severity === "critical" || finding.severity === "high" ? "warn" : undefined,
          }))}
          state={readiness.loadState}
          error={readiness.loadError}
          emptyMessage="No warnings reported."
        />
        <ProductionReadinessTimeline
          title="Caveats"
          meta="Honest limits of the current gate"
          items={(readiness.data?.caveats ?? []).map((finding, index) => ({
            id: `${finding.gateId}-${finding.code}-${index}`,
            title: `${finding.gateId} · ${finding.code}`,
            meta: `${finding.severity} · ${finding.responsibleDomain}`,
            detail: finding.message,
            tone: "warn",
          }))}
          state={readiness.loadState}
          error={readiness.loadError}
          emptyMessage="No caveats reported."
        />
      </div>
      <div className="dashboard-grid evidence-grid">
        <ProductionReadinessTimeline
          title="Deferred items"
          meta="Future milestone or EPIC scope"
          items={(readiness.data?.deferredItems ?? []).map((finding, index) => ({
            id: `${finding.gateId}-${finding.code}-${index}`,
            title: `${finding.gateId} · ${finding.code}`,
            meta: `${finding.severity} · ${finding.dependsOnFutureMilestone ?? "future scope"}`,
            detail: finding.message,
            tone: "muted",
          }))}
          state={readiness.loadState}
          error={readiness.loadError}
          emptyMessage="No deferred items reported."
        />
        <Shared.SummaryCard title="Next milestone dependencies" meta="Required follow-up milestones" state={readiness.data?.nextMilestoneDependencies.length ? "ready" : readiness.loadState} emptyMessage="No next milestone dependencies reported.">
          {readiness.data && <Shared.TimelineList items={readiness.data.nextMilestoneDependencies.map((dependency, index) => ({ id: `dependency-${index}`, title: dependency }))} />}
        </Shared.SummaryCard>
      </div>
      <div className="dashboard-grid evidence-grid">
        <Shared.DashboardCard title="Environment inventory" meta="Recognized environments and claim limits" state={readiness.data ? "ready" : readiness.loadState} emptyMessage="No environment inventory reported">
          {readiness.data && <Shared.TimelineList items={readiness.data.environment.recognized.map(environment => ({
            id: environment.id,
            title: environment.id,
            meta: environment.purpose,
            detail: environment.claimLimitations,
            tone: environment.id === readiness.data?.environment.current ? "warn" : "muted",
          }))} />}
        </Shared.DashboardCard>
        <Shared.DashboardCard title="Persistence inventory" meta="Durability and production-claim readiness" state={readiness.data ? "ready" : readiness.loadState} emptyMessage="No persistence inventory reported">
          {readiness.data && <Shared.TimelineList items={readiness.data.persistenceInventory.map(item => ({
            id: item.domain,
            title: item.domain,
            meta: `${item.classification} · survives restart: ${String(item.survivesRestart)}`,
            detail: item.note,
            tone: item.usableForProductionClaim ? "good" : "muted",
          }))} />}
        </Shared.DashboardCard>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Secrets boundary</h2><p>Redacted, referenced, or unavailable</p></div><Shared.Badge tone="muted">no raw secrets</Shared.Badge></div>
          <div className="panel-body">
            {readiness.data ? <>
              <div className="summary-list">
                <Shared.SummaryRow label="Storage" value={readiness.data.secretsBoundary.storage} tone="warn" />
                <Shared.SummaryRow label="Reference mode" value={readiness.data.secretsBoundary.referenceMode} />
                <Shared.SummaryRow label="UI disclosure" value={readiness.data.secretsBoundary.uiDisclosure} />
                <Shared.SummaryRow label="API disclosure" value={readiness.data.secretsBoundary.apiDisclosure} />
                <Shared.SummaryRow label="No-secret-leak validation" value={readiness.data.secretsBoundary.noSecretLeakValidation} />
                <Shared.SummaryRow label="Raw secrets exposed" value={String(readiness.data.secretsBoundary.rawSecretsExposed)} tone="good" />
              </div>
              <Shared.IdList label="Redaction expectations" ids={readiness.data.secretsBoundary.redactionExpectations} />
              <Shared.IdList label="Unsupported operations" ids={readiness.data.secretsBoundary.unsupportedOperations} />
              <Shared.TimelineList items={readiness.data.secretsBoundary.productionBlockers.map((message, index) => ({ id: `secret-blocker-${index}`, title: "Production blocker", detail: message, tone: "warn" }))} />
            </> : <Shared.PanelStateLine state={readiness.loadState} error={readiness.loadError} emptyMessage="No secrets boundary reported." />}
            {readiness.loadState === "error" && <Shared.ErrorBanner error={readiness.loadError} />}
          </div>
        </section>
        <Shared.SummaryCard title="Source evidence" meta="Files used for the readiness projection" state={readiness.data?.sourceEvidence.length ? "ready" : readiness.loadState} emptyMessage="No source evidence reported.">
          {readiness.data && <Shared.IdList label="Evidence" ids={readiness.data.sourceEvidence} />}
        </Shared.SummaryCard>
      </div>
    </div>
    <div className="flow-group" id="governance-access">
      <div className="flow-group-head"><h2>Governance & access boundary</h2><p>Actor, permission, read vs mutate, tenant awareness and administration limits reported by the Product API.</p></div>
      <div className="dashboard-grid execution-grid">
        <section className="panel wide">
          <div className="panel-head"><div><h2>Actor boundary</h2><p>Current actor identity and authentication limits</p></div><Shared.Badge tone={governanceBoundary.data?.actorBoundary.state === "authenticated" ? "good" : "warn"}>{governanceBoundary.data?.actorBoundary.state ?? "unavailable"}</Shared.Badge></div>
          <div className="panel-body">
            {governanceBoundary.data ? <>
              <div className="guardrail-banner" role="note"><span>Production Auth Claimed: NO</span><span>Administration Ready: NO</span><span>Tenant Governance Ready: NO</span><span>Claim: {governanceBoundary.data.claim}</span></div>
              <div className="summary-list">
                <Shared.SummaryRow label="Actor state" value={governanceBoundary.data.actorBoundary.state} />
                <Shared.SummaryRow label="Display name" value={governanceBoundary.data.actorBoundary.displayName} />
                <Shared.SummaryRow label="Source" value={governanceBoundary.data.actorBoundary.source} />
                <Shared.SummaryRow label="Production auth claimed" value="NO" tone="warn" />
              </div>
              <Shared.TimelineList items={governanceBoundary.data.actorBoundary.caveats.map((caveat, index) => ({ id: `actor-caveat-${index}`, title: "Actor caveat", detail: caveat, tone: "warn" }))} />
            </> : <Shared.PanelStateLine state={governanceBoundary.loadState} error={governanceBoundary.loadError} emptyMessage="No actor boundary reported by the Product API." />}
            {governanceBoundary.loadState === "error" && <Shared.ErrorBanner error={governanceBoundary.loadError} />}
          </div>
        </section>
      </div>
      <div className="dashboard-grid evidence-grid">
        <Shared.DashboardCard title="Permission baseline" meta="Representational permission categories" state={governanceBoundary.data ? "ready" : governanceBoundary.loadState} emptyMessage="No permission baseline reported.">
          {governanceBoundary.data && <div className="catalog-list">
            {governanceBoundary.data.permissionBaseline.map(permission => (
              <div className="catalog-row" key={permission.category}>
                <div className="catalog-row-main">
                  <b>{permission.label}</b>
                  <small className="mono">{permission.category} · read: {permission.readAuthority} · mutate: {permission.mutationAuthority}</small>
                  <p>{permission.reason}</p>
                </div>
                <Shared.Badge tone={permission.state === "allowed" ? "good" : permission.state === "blocked" ? "warn" : "muted"}>{permission.state}</Shared.Badge>
              </div>
            ))}
          </div>}
        </Shared.DashboardCard>
        <Shared.DashboardCard title="Read vs mutate authority" meta="Surfaces that may be inspected or mutated" state={governanceBoundary.data ? "ready" : governanceBoundary.loadState} emptyMessage="No authority surfaces reported.">
          {governanceBoundary.data && <div className="catalog-list">
            {governanceBoundary.data.readMutateAuthority.map(surface => (
              <div className="catalog-row" key={surface.surface}>
                <div className="catalog-row-main">
                  <b>{surface.label}</b>
                  <small className="mono">{surface.surface} · read: {surface.readAuthority} · mutate: {surface.mutationAuthority}</small>
                  <p>{surface.reason}</p>
                  {surface.notes.length > 0 && <small>{surface.notes.join(" · ")}</small>}
                </div>
              </div>
            ))}
          </div>}
        </Shared.DashboardCard>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Tenant boundary</h2><p>Historical boundary projection; current tenant administration is represented by governed projections below</p></div><Shared.Badge tone={governanceBoundary.data?.tenantBoundary.tenantAdminReady ? "warn" : "muted"}>{governanceBoundary.data?.tenantBoundary.state ?? "unavailable"}</Shared.Badge></div>
          <div className="panel-body">
            {governanceBoundary.data ? <>
              <div className="summary-list">
                <Shared.SummaryRow label="Tenant state" value={governanceBoundary.data.tenantBoundary.state} />
                <Shared.SummaryRow label="Tenant admin ready" value="NO" tone="warn" />
                <Shared.SummaryRow label="Isolation indicators" value={governanceBoundary.data.tenantBoundary.isolationIndicators.length} />
              </div>
              <p className="panel-note">This EPIC-12 projection is retained as historical boundary evidence. Tenant Administration was delivered by EPIC-15.</p>
              <Shared.IdList label="Declared isolation" ids={governanceBoundary.data.tenantBoundary.isolationIndicators} />
              <Shared.TimelineList items={governanceBoundary.data.tenantBoundary.caveats.map((caveat, index) => ({ id: `tenant-caveat-${index}`, title: "Tenant caveat", detail: caveat, tone: "warn" }))} />
            </> : <Shared.PanelStateLine state={governanceBoundary.loadState} error={governanceBoundary.loadError} emptyMessage="No tenant boundary reported by the Product API." />}
            {governanceBoundary.loadState === "error" && <Shared.ErrorBanner error={governanceBoundary.loadError} />}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Administration boundary</h2><p>Historical EPIC-12 projection; current tenant administration is represented by the canonical Governance surface</p></div><Shared.Badge tone="warn">{governanceBoundary.data?.administrationBoundary.state ?? "unavailable"}</Shared.Badge></div>
          <div className="panel-body">
            {governanceBoundary.data ? <>
              <div className="summary-list">
                <Shared.SummaryRow label="Administration ready" value="NO" tone="warn" />
                <Shared.SummaryRow label="State" value={governanceBoundary.data.administrationBoundary.state} />
                <Shared.SummaryRow label="Allowed actions" value={governanceBoundary.data.administrationBoundary.allowedActions.length} />
              </div>
              <Shared.IdList label="Allowed inspection actions" ids={governanceBoundary.data.administrationBoundary.allowedActions} />
              <Shared.TimelineList items={governanceBoundary.data.administrationBoundary.deniedActions.map((entry, index) => ({ id: `admin-denied-${index}`, title: `${entry.permission} · ${entry.action}`, meta: entry.gateDependency, detail: entry.reason, tone: "warn" }))} />
              <Shared.TimelineList items={governanceBoundary.data.administrationBoundary.unsupportedActions.map((entry, index) => ({ id: `admin-unsupported-${index}`, title: `${entry.permission} · ${entry.action}`, meta: entry.gateDependency, detail: entry.reason, tone: "muted" }))} />
              <Shared.IdList label="Deferred administration" ids={governanceBoundary.data.administrationBoundary.deferredActions} />
            </> : <Shared.PanelStateLine state={governanceBoundary.loadState} error={governanceBoundary.loadError} emptyMessage="No administration boundary reported by the Product API." />}
            {governanceBoundary.loadState === "error" && <Shared.ErrorBanner error={governanceBoundary.loadError} />}
          </div>
        </section>
      </div>
      <div className="dashboard-grid evidence-grid">
        <Shared.DashboardCard title="Access decisions" meta="Allowed, denied, unsupported and deferred decisions" state={governanceBoundary.data?.accessDecisions.length ? "ready" : governanceBoundary.loadState} emptyMessage="No access decisions reported.">
          {governanceBoundary.data && <Shared.TimelineList items={governanceBoundary.data.accessDecisions.map(entry => ({
            id: entry.id,
            title: `${entry.permission} · ${entry.action}`,
            meta: `${entry.decision} · ${entry.enforcement} · ${entry.gateDependency}`,
            detail: entry.reason,
            tone: entry.decision === "allowed" ? "good" : entry.decision === "denied" ? "warn" : "muted",
          }))} />}
        </Shared.DashboardCard>
        <Shared.DashboardCard title="Audit / evidence correlation" meta="Honest status of access decision traceability" state={governanceBoundary.data ? "ready" : governanceBoundary.loadState} emptyMessage="No audit correlation status reported.">
          {governanceBoundary.data && <>
            <div className="summary-list">
              <Shared.SummaryRow label="Correlation state" value={governanceBoundary.data.auditCorrelation.state} />
            </div>
            <p className="panel-note">{governanceBoundary.data.auditCorrelation.note}</p>
            <Shared.IdList label="Evidence" ids={governanceBoundary.data.auditCorrelation.evidence} />
          </>}
        </Shared.DashboardCard>
      </div>
      <div className="dashboard-grid evidence-grid">
        <Shared.SummaryCard title="Claim discipline" meta="Claims that this milestone cannot make" state={governanceBoundary.data ? "ready" : governanceBoundary.loadState} emptyMessage="No claim discipline reported.">
          {governanceBoundary.data && <>
            <div className="summary-list">
              <Shared.SummaryRow label="Production ready claim" value="NO" tone="warn" />
              <Shared.SummaryRow label="Billing ready claim" value="NO" tone="warn" />
              <Shared.SummaryRow label="Administration ready claim" value="NO" tone="warn" />
              <Shared.SummaryRow label="Tenant governance ready claim" value="NO" tone="warn" />
            </div>
            <p className="panel-note">{governanceBoundary.data.claimDiscipline.reason}</p>
          </>}
        </Shared.SummaryCard>
        <Shared.DashboardCard title="Readiness gate dependencies" meta="Gates consumed by this governance projection" state={governanceBoundary.data?.readinessGateDependencies.length ? "ready" : governanceBoundary.loadState} emptyMessage="No readiness gate dependencies reported.">
          {governanceBoundary.data && <Shared.IdList label="Gates" ids={governanceBoundary.data.readinessGateDependencies} />}
        </Shared.DashboardCard>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Caveats & deferred scope</h2><p>Honest limits of the current boundary</p></div></div>
          <div className="panel-body">
            {governanceBoundary.data ? <>
              <Shared.TimelineList items={governanceBoundary.data.caveats.map((caveat, index) => ({ id: `governance-caveat-${index}`, title: "Caveat", detail: caveat, tone: "warn" }))} />
              <Shared.IdList label="Deferred items" ids={governanceBoundary.data.deferredItems} />
            </> : <Shared.PanelStateLine state={governanceBoundary.loadState} error={governanceBoundary.loadError} emptyMessage="No caveats reported by the Product API." />}
          </div>
        </section>
        <Shared.SummaryCard title="Source evidence" meta="Files and contracts used for the governance projection" state={governanceBoundary.data?.sourceEvidence.length ? "ready" : governanceBoundary.loadState} emptyMessage="No source evidence reported.">
          {governanceBoundary.data && <Shared.IdList label="Evidence" ids={governanceBoundary.data.sourceEvidence} />}
        </Shared.SummaryCard>
      </div>
    </div>
    <div className="flow-group" id="governance-admin">
      <div className="flow-group-head"><h2>Administration boundary</h2><p>Historical EPIC-11 boundary; the canonical Governance surface remains read-only and Product API governed.</p></div>
      <div className="dashboard-grid execution-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Administration</h2><p>Boundary visibility without mutations</p></div><Shared.Badge tone="muted">unavailable</Shared.Badge></div>
          <div className="panel-body">
            {administration.data ? <>
              <p className="panel-note">{administration.data.reason}</p>
              <Shared.IdList label="Boundary notes" ids={administration.data.notes} />
            </> : <Shared.PanelStateLine state={administration.loadState} error={administration.loadError} emptyMessage="No administration boundary reported." />}
            {administration.loadState === "error" && <Shared.ErrorBanner error={administration.loadError} />}
          </div>
        </section>
        <Shared.BlockedPanel title="Legacy administration projection" note="Historical EPIC-11 read model" reason={administration.data?.reason ?? "This legacy projection does not expose mutations; current tenant and secret operations are available from dedicated governed surfaces."} />
      </div>
    </div>
    <div className="flow-group" id="governance-tenants">
      <div className="flow-group-head"><h2>Tenants & isolation</h2><p>This view keeps isolation evidence; current tenant lifecycle and governance remain represented by the governed Product API projections.</p></div>
      <div className="dashboard-grid execution-grid">
        <section className="panel wide">
          <div className="panel-head"><div><h2>Isolation visibility</h2><p>Declared worker isolation modes, reported by the Product API</p></div><Shared.Badge tone="muted">future scope</Shared.Badge></div>
          <div className="panel-body">
            {tenants.data ? <>
              <p className="panel-note">{tenants.data.reason}</p>
              {tenants.data.isolationVisibility.length ? (
                <div className="catalog-list">
                  {tenants.data.isolationVisibility.map(worker => (
                    <div className="catalog-row" key={worker.workerId}>
                      <div className="catalog-row-main"><b className="mono">{worker.workerId}</b><small>tenant isolation: {String(worker.tenantIsolation)} · workload isolation: {String(worker.workloadIsolation)}</small><p>declared modes: {worker.declaredIsolationModes.join(", ") || "none declared"}</p></div>
                      <Shared.Badge tone={worker.tenantIsolation || worker.workloadIsolation ? "good" : "muted"}>{worker.tenantIsolation || worker.workloadIsolation ? "isolated" : "declared"}</Shared.Badge>
                    </div>
                  ))}
                </div>
              ) : <Shared.EmptyState message="No worker isolation data reported by the Product API." />}
              <Shared.EntityRefList refs={tenants.data.isolationVisibility.map(worker => ({ entityType: "worker", entityId: worker.workerId }))} />
            </> : <Shared.PanelStateLine state={tenants.loadState} error={tenants.loadError} emptyMessage="No tenant visibility reported." />}
            {tenants.loadState === "error" && <Shared.ErrorBanner error={tenants.loadError} />}
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group" id="governance-policies">
      <div className="flow-group-head"><h2>Policies</h2><p>Policy visibility only — mutations are governed by the Product API or deferred to a future EPIC.</p></div>
      <div className="dashboard-grid execution-grid">
        <section className="panel wide">
          <div className="panel-head"><div><h2>Policy visibility</h2><p>Read-only policy inventory</p></div><Shared.Badge tone="muted">{policies.data?.length ?? 0}</Shared.Badge></div>
          <div className="panel-body">
            {policies.data?.length ? (
              <div className="catalog-list">
                {policies.data.map(policy => (
                  <div className="catalog-row" key={policy.id}>
                    <div className="catalog-row-main"><b>{policy.label}</b><small className="mono">{policy.id}</small><p>{policy.note}</p></div>
                    <Shared.Badge tone={policy.availability === "unavailable" ? "muted" : "good"}>{policy.availability}</Shared.Badge>
                  </div>
                ))}
              </div>
            ) : <Shared.PanelStateLine state={policies.loadState} error={policies.loadError} emptyMessage="No policy visibility reported." />}
            {policies.loadState === "error" && <Shared.ErrorBanner error={policies.loadError} />}
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group" id="governance-configuration">
      <div className="flow-group-head"><h2>Configuration</h2><p>Read-only configuration visibility. No settings mutation in this milestone.</p></div>
      <div className="dashboard-grid execution-grid">
        <Shared.SummaryCard title="Configuration visibility" meta="Inspection mode, memory backends" state={configuration.data ? "ready" : configuration.loadState}>
          {configuration.data ? <>
            <div className="metrics">
              <Shared.Metric label="Mode" value={configuration.data.mode} note={configuration.data.readOnly ? "read-only" : "mutable"} />
              <Shared.Metric label="Automation" value={configuration.data.automation} note="manual refresh only" />
              <Shared.Metric label="Refresh window" value={`${configuration.data.refreshWindowMs}ms`} note="snapshot cadence" />
              <Shared.Metric label="Persistence" value={configuration.data.persistenceBackend} note="memory only" />
            </div>
            <div className="id-list">
              <span>Backends</span>
              <div>
                <code className="mono">secrets: {configuration.data.secretBackend}</code>
                <code className="mono">settlement: {configuration.data.settlementBackend}</code>
              </div>
            </div>
            {configuration.data.notices.map(note => <p className="panel-note" key={note}>{note}</p>)}
          </> : <Shared.PanelStateLine state={configuration.loadState} error={configuration.loadError} emptyMessage="No configuration reported by the Product API." />}
          {configuration.loadState === "error" && <Shared.ErrorBanner error={configuration.loadError} />}
        </Shared.SummaryCard>
      </div>
    </div>
    <div className="flow-group" id="governance-acceptance">
      <div className="flow-group-head"><h2>EPIC-11 acceptance</h2><p>Read-only milestone gate projection. It reports what was validated and never fabricates checks.</p></div>
      <div className="dashboard-grid execution-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Milestone status</h2><p>{acceptance.data?.title ?? "Acceptance report"}</p></div><Shared.Badge tone={acceptance.data?.milestoneStatuses.some(milestone => milestone.status === "PASS_WITH_CAVEAT") ? "warn" : "good"}>{acceptance.data?.milestone ?? "F"}</Shared.Badge></div>
          <div className="panel-body">
            {acceptance.data ? (
              <div className="catalog-list">
                {acceptance.data.milestoneStatuses.map(milestone => (
                  <div className="catalog-row" key={milestone.id}>
                    <div className="catalog-row-main"><b>{milestone.label}</b><small>{milestone.evidence}</small></div>
                    <Shared.Badge tone={milestone.status === "PASS" ? "good" : "warn"}>{milestone.status}</Shared.Badge>
                  </div>
                ))}
              </div>
            ) : <Shared.PanelStateLine state={acceptance.loadState} error={acceptance.loadError} emptyMessage="No acceptance report available." />}
            {acceptance.loadState === "error" && <Shared.ErrorBanner error={acceptance.loadError} />}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Validation summary</h2><p>Checks performed at milestone close</p></div></div>
          <div className="panel-body">
            {acceptance.data ? <>
              <div className="summary-list">
                <Shared.SummaryRow label="Production ready" value={String(acceptance.data.productionReadiness.ready)} tone="warn" />
                <Shared.SummaryRow label="Readiness status" value={acceptance.data.productionReadiness.status} tone="warn" />
                <Shared.SummaryRow label="Supported surfaces" value={acceptance.data.supportedSurfaces.length} />
                <Shared.SummaryRow label="Deferred items" value={acceptance.data.deferredItems.length} />
              </div>
              <p className="panel-note">{acceptance.data.productionReadiness.note}</p>
              <Shared.TimelineList items={acceptance.data.validationSummary.map(check => ({ id: check.id, title: check.label, meta: check.status, detail: check.evidence, tone: check.status === "pass" ? "good" : check.status === "caveat" ? "warn" : "muted" }))} />
            </> : <Shared.PanelStateLine state={acceptance.loadState} error={acceptance.loadError} emptyMessage="No acceptance report available." />}
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group" id="governance-caveats">
      <div className="flow-group-head"><h2>Known caveats & deferred scope</h2><p>Honest boundary of the EPIC-11 gate.</p></div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Known caveats</h2><p>What the gate did not run</p></div></div>
          <div className="panel-body">
            {acceptance.data ? (acceptance.data.knownCaveats.length
              ? <Shared.TimelineList items={acceptance.data.knownCaveats.map((caveat, index) => ({ id: `caveat-${index}`, title: "Caveat", detail: caveat, tone: "warn" }))} />
              : <Shared.EmptyState message="No caveats recorded." />) : <Shared.PanelStateLine state={acceptance.loadState} error={acceptance.loadError} emptyMessage="No acceptance report available." />}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Deferred items</h2><p>Future EPIC scope</p></div></div>
          <div className="panel-body">
            {acceptance.data ? (acceptance.data.deferredItems.length
              ? <Shared.TimelineList items={acceptance.data.deferredItems.map((item, index) => ({ id: `deferred-${index}`, title: item }))} />
              : <Shared.EmptyState message="No deferred items recorded." />) : <Shared.PanelStateLine state={acceptance.loadState} error={acceptance.loadError} emptyMessage="No acceptance report available." />}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Supported surfaces</h2><p>EPIC-11 operational surface</p></div></div>
          <div className="panel-body">
            {acceptance.data ? (acceptance.data.supportedSurfaces.length
              ? <Shared.TimelineList items={acceptance.data.supportedSurfaces.map((surface, index) => ({ id: `surface-${index}`, title: surface }))} />
              : <Shared.EmptyState message="No supported surfaces reported." />) : <Shared.PanelStateLine state={acceptance.loadState} error={acceptance.loadError} emptyMessage="No acceptance report available." />}
          </div>
        </section>
      </div>
    </div>
  </>;
}
