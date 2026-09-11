import * as Router from "react-router-dom";
import * as Icons from "@phosphor-icons/react";
import * as Api from "../../api/product-api";
import * as Shared from "../../shared";

export function Readiness() {
  const { data: summary, loadState, loadError, stale, refresh } = Shared.useOperationalSummary<Api.GlobalReadinessSummary>(
    () => Api.productApi.getGlobalReadinessSummary(),
    "Unable to load readiness from Product API",
    data => data.stale,
  );

  const cardState = (count: number | undefined): Shared.DashboardCardState => {
    if (!summary && loadState === "loading") return "loading";
    if (!summary && loadState === "error") return "error";
    if (summary && loadState === "refreshing") return "refreshing";
    return count !== undefined && count > 0 ? "ready" : "empty";
  };
  const readyState: Shared.DashboardLoadState = summary ? (loadState === "refreshing" ? "refreshing" : "ready") : loadState;
  const flag = (id: string) => summary?.readinessFlags.find(item => item.id === id);
  const checkedAt = summary ? new Date(summary.productApi.checkedAt).toLocaleTimeString() : "--";
  const connectivityTone = summary?.runtime.connectivity === "connected" ? "good" : summary?.runtime.connectivity === "degraded" ? "warn" : "muted";
  const blockerTone = summary && summary.readiness.blockerCount > 0 ? "warn" : "good";

  return <>
    <Shared.DomainHeader domain="System" title="Global Readiness & Health" description="Read-only inspection of ACS readiness, blockers, evidence and Product API health." actions={<button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadError ? "Retry" : loadState === "refreshing" ? "Rechecking" : "Recheck"}</button>} />
    <Shared.OperationalModeNotice guardrails={summary?.guardrails} />
    {stale && <div className="stale-banner" role="status">Showing a stale readiness snapshot. Recheck to recover live state.</div>}
    {loadState === "refreshing" && <div className="refresh-banner" role="status">Rechecking readiness and health...</div>}
    {loadError && <div className="error-banner" role="alert">{loadError}</div>}
    <div className="dashboard-grid readiness-grid">
      <Shared.DashboardCard title="Product API health" meta="Boundary and inspection mode" state={readyState}>
        <div className="summary-list">
          <Shared.SummaryRow label="Service" value={summary?.productApi.service ?? "--"} />
          <Shared.SummaryRow label="Status" value={summary?.productApi.status ?? "--"} tone="good" />
          <Shared.SummaryRow label="Mode" value={summary?.productApi.mode ?? "--"} />
          <Shared.SummaryRow label="Automation" value={summary?.productApi.automation ?? "--"} />
          <Shared.SummaryRow label="Access" value="read-only" />
          <Shared.SummaryRow label="Check mode" value={summary?.productApi.checkMode ?? "--"} />
          <Shared.SummaryRow label="Checked" value={checkedAt} />
        </div>
      </Shared.DashboardCard>
      <Shared.DashboardCard title="System dashboard" meta="Operational blockers and warnings" state={readyState}>
        <div className="summary-list">
          <Shared.SummaryRow label="Readiness" value={summary?.readiness.status ?? "--"} tone={blockerTone} />
          <Shared.SummaryRow label="Blockers" value={summary?.readiness.blockerCount ?? 0} tone={blockerTone} />
          <Shared.SummaryRow label="Warnings" value={summary?.readiness.warningCount ?? 0} />
          <Shared.SummaryRow label="Evidence domains" value={summary?.readiness.evidenceCount ?? 0} />
        </div>
        <Router.Link className="surface-link" to="/">Open system dashboard →</Router.Link>
      </Shared.DashboardCard>
      <Shared.DashboardCard title="Runtime connectivity" meta="Engine probe results" state={cardState(summary?.runtime.engines.length)} emptyMessage="No engines probed">
        <div className="summary-list">
          <Shared.SummaryRow label="Connectivity" value={summary?.runtime.connectivity ?? "--"} tone={connectivityTone} />
          <Shared.SummaryRow label="Engines" value={summary?.runtime.engines.length ?? 0} />
          <Shared.SummaryRow label="Checked" value={summary ? new Date(summary.runtime.checkedAt).toLocaleTimeString() : "--"} />
        </div>
        {summary && summary.runtime.engines.length > 0 && <div className="engine-list">{summary.runtime.engines.map(engine => <span key={engine.id}><i />{engine.id}<code>{engine.status}</code></span>)}</div>}
      </Shared.DashboardCard>
      <Shared.ReadinessFlagCard title="DEV readiness" meta="Local control plane capability" flag={flag("dev")} state={readyState} />
      <Shared.ReadinessFlagCard title="Distributed Runtime readiness" meta="Engine and target capability" flag={flag("distributed-runtime")} state={readyState} />
      <Shared.ReadinessFlagCard title="Production readiness" meta="Production blockers and evidence" flag={flag("production")} state={readyState} />
    </div>
    <div className="dashboard-grid readiness-grid">
      <Shared.DashboardCard title="Health indicators" meta="Live Product API health signals" state={cardState(summary?.healthIndicators.length)} emptyMessage="No health indicators available">
        <div className="health-list">
          {summary?.healthIndicators.map(indicator => <div className="health-row" key={indicator.id}><div><b>{indicator.label}</b><small>{indicator.detail}</small></div><Shared.ReadinessStatus status={indicator.status} /></div>)}
        </div>
      </Shared.DashboardCard>
      <Shared.DashboardCard title="Component status" meta="Consolidated domain readiness" state={cardState(summary?.components.length)} emptyMessage="No component status available">
        <div className="component-list">
          {summary?.components.map(component => <div className="component-row" key={component.domain}><div><b>{component.domain}</b><small>{component.currentState}</small></div><Shared.ReadinessStatus status={component.status} /></div>)}
        </div>
      </Shared.DashboardCard>
      <Shared.DashboardCard title="Snapshot consistency" meta="Refresh and stale-state contract" state={readyState}>
        <div className="summary-list">
          <Shared.SummaryRow label="State" value={stale ? "Stale" : "Fresh"} tone={stale ? "warn" : "good"} />
          <Shared.SummaryRow label="Refresh window" value={`${summary?.refreshWindowMs ?? 0}ms`} />
          <Shared.SummaryRow label="Snapshot age" value={`${summary?.stateAgeMs ?? 0}ms`} />
          <Shared.SummaryRow label="Read-only" value="Guaranteed" tone="good" />
        </div>
      </Shared.DashboardCard>
      <Shared.DashboardCard title="Readiness blockers" meta="Production-blocking findings" state={cardState(summary?.blockers.length)} emptyMessage="No readiness blockers">
        <div className="finding-list">{summary?.blockers.map(finding => <Shared.ReadinessFindingRow key={`${finding.domain}-${finding.component}`} finding={finding} />)}</div>
      </Shared.DashboardCard>
      <Shared.DashboardCard title="Operational warnings" meta="Non-blocking readiness findings" state={cardState(summary?.warnings.length)} emptyMessage="No operational warnings">
        <div className="finding-list">{summary?.warnings.map(finding => <Shared.ReadinessFindingRow key={`${finding.domain}-${finding.component}-${finding.reason}`} finding={finding} />)}</div>
      </Shared.DashboardCard>
      <Shared.DashboardCard title="Readiness evidence" meta="Domain evidence used for status" state={cardState(summary?.evidence.length)} emptyMessage="No readiness evidence available">
        <div className="evidence-list">
          {summary?.evidence.map(domain => <details className="evidence-item" key={domain.domain}><summary><b>{domain.domain}</b><Shared.ReadinessStatus status={domain.status} /></summary><p>{domain.currentState}</p><ul>{domain.evidence.map(path => <li key={path} className="mono">{path}</li>)}</ul></details>)}
        </div>
      </Shared.DashboardCard>
    </div>
  </>;
}

