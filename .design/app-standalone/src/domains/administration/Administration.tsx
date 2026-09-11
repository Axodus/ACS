import * as Router from "react-router-dom";
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
    governanceBoundary.refresh();
  };

  return <>
    <Shared.DomainHeader domain="Governance" title="Control Plane Boundaries" description="Guardrails, policy and configuration visibility. Current tenant administration is available from the Administration navigation surface." actions={<button className="secondary" onClick={refreshAll}>Refresh all</button>} />
    <Shared.CrossLinks links={[{ to: "/system/operational-reliability", label: "Open operational reliability" }]} />
    {Shared.staleBanner(guardrails, "system guardrails")}
    {Shared.staleBanner(governanceBoundary, "governance boundary")}
    <div className="flow-group">
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
    <div className="flow-group">
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
    <div className="flow-group">
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
          <div className="panel-head"><div><h2>Tenant boundary</h2><p>Historical boundary projection; use Administration for the delivered tenant control plane</p></div><Shared.Badge tone={governanceBoundary.data?.tenantBoundary.tenantAdminReady ? "warn" : "muted"}>{governanceBoundary.data?.tenantBoundary.state ?? "unavailable"}</Shared.Badge></div>
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
          <div className="panel-head"><div><h2>Administration boundary</h2><p>Historical EPIC-12 projection; operational tenant administration is now linked from the main shell</p></div><Shared.Badge tone="warn">{governanceBoundary.data?.administrationBoundary.state ?? "unavailable"}</Shared.Badge></div>
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
    <div className="flow-group">
      <div className="flow-group-head"><h2>Administration boundary</h2><p>Historical EPIC-11 boundary; use Tenant Administration for the current governed surface.</p></div>
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
    <div className="flow-group">
      <div className="flow-group-head"><h2>Tenants & isolation</h2><p>This historical view keeps isolation evidence; current tenant lifecycle and governance live in Tenant Administration.</p></div>
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
    <div className="flow-group">
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
    <div className="flow-group">
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
    <div className="flow-group">
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
    <div className="flow-group">
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

