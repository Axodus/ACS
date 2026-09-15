import * as Api from "../../api/product-api";
import * as Shared from "../../shared";

export function SystemView() {
  const readiness = Shared.useOperationalSummary<Api.ProductionReadinessReport>(
    () => Api.productApi.getProductionReadinessReport(),
    "Unable to load system readiness from Product API",
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

  const refreshAll = () => {
    readiness.refresh();
    guardrails.refresh();
    configuration.refresh();
  };

  return <>
    <Shared.DomainHeader domain="System" title="System" description="Readiness, class-owned settings visibility, environment context and diagnostics from existing Product API projections." actions={<button className="secondary" onClick={refreshAll}>Refresh all</button>} />
    <Shared.ReportSectionNav sections={[{ id: "system-readiness", label: "Readiness" }, { id: "system-configuration", label: "Configuration" }, { id: "system-diagnostics", label: "Diagnostics" }, { id: "system-settings", label: "Settings ownership" }]} />
    <div className="dashboard-grid" id="system-readiness">
      <Shared.DashboardCard title="Readiness" meta="Evidence-bounded status from Product API" state={readiness.data ? "ready" : readiness.loadState} emptyMessage="No readiness projection reported.">
        {readiness.data && <div className="summary-list">
          <Shared.SummaryRow label="Status" value={readiness.data.status} tone={readiness.data.status === "blocked" || readiness.data.status === "partial" ? "warn" : "muted"} />
          <Shared.SummaryRow label="Environment" value={readiness.data.environment.current} />
          <Shared.SummaryRow label="Gates" value={readiness.data.summary.totalGates} />
          <Shared.SummaryRow label="Blocked" value={readiness.data.summary.blocked} tone="warn" />
          <Shared.SummaryRow label="Claim" value="not claimed" tone="warn" />
        </div>}
        {readiness.loadState === "error" && <Shared.ErrorBanner error={readiness.loadError} />}
        <Shared.CrossLinks links={[{ to: "/readiness", label: "Open readiness evidence" }]} />
      </Shared.DashboardCard>
      <Shared.DashboardCard title="Environment & topology" meta="Current class-owned configuration projection" state={configuration.data ? "ready" : configuration.loadState} emptyMessage="No system configuration reported.">
        {configuration.data && <div className="summary-list">
          <Shared.SummaryRow label="Mode" value={configuration.data.mode} />
          <Shared.SummaryRow label="Automation" value={configuration.data.automation} tone="muted" />
          <Shared.SummaryRow label="Persistence backend" value={configuration.data.persistenceBackend} />
          <Shared.SummaryRow label="Secret backend" value={configuration.data.secretBackend} tone="muted" />
          <Shared.SummaryRow label="Settlement backend" value={configuration.data.settlementBackend} tone="muted" />
        </div>}
        {configuration.loadState === "error" && <Shared.ErrorBanner error={configuration.loadError} />}
      </Shared.DashboardCard>
      <Shared.DashboardCard title="System guardrails" meta="Inspection, sandbox and mutation boundaries" state={guardrails.data ? "ready" : guardrails.loadState} emptyMessage="No system guardrails reported.">
        {guardrails.data && <div className="summary-list">
          <Shared.SummaryRow label="Inspection mode" value={String(guardrails.data.inspectionMode)} tone="good" />
          <Shared.SummaryRow label="Sandbox only" value={String(guardrails.data.sandboxOnly)} tone="good" />
          <Shared.SummaryRow label="Read-only" value={String(guardrails.data.readOnly)} tone="good" />
          <Shared.SummaryRow label="Mutable operations" value={String(guardrails.data.mutableOperations)} tone="warn" />
        </div>}
        {guardrails.loadState === "error" && <Shared.ErrorBanner error={guardrails.loadError} />}
      </Shared.DashboardCard>
    </div>
    <div className="dashboard-grid" id="system-diagnostics">
      <Shared.DashboardCard title="Reliability & diagnostics" meta="Existing diagnostic surfaces remain independently addressable" state="ready">
        <Shared.CrossLinks links={[{ to: "/system/operational-reliability", label: "Open operational reliability" }, { to: "/logs", label: "Open logs" }, { to: "/audit", label: "Open audit" }]} />
      </Shared.DashboardCard>
      <Shared.DashboardCard title="Settings ownership" meta="Class-owned settings index" state="ready">
        <p className="panel-note">Each domain remains the owner of its settings. This System surface indexes visibility and does not create a global settings aggregate.</p>
        <Shared.CrossLinks links={[{ to: "/settings", label: "Open settings visibility" }]} />
      </Shared.DashboardCard>
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

export function Settings() {
  return <>
    <Shared.DomainHeader domain="System" title="Settings" description="Workspace and configuration visibility. This is not a production administration console." />
    <section className="panel"><div className="panel-head"><div><h2>ACS Workspace</h2><p>Local paths used by the current control plane.</p></div></div><div className="form"><label>Workspace path<input className="mono" readOnly defaultValue="~/.openclaw" /></label></div></section>
  </>;
}