export function CustomerDashboard() {
  const dashboard = Shared.useOperationalSummary<Api.DashboardSummary>(
    () => Api.productApi.getDashboardSummary(),
    "Unable to load the customer dashboard from Product API",
    data => data.system.stale,
  );
  const economics = Shared.useOperationalSummary<Api.EconomicSummary>(
    () => Api.productApi.getEconomicSummary(),
    "Unable to load financial activity",
    data => data.checkedAt < Date.now() - 60_000,
  );
  const activity = Shared.useOperationalSummary<Api.EventRecord[]>(
    () => Api.productApi.listEvents(),
    "Unable to load recent activity",
    records => records.some(record => record.createdAt < Date.now() - 24 * 60 * 60_000),
  );

  const summary = dashboard.data;
  const operationalBlockers = (summary?.blockers ?? []).filter(finding => finding.category === "operational");
  const operationalWarnings = (summary?.warnings ?? []).filter(finding => finding.category === "operational" && finding.code !== "INSPECTION_MODE");
  const attention = [...operationalBlockers, ...operationalWarnings].slice(0, 5);
  const failedOperations = (summary?.executionRuns.failed ?? 0) + (summary?.deployments.failed ?? 0) + (summary?.deployments.rejected ?? 0);
  const unavailableWorkers = (summary?.workers.degraded ?? 0) + (summary?.workers.unavailable ?? 0) + (summary?.workers.stale ?? 0);
  const health = !summary
    ? "UNAVAILABLE"
    : operationalBlockers.length > 0 || failedOperations > 0
      ? "DEGRADED"
      : attention.length > 0 || unavailableWorkers > 0
        ? "ATTENTION"
        : "HEALTHY";
  const completionTotal = (summary?.executionRuns.completed ?? 0) + (summary?.executionRuns.failed ?? 0) + (summary?.executionRuns.cancelled ?? 0);
  const successRate = completionTotal > 0 ? Math.round(((summary?.executionRuns.completed ?? 0) / completionTotal) * 100) : null;
  const economicValue = (value: string | number | undefined, unit?: string) => value === undefined || value === null || value === "" ? "No data" : `${value}${unit ? ` ${unit}` : ""}`;
  const rootState: Shared.DashboardLoadState = summary ? (dashboard.loadState === "refreshing" ? "refreshing" : "ready") : dashboard.loadState;
  const events = [...(activity.data ?? [])].sort((left, right) => right.createdAt - left.createdAt).slice(0, 6);
  const agentProgress = summary && summary.agents.total > 0 ? (summary.agents.active / summary.agents.total) * 100 : 0;
  const workerProgress = summary && summary.workers.total > 0 ? (summary.workers.available / summary.workers.total) * 100 : 0;
  const executionProgress = summary && summary.executionRuns.total > 0 ? (summary.executionRuns.completed / summary.executionRuns.total) * 100 : 0;
  const executionLifecycle = [
    { label: "Completed", value: summary?.executionRuns.completed ?? 0, tone: "completed" },
    { label: "Running", value: summary?.executionRuns.running ?? 0, tone: "running" },
    { label: "Failed", value: summary?.executionRuns.failed ?? 0, tone: "failed" },
    { label: "Pending", value: (summary?.executionRuns.pending ?? 0) + (summary?.executionRuns.cancelled ?? 0), tone: "pending" },
  ];
  const maxExecutionLifecycle = Math.max(...executionLifecycle.map(item => item.value), 1);
  const economicStages = [
    { label: "Estimated", value: Number(economics.data?.totalEstimated ?? 0), display: economicValue(economics.data?.totalEstimated, economics.data?.unit) },
    { label: "Reserved", value: Number(economics.data?.totalReserved ?? 0), display: economicValue(economics.data?.totalReserved, economics.data?.unit) },
    { label: "Metered", value: Number(economics.data?.totalMetered ?? 0), display: economicValue(economics.data?.totalMetered, economics.data?.unit) },
    { label: "Settled", value: Number(economics.data?.totalSettled ?? 0), display: economicValue(economics.data?.totalSettled, economics.data?.unit) },
  ];
  const maxEconomicValue = Math.max(...economicStages.map(stage => Number.isFinite(stage.value) ? stage.value : 0), 1);
  const serviceRows = [
    { label: "Control Plane", status: summary?.system.status === "ok" ? "healthy" : "unavailable" },
    { label: "Runtime", status: summary?.runtime.connectivity ?? "unavailable" },
    { label: "Workers", status: (summary?.workers.available ?? 0) > 0 ? "available" : (summary?.workers.total ?? 0) > 0 ? "degraded" : "unavailable" },
    { label: "Deployments", status: (summary?.deployments.failed ?? 0) > 0 ? "degraded" : "healthy" },
  ];

  return <div className="dashboard-canvas">
    <Shared.DomainHeader domain="Dashboard" title="Welcome back, Operator" description="Here is what is happening across your ACS environment." actions={<button className="secondary" disabled={dashboard.loadState === "loading" || dashboard.loadState === "refreshing"} onClick={() => { dashboard.refresh(); economics.refresh(); activity.refresh(); }}>{dashboard.loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>} />
    {dashboard.stale && <div className="stale-banner" role="status">Showing a stale operational snapshot. Refresh to recover live state.</div>}
    {dashboard.loadError && <div className="error-banner" role="alert">{dashboard.loadError}</div>}

    <section className={`dashboard-health dashboard-health-${health.toLowerCase()}`} aria-labelledby="dashboard-health-title">
      <span className="dashboard-health-icon" aria-hidden="true">{health === "HEALTHY" ? <Icons.ShieldCheck size={25} weight="fill" /> : health === "UNAVAILABLE" ? <Icons.Pulse size={25} weight="bold" /> : <Icons.WarningOctagon size={25} weight="fill" />}</span>
      <div className="dashboard-health-copy"><span className="dashboard-eyebrow">Overall health</span><h2 id="dashboard-health-title">{health}</h2><p>{health === "HEALTHY" ? "Core operational signals are healthy." : health === "ATTENTION" ? "Operational signals need review; no critical customer-impacting failure is active." : health === "DEGRADED" ? "A customer-impacting execution, deployment or worker condition needs action." : "Operational health is unavailable until the Product API responds."}</p></div>
      <div className="dashboard-health-meta"><span>Environment <b>{summary?.activeProfile.activeProfile ?? "unavailable"}</b></span><span>Last checked <b>{summary ? new Date(summary.system.checkedAt).toLocaleTimeString() : "--"}</b></span></div>
    </section>

    <div className="dashboard-kpis" aria-label="Key operational indicators">
      <Shared.DashboardMetric label="Active Agents" value={summary?.agents.active ?? "--"} context={summary ? `${summary.agents.total} total agents` : "Loading current inventory"} action="View Agents" to="/agents" icon={<Icons.Robot size={25} weight="fill" />} accent="agents" progress={agentProgress} />
      <Shared.DashboardMetric label="Executions" value={summary?.executionRuns.total ?? "--"} context={summary ? `${summary.executionRuns.running} running now` : "Loading execution state"} action="View Executions" to="/executions" icon={<Icons.PlayCircle size={25} weight="fill" />} accent="executions" progress={executionProgress} />
      <Shared.DashboardMetric label="Active Customers" value="—" context="Tenant count is not exposed by the current read model" action="Tenant Administration" to={Api.productApiConfig.tenantAdministrationUrl} icon={<Icons.UsersThree size={25} weight="fill" />} accent="customers" progress={null} />
      <Shared.DashboardMetric label="Usage" value={economicValue(economics.data?.totalMetered, economics.data?.unit)} context={economics.loadError ? "Financial data unavailable" : "Current operational metering"} action="View Financial Operations" to="/economics" icon={<Icons.CurrencyDollar size={25} weight="fill" />} accent="usage" progress={null} />
      <Shared.DashboardMetric label="Workers" value={summary?.workers.available ?? "--"} context={summary ? `${summary.workers.availableSlots} open slots` : "Loading worker capacity"} action="View Workers" to="/workers" icon={<Icons.HardDrives size={25} weight="fill" />} accent="workers" progress={workerProgress} />
      <Shared.DashboardMetric label="Requires Attention" value={attention.length} context={`${operationalBlockers.length} critical operational findings`} action="Review Operations" to="/operations" icon={<Icons.WarningOctagon size={25} weight="fill" />} accent="attention" progress={Math.min(100, (attention.length / 5) * 100)} />
    </div>

    <div className="dashboard-cockpit-grid">
      <Shared.CockpitPanel title="Execution Activity" meta="Current execution lifecycle distribution" state={rootState} className="cockpit-execution" accent="executions" action={<Router.Link className="cockpit-action" to="/executions">View all<Icons.ArrowRight size={13} weight="bold" /></Router.Link>}>
        <div className="execution-chart" role="img" aria-label={`${summary?.executionRuns.completed ?? 0} completed, ${summary?.executionRuns.running ?? 0} running, ${summary?.executionRuns.failed ?? 0} failed and ${(summary?.executionRuns.pending ?? 0) + (summary?.executionRuns.cancelled ?? 0)} pending or other executions`}>
          <div className="execution-chart-grid" aria-hidden="true"><i /><i /><i /><i /></div>
          <div className="execution-chart-bars">
            {executionLifecycle.map(item => <div className="execution-chart-column" key={item.label}><span className={`execution-chart-bar ${item.tone}${item.value === 0 ? " is-zero" : ""}`} style={{ height: `${item.value === 0 ? 8 : Math.max(20, (item.value / maxExecutionLifecycle) * 100)}%` }}><b>{item.value}</b></span><small>{item.label}</small></div>)}
          </div>
          {(summary?.executionRuns.total ?? 0) === 0 && <div className="chart-empty-copy"><Icons.ChartLineUp size={24} weight="duotone" /><b>No execution activity</b><span>The visualization will populate from authoritative execution history.</span></div>}
        </div>
        <div className="execution-legend compact">{executionLifecycle.map(item => <span key={item.label}><i className={item.tone} />{item.label}<b>{item.value}</b></span>)}</div>
      </Shared.CockpitPanel>

      <Shared.CockpitPanel title="Execution Success" meta="Completed outcomes in the current snapshot" state={rootState} className="cockpit-success" accent="success">
        <div className="success-visual">
          <div className={`success-orbit${successRate === null ? " is-empty" : ""}`}><Icons.ChartDonut size={94} weight="duotone" aria-hidden="true" /><div><strong>{successRate === null ? "—" : `${successRate}%`}</strong><span>{successRate === null ? "No data" : "Success"}</span></div></div>
          <div className="success-breakdown"><span><i className="completed" />Success <b>{summary?.executionRuns.completed ?? 0}</b></span><span><i className="failed" />Failed <b>{summary?.executionRuns.failed ?? 0}</b></span><span><i className="pending" />Cancelled <b>{summary?.executionRuns.cancelled ?? 0}</b></span></div>
        </div>
        <p className="visual-footnote">{successRate === null ? "No completed execution outcomes are available yet." : `${summary?.executionRuns.completed ?? 0} of ${completionTotal} completed outcomes succeeded.`}</p>
      </Shared.CockpitPanel>

      <Shared.CockpitPanel title="Requires Attention" meta="Actionable operational conditions" state={rootState} className="cockpit-attention" accent="attention" action={<span className="attention-count">{attention.length}</span>}>
        {attention.length === 0 ? <div className="attention-empty"><Icons.CheckCircle size={42} weight="duotone" /><b>No operational issues require action</b><span>Customer-impacting signals will appear here.</span></div> : <div className="attention-list">{attention.map(finding => <Router.Link to={finding.domain === "worker" ? "/workers" : finding.domain === "execution" ? "/executions" : finding.domain === "deployment" ? "/operational-execution" : "/operations"} key={`${finding.code}-${finding.message}`} className={`attention-item ${finding.severity}`}><span className="attention-icon" aria-hidden="true">{finding.severity === "error" ? <Icons.XCircle size={19} weight="fill" /> : <Icons.WarningOctagon size={19} weight="fill" />}</span><span><b>{finding.domain}</b>{finding.message}</span><Icons.ArrowRight size={14} weight="bold" aria-hidden="true" /></Router.Link>)}</div>}
      </Shared.CockpitPanel>

      <Shared.CockpitPanel title="Agent & Worker Health" meta="Lifecycle and availability from authoritative inventories" state={rootState} className="cockpit-agent-health" accent="agents">
        <div className="health-visuals">
          <div className="health-visual-block"><div className="health-visual-primary"><span className="health-visual-icon"><Icons.Robot size={30} weight="duotone" /></span><div><small>Active Agents</small><strong>{summary?.agents.active ?? 0}<em>/ {summary?.agents.total ?? 0}</em></strong></div></div><progress max="100" value={agentProgress} aria-label={`${Math.round(agentProgress)} percent of agents active`} /><div className="health-visual-legend"><span><i className="completed" />Active {summary?.agents.active ?? 0}</span><span><i className="pending" />Other {(summary?.agents.draft ?? 0) + (summary?.agents.disabled ?? 0) + (summary?.agents.archived ?? 0)}</span></div></div>
          <div className="health-visual-block"><div className="health-visual-primary"><span className="health-visual-icon worker"><Icons.HardDrives size={30} weight="duotone" /></span><div><small>Available Workers</small><strong>{summary?.workers.available ?? 0}<em>/ {summary?.workers.total ?? 0}</em></strong></div></div><progress max="100" value={workerProgress} aria-label={`${Math.round(workerProgress)} percent of workers available`} /><div className="health-visual-legend"><span><i className="completed" />Available {summary?.workers.available ?? 0}</span><span><i className="failed" />Unavailable {unavailableWorkers}</span></div></div>
        </div>
      </Shared.CockpitPanel>

      <Shared.CockpitPanel title="Financial Activity" meta="Existing operational economics" state={economics.data ? "ready" : economics.loadState === "error" ? "error" : economics.loadState} className="cockpit-financial" accent="usage" action={<Router.Link className="cockpit-action" to="/economics">View usage<Icons.ArrowRight size={13} weight="bold" /></Router.Link>}>
        <div className="financial-visual" role="img" aria-label={economicStages.map(stage => `${stage.label} ${stage.display}`).join(", ")}>
          <div className="financial-bars" aria-hidden="true">{economicStages.map(stage => <div key={stage.label}><span style={{ height: `${stage.value > 0 && Number.isFinite(stage.value) ? Math.max(18, (stage.value / maxEconomicValue) * 100) : 8}%` }} className={stage.value > 0 ? "" : "is-zero"} /><small>{stage.label}</small></div>)}</div>
          <div className="financial-values">{economicStages.map(stage => <span key={stage.label}><small>{stage.label}</small><b>{stage.display}</b></span>)}</div>
          {economicStages.every(stage => !Number.isFinite(stage.value) || stage.value === 0) && <div className="financial-zero"><Icons.Wallet size={24} weight="duotone" /><span>No economic movement in the current snapshot</span></div>}
        </div>
        <p className="visual-footnote">Reconciliation and exception workflows remain DEFERRED_TO_EPIC16.</p>
      </Shared.CockpitPanel>

      <Shared.CockpitPanel title="Service Health" meta="Customer-relevant service availability" state={rootState} className="cockpit-services" accent="success" action={<Router.Link className="cockpit-action" to="/operations">View all<Icons.ArrowRight size={13} weight="bold" /></Router.Link>}>
        <div className="service-health visual">{serviceRows.map(service => { const healthy = /healthy|available|connected/.test(service.status); const warning = /degraded|partial/.test(service.status); return <div key={service.label}><span className={`service-icon ${healthy ? "healthy" : warning ? "warning" : "error"}`}>{healthy ? <Icons.CheckCircle size={18} weight="fill" /> : warning ? <Icons.Gauge size={18} weight="fill" /> : <Icons.XCircle size={18} weight="fill" />}</span><span>{service.label}</span><Shared.Status status={service.status} /></div>; })}</div>
      </Shared.CockpitPanel>

      <Shared.CockpitPanel title="Recent Activity" meta="Latest operational events" state={activity.loadState === "error" ? "error" : activity.loadState} className="cockpit-recent" accent="info" action={<Router.Link className="cockpit-action" to="/operational-evidence">View all activity<Icons.ArrowRight size={13} weight="bold" /></Router.Link>}>
        {events.length === 0 ? <div className="recent-empty"><Icons.ClockCountdown size={34} weight="duotone" /><b>No recent activity</b><span>Authoritative events will appear here as they occur.</span></div> : <div className="recent-activity-table" role="table" aria-label="Recent operational activity"><div className="recent-activity-head" role="row"><span>Time</span><span>Event</span><span>Detail</span><span>Status</span></div>{events.map(event => <article key={event.eventId} role="row"><time dateTime={new Date(event.createdAt).toISOString()}>{new Date(event.createdAt).toLocaleTimeString()}</time><b>{event.type}</b><span>{event.message}</span><Shared.FindingSeverity severity={event.severity === "critical" ? "error" : event.severity} /></article>)}</div>}
      </Shared.CockpitPanel>

      <Shared.CockpitPanel title="Quick Access" meta="Supported ACS workflows" state="ready" className="cockpit-quick" accent="info">
        <div className="quick-access visual"><Router.Link to="/agents/new"><span><Icons.Robot size={23} weight="duotone" /></span><b>Create Agent</b></Router.Link><Router.Link to="/operational-execution"><span><Icons.RocketLaunch size={23} weight="duotone" /></span><b>Plan Execution</b></Router.Link><a href={Api.productApiConfig.tenantAdministrationUrl}><span><Icons.UserPlus size={23} weight="duotone" /></span><b>Add Tenant</b></a><Router.Link to="/economics"><span><Icons.ChartBar size={23} weight="duotone" /></span><b>View Usage</b></Router.Link><Router.Link to="/economics"><span><Icons.Wallet size={23} weight="duotone" /></span><b>Reservations</b></Router.Link><Router.Link to="/economics"><span><Icons.CurrencyDollar size={23} weight="duotone" /></span><b>Settlements</b></Router.Link><Router.Link to="/administration"><span><Icons.ShieldCheck size={23} weight="duotone" /></span><b>Providers</b></Router.Link><Router.Link to="/operations"><span><Icons.Wrench size={23} weight="duotone" /></span><b>Operations</b></Router.Link></div>
      </Shared.CockpitPanel>
    </div>

    {(summary?.globalCaveats.length ?? 0) > 0 && <aside className="administration-advisory"><div><b>System configuration has advisory notices</b><span>Global certification caveats are tracked separately from current customer health.</span></div><Router.Link to="/administration">View Administration Overview →</Router.Link></aside>}
  </div>;
}