export function OperationalReliabilityView() {
  const reliability = Shared.useOperationalSummary<Api.OperationalReliabilityReport>(
    () => Api.productApi.getOperationalReliabilityReport(),
    "Unable to load operational reliability from Product API",
    () => false,
  );

  const findingItems = (findings: Api.OperationalReliabilityReport["blockers"], tone: "good" | "warn" | "muted") =>
    findings.map((finding, index) => ({
      id: `${finding.code}-${index}`,
      title: finding.code,
      meta: `${finding.severity} · ${finding.responsibleDomain}`,
      detail: finding.message,
      tone,
    }));

  return <>
    <Shared.DomainHeader domain="System" title="Runtime Confidence & Recovery" description="Read-only projection of long-running operations, runtime/worker confidence and distributed operation caveats." actions={<button className="secondary" onClick={reliability.refresh}>Refresh</button>} />
    {Shared.staleBanner(reliability, "operational reliability")}
    <div className="flow-group">
      <div className="flow-group-head"><h2>Reliability summary</h2><p>Evidence-bounded state reported by the Product API, never inferred by this surface.</p></div>
      <div className="dashboard-grid execution-grid">
        <section className="panel wide">
          <div className="panel-head"><div><h2>Operational reliability status</h2><p>Current projection and claim discipline</p></div><Shared.Badge tone={reliability.data?.operationalReliabilityReady ? "good" : "warn"}>not ready / evidence-bounded</Shared.Badge></div>
          <div className="panel-body">
            {reliability.data ? <>
              <div className="guardrail-banner" role="note"><span>Production Ready: NO / not yet claimed</span><span>Operational Reliability Ready: NO / not overclaimed</span><span>Claim: {reliability.data.claim}</span><span>Source of truth: product-api</span></div>
              <div className="summary-list">
                <Shared.SummaryRow label="Operations tracked" value={reliability.data.summary.operationsTracked} />
                <Shared.SummaryRow label="Running" value={reliability.data.summary.running} />
                <Shared.SummaryRow label="Succeeded" value={reliability.data.summary.succeeded} tone="good" />
                <Shared.SummaryRow label="Failed" value={reliability.data.summary.failed} tone="warn" />
                <Shared.SummaryRow label="Blocked" value={reliability.data.summary.blocked} tone="warn" />
                <Shared.SummaryRow label="Stale" value={reliability.data.summary.stale} tone="warn" />
                <Shared.SummaryRow label="Recovering" value={reliability.data.summary.recovering} />
                <Shared.SummaryRow label="Checked" value={new Date(reliability.data.checkedAt).toLocaleString()} />
              </div>
              <p className="panel-note">{reliability.data.claimDiscipline.reason}</p>
            </> : <Shared.PanelStateLine state={reliability.loadState} error={reliability.loadError} emptyMessage="No operational reliability reported by the Product API." />}
            {reliability.loadState === "error" && <Shared.ErrorBanner error={reliability.loadError} />}
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head"><h2>Operation model</h2><p>Long-running operation types, availability and unsupported reasons.</p></div>
      <div className="dashboard-grid evidence-grid">
        <Shared.DashboardCard title="Operation state model" meta="Supported, unsupported, unavailable and deferred operation types" state={reliability.data ? "ready" : reliability.loadState} emptyMessage="No operation state model reported.">
          {reliability.data && <Shared.TimelineList items={reliability.data.operationStateModel.map((entry) => ({
            id: entry.type,
            title: entry.label,
            meta: `${entry.type} · ${entry.state}`,
            detail: entry.reason,
            tone: entry.state === "supported" ? "good" : entry.state === "not_applicable" ? "muted" : "warn",
          }))} />}
        </Shared.DashboardCard>
        <Shared.DashboardCard title="Long-running operations" meta="Observed operations or honest unavailable state" state={reliability.data ? "ready" : reliability.loadState} emptyMessage="No long-running operations reported.">
          {reliability.data && (reliability.data.longRunningOperations.length
            ? <Shared.TimelineList items={reliability.data.longRunningOperations.map((operation) => ({
                id: operation.id,
                title: `${operation.type} · ${operation.targetEntity}`,
                meta: `${operation.state} · retry: ${operation.retryAvailability} · recovery: ${operation.recoveryAvailability}`,
                detail: operation.reason ?? operation.caveats.join(" · "),
                tone: operation.state === "succeeded" ? "good" : operation.state === "failed" || operation.state === "blocked" || operation.stale ? "warn" : "muted",
              }))} /> : <Shared.EmptyState message="No long-running operations are reported; unsupported and unavailable states are explicit in the operation state model." />)}
        </Shared.DashboardCard>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head"><h2>Runtime & worker confidence</h2><p>Control-plane assertions, runtime observations and external target state are reported separately.</p></div>
      <div className="dashboard-grid evidence-grid">
        <Shared.DashboardCard title="Runtime confidence" meta="Runtime and execution target observations" state={reliability.data ? "ready" : reliability.loadState} emptyMessage="No runtime confidence reported.">
          {reliability.data && <Shared.TimelineList items={reliability.data.runtimeConfidence.map((item) => ({
            id: item.id,
            title: item.id,
            meta: `${item.state} · ${item.healthState} · confidence: ${item.confidenceLevel} · ${item.sourceOfObservation}`,
            detail: item.caveats.join(" · "),
            tone: item.state === "running" || item.state === "ready" ? "good" : item.stale || item.state === "failed" ? "warn" : "muted",
          }))} />}
        </Shared.DashboardCard>
        <Shared.DashboardCard title="Worker confidence" meta="Registered worker state and unsupported operations" state={reliability.data ? "ready" : reliability.loadState} emptyMessage="No worker confidence reported.">
          {reliability.data && <Shared.TimelineList items={reliability.data.workerConfidence.map((item) => ({
            id: item.id,
            title: item.id,
            meta: `${item.state} · ${item.healthState} · confidence: ${item.confidenceLevel} · ${item.capacitySummary}`,
            detail: `${item.unsupportedOperations.join(" · ")}${item.caveats.length ? ` · ${item.caveats.join(" · ")}` : ""}`,
            tone: item.state === "available" ? "good" : item.stale || item.state === "failed" ? "warn" : "muted",
          }))} />}
        </Shared.DashboardCard>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head"><h2>Distributed operations</h2><p>Supported, partial and unavailable scenarios without simulated distributed success.</p></div>
      <div className="dashboard-grid execution-grid">
        <section className="panel wide">
          <div className="panel-head"><div><h2>Distributed scenario matrix</h2><p>{reliability.data?.distributedOperations.status ?? "unavailable"}</p></div><Shared.Badge tone={reliability.data?.distributedOperations.status === "supported" ? "good" : "warn"}>{reliability.data?.distributedOperations.status ?? "unavailable"}</Shared.Badge></div>
          <div className="panel-body">
            {reliability.data ? <>
              <Shared.TimelineList items={reliability.data.distributedOperations.scenarios.map((scenario) => ({
                id: scenario.id,
                title: scenario.label,
                meta: scenario.status,
                detail: scenario.reason,
                tone: scenario.status === "supported" ? "good" : scenario.status === "partial" ? "warn" : "muted",
              }))} />
              <Shared.TimelineList items={reliability.data.distributedOperations.caveats.map((caveat, index) => ({ id: `distributed-caveat-${index}`, title: "Distributed caveat", detail: caveat, tone: "warn" }))} />
            </> : <Shared.PanelStateLine state={reliability.loadState} error={reliability.loadError} emptyMessage="No distributed operations matrix reported." />}
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head"><h2>Recovery semantics & findings</h2><p>Retry, cancellation, recovery and evidence-linkage availability.</p></div>
      <div className="dashboard-grid evidence-grid">
        <Shared.DashboardCard title="Recovery semantics" meta="Availability is explicit; visibility is not automation" state={reliability.data ? "ready" : reliability.loadState} emptyMessage="No recovery semantics reported.">
          {reliability.data && <Shared.TimelineList items={reliability.data.recoverySemantics.map((entry) => ({
            id: entry.id,
            title: entry.label,
            meta: entry.state,
            detail: entry.reason,
            tone: entry.state === "available" ? "good" : entry.state === "unsupported" || entry.state === "unavailable" ? "warn" : "muted",
          }))} />}
        </Shared.DashboardCard>
        <Shared.DashboardCard title="Blockers & warnings" meta="High-severity reliability blockers and evidence gaps" state={reliability.data ? "ready" : reliability.loadState} emptyMessage="No reliability findings reported.">
          {reliability.data && <>
            <Shared.TimelineList items={findingItems(reliability.data.blockers, "warn")} />
            <Shared.TimelineList items={findingItems(reliability.data.warnings, "warn")} />
          </>}
        </Shared.DashboardCard>
      </div>
      <div className="dashboard-grid evidence-grid">
        <Shared.DashboardCard title="Caveats" meta="Honest limits of the current projection" state={reliability.data ? "ready" : reliability.loadState} emptyMessage="No caveats reported.">
          {reliability.data && <Shared.TimelineList items={findingItems(reliability.data.caveats, "warn")} />}
        </Shared.DashboardCard>
        <Shared.DashboardCard title="Deferred items" meta="Future milestone or EPIC scope" state={reliability.data ? "ready" : reliability.loadState} emptyMessage="No deferred items reported.">
          {reliability.data && <Shared.TimelineList items={reliability.data.deferredItems.map((finding, index) => ({
            id: `${finding.code}-${index}`,
            title: finding.code,
            meta: `${finding.severity} · ${finding.dependsOnFutureMilestone ?? "future scope"}`,
            detail: finding.message,
            tone: "muted",
          }))} />}
        </Shared.DashboardCard>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head"><h2>Gate dependencies & evidence</h2><p>Readiness gates consumed by this projection and source files used to build it.</p></div>
      <div className="dashboard-grid evidence-grid">
        <Shared.SummaryCard title="Claim discipline" meta="Claims that this milestone cannot make" state={reliability.data ? "ready" : reliability.loadState} emptyMessage="No claim discipline reported.">
          {reliability.data && <>
            <div className="summary-list">
              <Shared.SummaryRow label="Production ready claim" value="NO" tone="warn" />
              <Shared.SummaryRow label="Operational reliability ready claim" value="NO" tone="warn" />
            </div>
            <p className="panel-note">{reliability.data.claimDiscipline.reason}</p>
          </>}
        </Shared.SummaryCard>
        <Shared.DashboardCard title="Readiness gate dependencies" meta="Gates consumed by the operational reliability projection" state={reliability.data?.readinessGateDependencies.length ? "ready" : reliability.loadState} emptyMessage="No readiness gate dependencies reported.">
          {reliability.data && <Shared.IdList label="Gates" ids={reliability.data.readinessGateDependencies} />}
        </Shared.DashboardCard>
      </div>
      <div className="dashboard-grid evidence-grid">
        <Shared.SummaryCard title="Source evidence" meta="Files and contracts used for the reliability projection" state={reliability.data?.sourceEvidence.length ? "ready" : reliability.loadState} emptyMessage="No source evidence reported.">
          {reliability.data && <Shared.IdList label="Evidence" ids={reliability.data.sourceEvidence} />}
        </Shared.SummaryCard>
      </div>
    </div>
  </>;
}


