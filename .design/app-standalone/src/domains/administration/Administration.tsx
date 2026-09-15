import * as Router from "react-router-dom";
import * as Api from "../../api/product-api";
import * as Shared from "../../shared";

export { GovernanceView, ProductionReadinessGateRow, ProductionReadinessTimeline } from "../governance/Governance";
export { OperationalReliabilityView, Settings, SystemView } from "../system/System";

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