export function AdministrationOverview() {
  const { data: summary, loadState, loadError, stale, refresh } = Shared.useOperationalSummary<Api.DashboardSummary>(
    () => Api.productApi.getDashboardSummary(),
    "Unable to load dashboard summary from Product API",
    data => data.system.stale,
  );

  const cardState = (count: number | undefined): Shared.DashboardCardState => {
    if (!summary && loadState === "loading") return "loading";
    if (!summary && loadState === "error") return "error";
    if (summary && loadState === "refreshing") return "refreshing";
    return count !== undefined && count > 0 ? "ready" : "empty";
  };

  const readyState: Shared.DashboardLoadState = summary ? (loadState === "refreshing" ? "refreshing" : "ready") : loadState;
  const generatedAt = summary ? new Date(summary.system.generatedAt).toLocaleTimeString() : "--";
  const checkedAt = summary ? new Date(summary.system.checkedAt).toLocaleTimeString() : "--";
  const connectivityTone = summary?.runtime.connectivity === "connected" ? "good" : summary?.runtime.connectivity === "degraded" ? "warn" : "muted";
  const readinessTone = summary && summary.readiness.blockerCount > 0 ? "warn" : "good";
  const profileTone = summary?.activeProfile.status === "development_profile" ? "muted" : summary?.activeProfile.status === "blocked" ? "warn" : "good";

  return <>
    <Shared.DomainHeader domain="Administration" title="Administration Overview" description="Environment profile, active composition, readiness, certified capabilities and global certification boundaries." actions={<button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadError ? "Retry" : loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>} />
    <div className="review-flow" aria-label="Administration review journey">
      <span>Environment</span><span>Composition</span><span>Readiness</span><span>Capabilities</span><span>Global caveats</span>
    </div>
    <Shared.OperationalModeNotice guardrails={summary?.system.guardrails} />
    {stale && <div className="stale-banner" role="status">Showing a stale dashboard snapshot. Refresh to recover live state.</div>}
    {loadState === "refreshing" && <div className="refresh-banner" role="status">Refreshing dashboard and readiness...</div>}
    {loadError && <div className="error-banner" role="alert">{loadError}</div>}
    <div className="dashboard-grid">
      <Shared.DashboardCard title="Active environment" meta="Current process profile and expected readiness" state={readyState}>
        <div className="summary-list">
          <Shared.SummaryRow label="Profile" value={summary?.activeProfile.activeProfile ?? "unavailable"} tone={profileTone} />
          <Shared.SummaryRow label="Expectation" value={summary?.activeProfile.expectedReadiness ?? "unavailable"} tone={profileTone} />
          <Shared.SummaryRow label="Status" value={summary?.activeProfile.status ?? "unavailable"} tone={profileTone} />
        </div>
        <p className="panel-note">{summary?.activeProfile.message ?? "No active profile was reported."}</p>
      </Shared.DashboardCard>
      <Shared.DashboardCard title="Attention" meta="Blockers and warnings requiring review" state={readyState}>
        <div className="summary-list">
          <Shared.SummaryRow label="Readiness" value={summary?.readiness.state ?? "unknown"} tone={readinessTone} />
          <Shared.SummaryRow label="Blockers" value={summary?.readiness.blockerCount ?? "unavailable"} tone={readinessTone} />
          <Shared.SummaryRow label="Warnings" value={summary?.readiness.warningCount ?? "unavailable"} />
          <Shared.SummaryRow label="Critical findings" value={summary?.blockers.length ?? "unavailable"} tone={(summary?.blockers.length ?? 0) > 0 ? "warn" : "muted"} />
        </div>
        <Shared.CrossLinks links={[{ to: "/readiness", label: "Inspect readiness evidence" }, { to: "/operational-execution", label: "Inspect operations" }, { to: "/agents", label: "Inspect affected agents" }]} />
      </Shared.DashboardCard>
      <Shared.DashboardCard title="Critical blockers" meta="Failures against the active profile expectation" state={cardState(summary?.blockers.length)} emptyMessage="No critical blockers reported for the active profile">
        <div className="finding-list">{summary?.blockers.map(finding => <Shared.FindingRow key={`${finding.code}-${finding.message}`} finding={finding} />)}</div>
      </Shared.DashboardCard>
      <Shared.DashboardCard title="Active composition" meta="Truthful local process configuration" state={readyState}>
        <div className="summary-list">
          <Shared.SummaryRow label="Identity" value={summary?.activeComposition.identity ?? "unavailable"} />
          <Shared.SummaryRow label="Secrets" value={summary?.activeComposition.secrets ?? "unavailable"} />
          <Shared.SummaryRow label="Persistence" value={summary?.activeComposition.persistence ?? "unavailable"} />
          <Shared.SummaryRow label="Telemetry" value={summary?.activeComposition.telemetry ?? "unavailable"} />
          <Shared.SummaryRow label="Workers" value={summary?.activeComposition.workers ?? "unavailable"} />
          <Shared.SummaryRow label="Deployment" value={summary?.activeComposition.deployment ?? "unavailable"} />
        </div>
      </Shared.DashboardCard>
      <Shared.DashboardCard title="Operational warnings" meta="Non-blocking operational signals and development characteristics" state={cardState(summary?.warnings.filter(finding => finding.category !== "global-caveat").length)} emptyMessage="No operational warnings reported">
        <div className="finding-list">{summary?.warnings.filter(finding => finding.category !== "global-caveat").map(finding => <Shared.FindingRow key={`${finding.code}-${finding.message}`} finding={finding} />)}</div>
      </Shared.DashboardCard>
      <Shared.DashboardCard title="Certified platform capability" meta="Available for documented certified topologies; not necessarily active locally" state={cardState(summary?.certifiedCapabilities.length)} emptyMessage="No certified capability projection reported">
        <div className="finding-list">
          {summary?.certifiedCapabilities.map(capability => <div className="finding-row info" key={capability.id}><Shared.FindingSeverity severity="info" /><p><b>{capability.label}</b> — {capability.status} · {capability.topology}<small>{capability.detail}</small></p></div>)}
        </div>
      </Shared.DashboardCard>
      <Shared.DashboardCard title="Global caveats" meta="Limits on global claims, not active local errors" state={cardState(summary?.globalCaveats.length)} emptyMessage="No global caveats reported">
        <div className="finding-list">{summary?.globalCaveats.map(finding => <Shared.FindingRow key={`${finding.code}-${finding.message}`} finding={finding} />)}</div>
      </Shared.DashboardCard>
      <Shared.DashboardCard title="System context" meta="Product API boundary and freshness" state={readyState}>
        <div className="summary-list">
          <Shared.SummaryRow label="Service" value={summary?.system.service ?? "unavailable"} />
          <Shared.SummaryRow label="Product API status" value={summary?.system.status ?? "unavailable"} />
          <Shared.SummaryRow label="Mode" value={summary?.system.mode ?? "unavailable"} />
          <Shared.SummaryRow label="Access" value="read-only inspection" />
          <Shared.SummaryRow label="Generated" value={generatedAt} />
          <Shared.SummaryRow label="Checked" value={checkedAt} />
          <Shared.SummaryRow label="Snapshot" value={stale ? "stale" : "current snapshot"} tone={stale ? "warn" : "muted"} />
        </div>
      </Shared.DashboardCard>
      <Shared.DashboardCard title="Readiness vs connectivity" meta="These dimensions remain separate" state={readyState}>
        <div className="summary-list">
          <Shared.SummaryRow label="Readiness" value={summary?.readiness.state ?? "unknown"} tone={readinessTone} />
          <Shared.SummaryRow label="Runtime connectivity" value={summary?.runtime.connectivity ?? "unavailable"} tone={connectivityTone} />
          <Shared.SummaryRow label="Evidence domains" value={summary?.readiness.evidenceCount ?? "unavailable"} />
        </div>
        <p className="panel-note">Connected does not mean ready. Ready does not mean healthy. Each label is taken from its Product API field.</p>
        <Router.Link className="surface-link" to="/readiness">Open global readiness →</Router.Link>
      </Shared.DashboardCard>
      <Shared.DashboardCard title="Agent inventory" meta="Lifecycle counts, not health claims" state={cardState(summary?.agents.total)} emptyMessage="No agents registered">
        <div className="summary-list">
          <Shared.SummaryRow label="Total" value={summary?.agents.total ?? 0} />
          <Shared.SummaryRow label="Active lifecycle" value={summary?.agents.active ?? 0} />
          <Shared.SummaryRow label="Draft" value={summary?.agents.draft ?? 0} />
          <Shared.SummaryRow label="Disabled" value={summary?.agents.disabled ?? 0} />
          <Shared.SummaryRow label="Archived" value={summary?.agents.archived ?? 0} tone="muted" />
        </div>
        <Router.Link className="surface-link" to="/agents">Open Agents →</Router.Link>
      </Shared.DashboardCard>
      <Shared.DashboardCard title="Operations snapshot" meta="Deployment, runtime and execution counts" state={cardState((summary?.deployments.total ?? 0) + (summary?.runtimes.total ?? 0) + (summary?.executionRuns.total ?? 0))} emptyMessage="No operational records">
        <div className="summary-list">
          <Shared.SummaryRow label="Deployed" value={summary?.deployments.deployed ?? 0} />
          <Shared.SummaryRow label="Runtimes running" value={summary?.runtimes.running ?? 0} />
          <Shared.SummaryRow label="Execution runs running" value={summary?.executionRuns.running ?? 0} />
          <Shared.SummaryRow label="Failed runs" value={summary?.executionRuns.failed ?? 0} tone={(summary?.executionRuns.failed ?? 0) > 0 ? "warn" : "muted"} />
        </div>
        <Router.Link className="surface-link" to="/operational-execution">Open Operations →</Router.Link>
      </Shared.DashboardCard>
    </div>
  </>;
}

export function Settings() {
  return <>
    <Shared.DomainHeader domain="System" title="Settings" description="Workspace and configuration visibility. This is not a production administration console." />
    <section className="panel"><div className="panel-head"><div><h2>ACS Workspace</h2><p>Local paths used by the current control plane.</p></div></div><div className="form"><label>Workspace path<input className="mono" readOnly defaultValue="~/.openclaw" /></label></div></section>
  </>;
}
