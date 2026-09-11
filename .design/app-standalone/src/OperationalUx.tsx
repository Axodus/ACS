import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  productApi,
  type OperationalStatus,
  type RuntimeJobStatus,
  type RuntimeStateEvent,
  type WorkerDiagnostic,
  type UsageInspectionRecord,
  type Settlement,
  type Receipt,
  type ReconciliationBacklogItem,
  type ReconciliationMismatch,
  type FinancialException,
  type FinancialRemediation,
} from "./api/product-api";

type Loadable<T> = { data: T | null; loading: boolean; error: string | null };

function errorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const value = error as { status?: number; code?: string; message?: string; retryable?: boolean };
    if (value.status === 401) return "Authentication is required. Re-establish the Control Plane session.";
    if (value.status === 403) return "Authenticated, but this principal is not authorized for this operational resource.";
    if (value.status === 429) return "Request rate limited. Wait for Retry-After before refreshing.";
    if (value.status === 503) return "An operational dependency is unavailable. Inspect System / Operations for the blocking reason.";
    if (value.message) return value.message;
    if (value.code) return value.code;
  }
  return error instanceof Error ? error.message : "Unable to load operational state.";
}

function usePolling<T>(loader: () => Promise<T>, intervalMs = 4_000): Loadable<T> & { refresh: () => void } {
  const [state, setState] = useState<Loadable<T>>({ data: null, loading: true, error: null });
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await loader();
        if (active) setState({ data, loading: false, error: null });
      } catch (error) {
        if (active) setState(current => ({ data: current.data, loading: false, error: errorMessage(error) }));
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), intervalMs);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [intervalMs, loader, revision]);

  return { ...state, refresh };
}

function formatTime(value?: number): string {
  return value ? new Date(value).toLocaleString() : "—";
}

function shortId(value?: string): string {
  if (!value) return "—";
  return value.length > 20 ? `${value.slice(0, 10)}…${value.slice(-6)}` : value;
}

function tone(value: string): string {
  const normalized = value.toLowerCase();
  if (/ready|available|running|succeeded|healthy|live|completed/.test(normalized)) return "good";
  if (/blocked|failed|offline|unhealthy|cancel|expired/.test(normalized)) return "bad";
  if (/degraded|queued|assigned|busy|unknown|recover/.test(normalized)) return "warn";
  return "neutral";
}

function StatusPill({ value }: { value: string }) {
  return <span className={`ops-pill ${tone(value)}`}>{value.replaceAll("_", " ")}</span>;
}

function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: React.ReactNode }) {
  return <header className="domain-header">
    <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>
    {actions && <div className="ops-actions">{actions}</div>}
  </header>;
}

function StateMessage({ loading, error, empty }: { loading: boolean; error: string | null; empty?: string }) {
  if (loading) return <div className="ops-state" role="status">Loading authoritative Product API state…</div>;
  if (error) return <div className="ops-state error" role="alert">{error}</div>;
  return <div className="ops-state">{empty ?? "No records available."}</div>;
}

const JOB_STATUSES: readonly RuntimeJobStatus[] = ["queued", "assigned", "running", "succeeded", "failed", "cancel_requested", "cancelled"];

export function ExecutionsPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") as RuntimeJobStatus | null;
  const search = params.get("q") ?? "";
  const loader = useCallback(() => productApi.listRuntimeJobs(status && JOB_STATUSES.includes(status) ? status : undefined), [status]);
  const jobs = usePolling(loader);
  const visible = useMemo(() => (jobs.data ?? []).filter(job => {
    const query = search.trim().toLowerCase();
    return !query || [job.jobId, job.agentId, job.runtimeInstanceId, job.correlationId].some(value => value?.toLowerCase().includes(query));
  }), [jobs.data, search]);

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  return <>
    <PageHeader eyebrow="OPERATIONS" title="Executions" description="Durable jobs, attempts, assignments and terminal results from the remote runtime." actions={<button className="secondary" type="button" onClick={jobs.refresh}>Refresh</button>} />
    <section className="ops-toolbar" aria-label="Execution filters">
      <label>Search<input value={search} onChange={event => update("q", event.target.value)} placeholder="job, agent, runtime or correlation" /></label>
      <label>Status<select value={status ?? ""} onChange={event => update("status", event.target.value)}><option value="">All statuses</option>{JOB_STATUSES.map(value => <option key={value}>{value}</option>)}</select></label>
      <Link className="ops-link-button" to="/agents">Start from an Agent</Link>
    </section>
    {jobs.error && <StateMessage loading={false} error={jobs.error} />}
    {jobs.loading && !jobs.data ? <StateMessage loading error={null} /> : visible.length === 0 ? <StateMessage loading={false} error={null} empty="No executions match the current filters. Start an eligible sandbox runtime from an Agent." /> : <div className="ops-table-wrap">
      <table className="ops-table"><thead><tr><th>Job</th><th>Agent / runtime</th><th>Status</th><th>Attempt</th><th>Worker evidence</th><th>Updated</th></tr></thead><tbody>
        {visible.map(job => <tr key={job.jobId}>
          <td><Link to={`/executions/${encodeURIComponent(job.jobId)}`} className="ops-id-link">{shortId(job.jobId)}</Link><small>{shortId(job.correlationId)}</small></td>
          <td><b>{job.agentId ?? "unattributed"}</b><small>{shortId(job.runtimeInstanceId)}</small></td>
          <td><StatusPill value={job.status} /></td>
          <td>{job.attempt}/{job.maxAttempts}</td>
          <td>{job.error?.code ?? job.result?.status ?? "pending"}</td>
          <td>{formatTime(job.updatedAt)}</td>
        </tr>)}
      </tbody></table>
    </div>}
  </>;
}

export function ExecutionDetailPage() {
  const { jobId = "" } = useParams();
  const loader = useCallback(async () => {
    const [job, diagnostic, events] = await Promise.all([
      productApi.getRuntimeJob(jobId),
      productApi.getRuntimeJobDiagnostics(jobId),
      productApi.getRuntimeJobEvents(jobId),
    ]);
    return { job, diagnostic, events };
  }, [jobId]);
  const resource = usePolling(loader, 2_500);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const job = resource.data?.job;
  const diagnostic = resource.data?.diagnostic;
  const events = resource.data?.events ?? [];
  const canCancel = job ? ["queued", "assigned", "running", "cancel_requested"].includes(job.status) : false;

  const cancel = async () => {
    setCancelling(true);
    setMutationError(null);
    try {
      await productApi.cancelRuntimeJob(jobId);
      setConfirmCancel(false);
      resource.refresh();
    } catch (error) {
      setMutationError(errorMessage(error));
    } finally {
      setCancelling(false);
    }
  };

  return <>
    <PageHeader eyebrow="EXECUTION" title={job ? `Job ${shortId(job.jobId)}` : "Job diagnostics"} description="Authoritative job state, assignment evidence, recovery history and operator guidance." actions={<><Link className="secondary" to="/executions">Back to jobs</Link><button className="secondary" type="button" onClick={resource.refresh}>Refresh</button>{canCancel && <button className="danger" type="button" onClick={() => setConfirmCancel(true)}>Cancel</button>}</>} />
    {resource.loading && !resource.data ? <StateMessage loading error={null} /> : resource.error && !resource.data ? <StateMessage loading={false} error={resource.error} /> : job && diagnostic ? <>
      {(resource.error || mutationError) && <StateMessage loading={false} error={mutationError ?? resource.error} />}
      {confirmCancel && <section className="ops-confirm" role="alertdialog" aria-modal="true" aria-labelledby="cancel-job-title"><div><h2 id="cancel-job-title">Cancel this execution?</h2><p>Queued work is cancelled immediately. Assigned or running work receives a durable cancellation request.</p></div><div className="ops-actions"><button autoFocus type="button" className="secondary" onClick={() => setConfirmCancel(false)}>Keep running</button><button type="button" className="danger" disabled={cancelling} onClick={() => void cancel()}>{cancelling ? "Cancelling…" : "Confirm cancel"}</button></div></section>}
      <section className="ops-summary-grid">
        <article className="ops-card"><span>Status</span><StatusPill value={job.status} /><small>revision {job.revision}</small></article>
        <article className="ops-card"><span>Attempt</span><strong>{job.attempt}/{job.maxAttempts}</strong><small>{diagnostic.recoveryCount} recoveries</small></article>
        <article className="ops-card"><span>Worker</span><strong>{diagnostic.workerId ?? "unassigned"}</strong><small>{shortId(diagnostic.assignmentId)}</small></article>
        <article className="ops-card"><span>Correlation</span><strong className="mono">{shortId(job.correlationId)}</strong><small>{formatTime(job.updatedAt)}</small></article>
      </section>
      <div className="ops-two-column">
        <section className="ops-panel"><div className="ops-panel-head"><div><h2>Diagnosis</h2><p>Structured reason-to-action mapping from AEES-E.</p></div>{diagnostic.reasonCode && <StatusPill value={diagnostic.reasonCode} />}</div>
          <dl className="ops-definition"><div><dt>Failure code</dt><dd>{diagnostic.failureCode ?? "—"}</dd></div><div><dt>Failure summary</dt><dd>{diagnostic.failureSummary ?? "No terminal failure recorded."}</dd></div><div><dt>Lease expires</dt><dd>{formatTime(diagnostic.leaseExpiresAt)}</dd></div><div><dt>Recovery</dt><dd>{diagnostic.lastRecoveryReason ?? "No recovery event."}</dd></div></dl>
          <div className="ops-remediation"><b>Recommended action</b><p>{diagnostic.recommendedAction ?? (job.status === "failed" ? "Correct the workload or configuration before starting a new execution." : "No operator remediation is required for the current state.")}</p>{job.status === "failed" && <Link to={job.agentId ? `/agents/${job.agentId}` : "/agents"}>Inspect Agent and create a corrected execution →</Link>}</div>
        </section>
        <section className="ops-panel"><div className="ops-panel-head"><div><h2>Result</h2><p>Durable terminal outcome; internal idempotency metadata is redacted by the API.</p></div></div>
          {job.result ? <pre className="ops-json">{JSON.stringify(job.result.output ?? { status: job.result.status }, null, 2)}</pre> : job.error ? <div className="ops-state error">{job.error.code}: {job.error.message}</div> : <div className="ops-state">Result pending.</div>}
        </section>
      </div>
      <EventTimeline events={events.length ? events : diagnostic.history} />
    </> : <StateMessage loading={false} error={resource.error} />}
  </>;
}

function EventTimeline({ events }: { events: RuntimeStateEvent[] }) {
  return <section className="ops-panel"><div className="ops-panel-head"><div><h2>Execution timeline</h2><p>Created, assigned, recovered, cancelled and terminal runtime evidence.</p></div><span>{events.length} events</span></div>
    {events.length === 0 ? <StateMessage loading={false} error={null} empty="No runtime events recorded." /> : <ol className="ops-timeline">{[...events].sort((a, b) => a.timestamp - b.timestamp).map(event => <li key={event.eventId}><span className={`ops-dot ${tone(event.outcome)}`} /><div><b>{event.category}</b><p>{event.reason ?? event.outcome}</p><small>{formatTime(event.timestamp)} · {shortId(event.workerId)} · {shortId(event.assignmentId)}</small></div></li>)}</ol>}
  </section>;
}

export function WorkersPage() {
  const loader = useCallback(() => productApi.getOperationalStatus(), []);
  const status = usePolling(loader);
  const workers = status.data?.workers.entries ?? [];
  return <>
    <PageHeader eyebrow="RUNTIME" title="Workers" description="Remote worker registration, capacity, heartbeat and current assignment state." actions={<button className="secondary" type="button" onClick={status.refresh}>Refresh</button>} />
    {status.error && <StateMessage loading={false} error={status.error} />}
    {status.loading && !status.data ? <StateMessage loading error={null} /> : workers.length === 0 ? <StateMessage loading={false} error={null} empty="No workers registered. Start a compatible remote worker through the supported deployment environment." /> : <div className="ops-card-grid">{workers.map(worker => <WorkerCard key={`${worker.workerId}:${worker.instanceId}`} worker={worker} />)}</div>}
  </>;
}

function WorkerCard({ worker }: { worker: WorkerDiagnostic }) {
  const capabilitySummary = Object.entries(worker.capabilities).filter(([, value]) => value !== undefined).slice(0, 4);
  return <article className="ops-panel"><div className="ops-panel-head"><div><h2><Link to={`/workers/${encodeURIComponent(worker.workerId)}`}>{worker.name}</Link></h2><p className="mono">{worker.workerId}</p></div><StatusPill value={worker.status} /></div>
    <dl className="ops-definition"><div><dt>Instance</dt><dd>{shortId(worker.instanceId)}</dd></div><div><dt>Heartbeat age</dt><dd>{worker.heartbeatAgeMs === undefined ? "—" : `${Math.round(worker.heartbeatAgeMs / 1000)}s`}</dd></div><div><dt>Active runs</dt><dd>{worker.activeRuns}</dd></div><div><dt>Assignments</dt><dd>{worker.currentAssignments.length}</dd></div></dl>
    <div className="ops-tags">{capabilitySummary.map(([key, value]) => <span key={key}>{key}: {Array.isArray(value) ? value.join(", ") : String(value)}</span>)}</div>
  </article>;
}

export function WorkerDetailPage() {
  const { workerId = "" } = useParams();
  const loader = useCallback(async () => {
    const [status, workloads] = await Promise.all([productApi.getOperationalStatus(), productApi.listWorkerWorkloads(workerId)]);
    return { status, workloads };
  }, [workerId]);
  const resource = usePolling(loader);
  const worker = resource.data?.status.workers.entries.find(entry => entry.workerId === workerId);
  return <>
    <PageHeader eyebrow="WORKER" title={worker?.name ?? workerId} description="Remote identity, heartbeat, capability and assignment evidence. Service credentials are never exposed." actions={<><Link className="secondary" to="/workers">Back to workers</Link><button className="secondary" type="button" onClick={resource.refresh}>Refresh</button></>} />
    {resource.loading && !resource.data ? <StateMessage loading error={null} /> : resource.error && !resource.data ? <StateMessage loading={false} error={resource.error} /> : worker ? <div className="ops-two-column"><WorkerCard worker={worker} /><section className="ops-panel"><div className="ops-panel-head"><div><h2>Current assignments</h2><p>Lease summaries for work this worker currently owns.</p></div></div>{worker.currentAssignments.length ? <ul className="ops-list">{worker.currentAssignments.map(item => <li key={item.assignmentId}><Link to={`/executions/${encodeURIComponent(item.jobId)}`}>{shortId(item.jobId)}</Link><span>attempt {item.attempt}</span><small>lease until {formatTime(item.leaseExpiresAt)}</small></li>)}</ul> : <StateMessage loading={false} error={null} empty="No active assignment." />}</section></div> : <StateMessage loading={false} error={resource.error ?? "Worker not found."} />}
  </>;
}

export function OperationsStatusPage() {
  const loader = useCallback(() => productApi.getOperationalStatus(true), []);
  const resource = usePolling(loader, 5_000);
  const status = resource.data;
  return <>
    <PageHeader eyebrow="SYSTEM" title="Operations" description="Liveness, workload readiness, dependencies, worker capacity, recovery and external telemetry." actions={<button className="secondary" type="button" onClick={resource.refresh}>Run checks</button>} />
    {resource.error && <StateMessage loading={false} error={resource.error} />}
    {resource.loading && !status ? <StateMessage loading error={null} /> : status ? <OperationsStatus status={status} /> : null}
    <OperationsEconomicEvidence />
  </>;
}

function formatEconomicValue(value: unknown, unit?: string): string {
  if (value === undefined || value === null || value === "") return "unavailable";
  return unit ? `${value} ${unit}` : String(value);
}

function OperationsEconomicEvidence() {
  const loader = useCallback(async () => {
    const [usage, settlements, receipts, reconciliation, mismatches, exceptions, remediations] = await Promise.allSettled([
      productApi.listUsageRecords(),
      productApi.listSettlements(),
      productApi.listReceipts(),
      productApi.listReconciliationBacklog(),
      productApi.listReconciliationMismatches(),
      productApi.listFinancialExceptions(),
      productApi.listFinancialRemediations(),
    ]);
    return {
      usage: usage.status === "fulfilled" ? usage.value : null,
      usageError: usage.status === "rejected" ? errorMessage(usage.reason) : null,
      settlements: settlements.status === "fulfilled" ? settlements.value : null,
      settlementError: settlements.status === "rejected" ? errorMessage(settlements.reason) : null,
      receipts: receipts.status === "fulfilled" ? receipts.value : null,
      receiptError: receipts.status === "rejected" ? errorMessage(receipts.reason) : null,
      reconciliation: reconciliation.status === "fulfilled" ? reconciliation.value : null,
      reconciliationError: reconciliation.status === "rejected" ? errorMessage(reconciliation.reason) : null,
      mismatches: mismatches.status === "fulfilled" ? mismatches.value : null,
      mismatchError: mismatches.status === "rejected" ? errorMessage(mismatches.reason) : null,
      exceptions: exceptions.status === "fulfilled" ? exceptions.value : null,
      exceptionError: exceptions.status === "rejected" ? errorMessage(exceptions.reason) : null,
      remediations: remediations.status === "fulfilled" ? remediations.value : null,
      remediationError: remediations.status === "rejected" ? errorMessage(remediations.reason) : null,
    };
  }, []);
  const resource = usePolling(loader, 8_000);
  const data = resource.data;
  return <section className="ops-panel wide" aria-label="Economic operations">
    <div className="ops-panel-head"><div><h2>Economic operations</h2><p>Authoritative usage, settlement and operational receipt evidence from the Product API. Missing values stay unavailable.</p></div><button className="secondary" type="button" onClick={resource.refresh}>Refresh economics</button></div>
    {resource.loading && !data ? <StateMessage loading error={null} /> : <div className="ops-card-grid">
      <article className="ops-panel"><div className="ops-panel-head"><div><h2>Usage</h2><p>Recorded execution usage</p></div><StatusPill value={data?.usageError ? "UNAVAILABLE" : data?.usage?.length ? `${data.usage.length} items` : "EMPTY"} /></div>{data?.usageError ? <StateMessage loading={false} error={data.usageError} /> : data?.usage?.length ? <ul className="ops-list">{data.usage.map((item: UsageInspectionRecord) => <li key={item.usageId}><b>{item.usageId}</b><span>{item.status} · {item.quantity} {item.unit}</span><small>{item.executionRunId} · settlement {item.settlementState}</small></li>)}</ul> : <StateMessage loading={false} error={null} empty="No usage recorded. The operator surface shows truthful emptiness until usage is recorded by execution." />}</article>
      <article className="ops-panel"><div className="ops-panel-head"><div><h2>Settlements</h2><p>Operational settlement records</p></div><StatusPill value={data?.settlementError ? "UNAVAILABLE" : data?.settlements?.length ? `${data.settlements.length} items` : "EMPTY"} /></div>{data?.settlementError ? <StateMessage loading={false} error={data.settlementError} /> : data?.settlements?.length ? <ul className="ops-list">{data.settlements.map((item: Settlement) => <li key={item.settlementId}><b>{item.settlementId}</b><span>{item.status} · {formatEconomicValue(item.amount, item.unit)}</span><small>{item.executionRunId ?? "run unavailable"}{item.receiptId ? ` · receipt ${item.receiptId}` : ""}</small></li>)}</ul> : <StateMessage loading={false} error={null} empty="No settlements yet. Settlement history appears only after governed economic completion." />}</article>
      <article className="ops-panel"><div className="ops-panel-head"><div><h2>Mismatches</h2><p>Explicit reconciliation mismatches only when evidence proves them</p></div><StatusPill value={data?.mismatchError ? "UNAVAILABLE" : data?.mismatches?.length ? `${data.mismatches.length} items` : "EMPTY"} /></div>{data?.mismatchError ? <StateMessage loading={false} error={data.mismatchError} /> : data?.mismatches?.length ? <ul className="ops-list">{data.mismatches.map((item: ReconciliationMismatch) => <li key={item.mismatchId}><b>{item.mismatchId}</b><span>{item.classification} · {item.severity}</span><small>{item.reconciliationId}{item.observedStatus ? ` · observed ${item.observedStatus}` : ""}</small></li>)}</ul> : <StateMessage loading={false} error={null} empty="No mismatches. Matched evidence does not produce fabricated discrepancy counts." />}</article>
      <article className="ops-panel"><div className="ops-panel-head"><div><h2>Exceptions</h2><p>Governed financial exceptions opened only from proven mismatches</p></div><StatusPill value={data?.exceptionError ? "UNAVAILABLE" : data?.exceptions?.length ? `${data.exceptions.length} items` : "EMPTY"} /></div>{data?.exceptionError ? <StateMessage loading={false} error={data.exceptionError} /> : data?.exceptions?.length ? <ul className="ops-list">{data.exceptions.map((item: FinancialException) => <li key={item.exceptionId}><b>{item.exceptionId}</b><span>{item.status} · {item.category}</span><small>{item.mismatchId}{item.settlementId ? ` · settlement ${item.settlementId}` : ""}</small></li>)}</ul> : <StateMessage loading={false} error={null} empty="No financial exceptions. Exceptions appear only after a proven mismatch is opened; empty is truthful, not a fabricated count." />}</article>
      <article className="ops-panel"><div className="ops-panel-head"><div><h2>Remediation</h2><p>Governed exception remediation only; unsupported financial mutations stay explicit</p></div><StatusPill value={data?.remediationError ? "UNAVAILABLE" : data?.remediations?.length ? `${data.remediations.length} items` : "EMPTY"} /></div>{data?.remediationError ? <StateMessage loading={false} error={data.remediationError} /> : data?.remediations?.length ? <ul className="ops-list">{data.remediations.map((item: FinancialRemediation) => <li key={item.remediationId}><b>{item.remediationId}</b><span>{item.status} · {item.requestedAction}</span><small>{item.exceptionId}{item.outcome ? ` · ${item.outcome}` : ""}</small></li>)}</ul> : <StateMessage loading={false} error={null} empty="No remediations. Actions appear only after a governed request against a proven exception; empty is truthful." />}</article>
      <article className="ops-panel"><div className="ops-panel-head"><div><h2>Reconciliation</h2><p>Tenant-scoped settlement evidence backlog</p></div><StatusPill value={data?.reconciliationError ? "UNAVAILABLE" : data?.reconciliation?.length ? `${data.reconciliation.length} items` : "EMPTY"} /></div>{data?.reconciliationError ? <StateMessage loading={false} error={data.reconciliationError} /> : data?.reconciliation?.length ? <ul className="ops-list">{data.reconciliation.map((item: ReconciliationBacklogItem) => <li key={item.reconciliationId}><b>{item.reconciliationId}</b><span>{item.state}{item.mismatch ? " · mismatch" : ""}</span><small>{item.settlementId ?? "settlement unavailable"}{item.mismatchClass ? ` · ${item.mismatchClass}` : ""}</small></li>)}</ul> : <StateMessage loading={false} error={null} empty="No reconciliation items. Matched or pending economic evidence will appear here without fabricated mismatch counts." />}</article>
      <article className="ops-panel"><div className="ops-panel-head"><div><h2>Receipts</h2><p>Operational receipts only, not invoices or payment receipts</p></div><StatusPill value={data?.receiptError ? "UNAVAILABLE" : data?.receipts?.length ? `${data.receipts.length} items` : "EMPTY"} /></div>{data?.receiptError ? <StateMessage loading={false} error={data.receiptError} /> : data?.receipts?.length ? <ul className="ops-list">{data.receipts.map((item: Receipt) => <li key={item.receiptId}><b>{item.receiptId}</b><span>{item.status} · {formatEconomicValue(item.amount, item.unit)}</span><small>{item.summary}</small></li>)}</ul> : <StateMessage loading={false} error={null} empty="No receipts yet. Receipts stay truthful and empty until settlement authoritatively issues one." />}</article>
    </div>}
  </section>;
}

export function CredentialsPage() {
  const loader = useCallback(() => productApi.listCredentials(), []);
  const resource = usePolling(loader, 8_000);
  const [draft, setDraft] = useState({ credentialId: "", providerId: "openai", type: "api-key", purpose: "model:inference", secretValue: "", scopes: "model:inference" });
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [rotation, setRotation] = useState<{ id: string; value: string } | null>(null);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy("create");
    setFeedback(null);
    try {
      const result = await productApi.createCredential({
        ...(draft.credentialId.trim() ? { credentialId: draft.credentialId.trim() } : {}),
        providerId: draft.providerId.trim(),
        type: draft.type,
        purpose: draft.purpose.trim(),
        secretValue: draft.secretValue,
        scopes: draft.scopes.split(",").map(value => value.trim()).filter(Boolean),
      });
      setDraft(current => ({ ...current, credentialId: "", secretValue: "" }));
      setFeedback(`Credential ${result.credentialId} stored as write-only secret version ${result.secret?.version ?? "1"}.`);
      resource.refresh();
    } catch (error) {
      setFeedback(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const rotate = async () => {
    if (!rotation?.value) return;
    setBusy(`rotate:${rotation.id}`);
    setFeedback(null);
    try {
      const result = await productApi.rotateCredential(rotation.id, rotation.value);
      setFeedback(`Credential ${result.credentialId} rotated to version ${result.secret?.version ?? "next"}.`);
      setRotation(null);
      resource.refresh();
    } catch (error) {
      setFeedback(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const revoke = async (id: string) => {
    setBusy(`revoke:${id}`);
    setFeedback(null);
    try {
      await productApi.revokeCredential(id);
      setFeedback(`Credential ${id} revoked. Existing references remain visible but cannot resolve secret material.`);
      resource.refresh();
    } catch (error) {
      setFeedback(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  return <>
    <PageHeader eyebrow="AGENT COMPOSITION" title="Secret references" description="Write-only provider credentials with redacted metadata, rotation and logical revocation." actions={<button className="secondary" type="button" onClick={resource.refresh}>Refresh</button>} />
    <section className="ops-panel"><div className="ops-panel-head"><div><h2>Add managed credential</h2><p>The value is sent once to the configured SecretProvider and is never returned by the Product API.</p></div><StatusPill value="write-only" /></div>
      <form className="ops-secret-form" onSubmit={event => void create(event)}>
        <label>Credential id<input value={draft.credentialId} onChange={event => setDraft(current => ({ ...current, credentialId: event.target.value }))} placeholder="optional stable id" /></label>
        <label>Provider<input required value={draft.providerId} onChange={event => setDraft(current => ({ ...current, providerId: event.target.value }))} /></label>
        <label>Type<select value={draft.type} onChange={event => setDraft(current => ({ ...current, type: event.target.value }))}><option value="api-key">API key</option><option value="oauth">OAuth</option><option value="service-account">Service account</option><option value="subscription">Subscription</option></select></label>
        <label>Purpose<input required value={draft.purpose} onChange={event => setDraft(current => ({ ...current, purpose: event.target.value }))} /></label>
        <label>Scopes<input value={draft.scopes} onChange={event => setDraft(current => ({ ...current, scopes: event.target.value }))} placeholder="comma-separated" /></label>
        <label className="wide">Secret value<input required type="password" autoComplete="new-password" value={draft.secretValue} onChange={event => setDraft(current => ({ ...current, secretValue: event.target.value }))} /></label>
        <div className="ops-actions wide"><button className="secondary" disabled={busy === "create"} type="submit">{busy === "create" ? "Storing…" : "Store credential"}</button><small>Plaintext is cleared after provider confirmation.</small></div>
      </form>
      {feedback && <div className="ops-state" role="status" data-testid="credential-operation-feedback">{feedback}</div>}
    </section>
    {resource.error && <StateMessage loading={false} error={resource.error} />}
    {resource.loading && !resource.data ? <StateMessage loading error={null} /> : <div className="ops-card-grid">{(resource.data ?? []).map(credential => <article className="ops-panel" key={credential.credentialId}><div className="ops-panel-head"><div><h2>{credential.providerName}</h2><p className="mono">{credential.credentialId}</p></div><StatusPill value={credential.status} /></div><dl className="ops-definition"><div><dt>Reference</dt><dd>{credential.secretRefRedacted}</dd></div><div><dt>Validated</dt><dd>{String(credential.validated)}</dd></div><div><dt>Usage</dt><dd>{credential.usageCount}</dd></div><div><dt>Last validated</dt><dd>{formatTime(credential.lastValidatedAt)}</dd></div></dl><div className="ops-actions"><button type="button" className="secondary" disabled={credential.status === "revoked"} onClick={() => setRotation({ id: credential.credentialId, value: "" })}>Rotate</button><button type="button" className="danger" disabled={credential.status === "revoked" || busy === `revoke:${credential.credentialId}`} onClick={() => void revoke(credential.credentialId)}>Revoke</button></div></article>)}</div>}
    {rotation && <section className="ops-confirm" role="dialog" aria-modal="true" aria-labelledby="rotate-secret-title"><div><h2 id="rotate-secret-title">Rotate {rotation.id}</h2><p>Enter the replacement value. The current value remains undisclosed.</p><label>Replacement secret value<input type="password" autoFocus autoComplete="new-password" value={rotation.value} onChange={event => setRotation({ ...rotation, value: event.target.value })} /></label></div><div className="ops-actions"><button className="secondary" type="button" onClick={() => setRotation(null)}>Cancel</button><button className="danger" type="button" disabled={!rotation.value || busy === `rotate:${rotation.id}`} onClick={() => void rotate()}>Confirm rotation</button></div></section>}
  </>;
}

export function AgentOperationsPanel({ agentId, revision, composition }: { agentId: string; revision: number; composition: Record<string, unknown> }) {
  const productionTargetId = "production-single-host";
  const loader = useCallback(async () => {
    const [readiness, deploymentPlan, productionReadiness, deployments, runtimes] = await Promise.all([
      productApi.getAgentReadiness(agentId),
      productApi.getAgentDeploymentPlan(agentId),
      productApi.getProductionDeploymentReadiness(agentId, productionTargetId),
      productApi.listDeployments(),
      productApi.listRuntimes(),
    ]);
    return {
      readiness,
      deploymentPlan,
      productionReadiness,
      deployments: deployments.filter(item => item.agentId === agentId),
      runtimes: runtimes.filter(item => item.agentId === agentId),
    };
  }, [agentId]);
  const resource = usePolling(loader, 5_000);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const data = resource.data;
  const activeDeployment = [...(data?.deployments ?? [])].reverse().find(item => item.status === "deployed" || item.status === "active" || item.status === "degraded");
  const activeRuntime = [...(data?.runtimes ?? [])].reverse().find(item => item.status === "running" || item.status === "starting" || item.status === "pending");

  const mutate = async (label: string, action: () => Promise<unknown>) => {
    setBusy(label);
    setFeedback(null);
    try {
      await action();
      setFeedback(`${label} accepted by the governed Product API.`);
      resource.refresh();
    } catch (error) {
      setFeedback(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  return <section className="ops-panel wide"><div className="ops-panel-head"><div><h2>Prepare, deploy and execute</h2><p>Readiness and governance remain authoritative in the Product API; this surface only invokes advertised actions.</p></div>{data?.readiness && <StatusPill value={data.readiness.status} />}</div>
    {resource.error && <StateMessage loading={false} error={resource.error} />}
    {resource.loading && !data ? <StateMessage loading error={null} /> : data && <>
      <div className="ops-summary-grid">
        <article className="ops-card"><span>Readiness</span><strong>{data.readiness.status}</strong><small>{data.readiness.blockers.length} blockers</small></article>
        <article className="ops-card"><span>Sandbox plan</span><strong>{data.deploymentPlan.eligible ? "eligible" : "blocked"}</strong><small>{data.deploymentPlan.target}</small></article>
        <article className="ops-card"><span>Production gate</span><strong>{data.productionReadiness.allowed ? "allowed" : "blocked"}</strong><small>{data.productionReadiness.level} · {data.productionReadiness.blockers.length} blockers</small></article>
        <article className="ops-card"><span>Deployment</span><strong>{activeDeployment?.status ?? "not deployed"}</strong><small>{shortId(activeDeployment?.deploymentId)}</small></article>
        <article className="ops-card"><span>Runtime</span><strong>{activeRuntime?.status ?? "not running"}</strong><small>{shortId(activeRuntime?.runtimeId)}</small></article>
      </div>
      {data.readiness.blockers.length > 0 && <div className="ops-state error">{data.readiness.blockers.map(item => item.message).join(" ")}</div>}
      {!data.productionReadiness.allowed && <div className="ops-state error" data-testid="production-readiness-blockers"><b>Production deployment is blocked.</b> {data.productionReadiness.blockers.map(item => `${item.code}: ${item.requiredAction ?? item.reason}`).join(" ")}</div>}
      <div className="ops-actions">
        <button type="button" className="secondary" disabled={!data.deploymentPlan.eligible || busy !== null} onClick={() => void mutate("Sandbox deployment", () => productApi.deployAgent(agentId, { revision, composition, targetId: data.deploymentPlan.target }))}>Deploy sandbox</button>
        <button type="button" className="danger" disabled={!data.productionReadiness.allowed || busy !== null} onClick={() => {
          const confirmed = window.confirm(`Deploy Agent revision ${revision} to production target ${productionTargetId}? Readiness decision ${data.productionReadiness.decisionId} will be re-evaluated by the server.`);
          if (confirmed) void mutate("Production deployment", () => productApi.deployAgent(agentId, { revision, composition, targetId: productionTargetId, mode: "live" }));
        }}>Deploy production</button>
        <button type="button" className="danger" disabled={!activeDeployment || activeDeployment.deploymentMode !== "live" || activeDeployment.status !== "degraded" || busy !== null} onClick={() => {
          if (!activeDeployment) return;
          const confirmed = window.confirm(`Rollback deployment ${activeDeployment.deploymentId} to its recorded predecessor?`);
          if (confirmed) void mutate("Production rollback", () => productApi.rollbackDeployment(activeDeployment.deploymentId, activeDeployment.recordRevision));
        }}>Rollback production</button>
        <button type="button" className="secondary" disabled={!activeDeployment || Boolean(activeRuntime) || busy !== null} onClick={() => {
          if (!activeDeployment) return;
          const runtimeId = `runtime-${agentId}-${Date.now().toString(36)}`;
          void mutate("Remote execution", () => productApi.startRuntime(runtimeId, { deploymentId: activeDeployment.deploymentId, agentId, targetId: activeDeployment.target }));
        }}>Execute</button>
        <button type="button" className="danger" disabled={!activeRuntime || busy !== null} onClick={() => activeRuntime && void mutate("Runtime stop", () => productApi.stopRuntime(activeRuntime.runtimeId))}>Stop runtime</button>
        <Link className="ops-link-button" to={`/executions?q=${encodeURIComponent(agentId)}`}>Inspect executions</Link>
      </div>
      {feedback && <div className="ops-state" role="status" data-testid="agent-operation-feedback">{feedback}</div>}
    </>}
  </section>;
}

function OperationsStatus({ status }: { status: OperationalStatus }) {
  return <>
    <section className="ops-summary-grid">
      <article className="ops-card"><span>Process liveness</span><StatusPill value={status.liveness.status} /><small>{formatTime(status.liveness.checkedAt)}</small></article>
      <article className="ops-card"><span>Workload readiness</span><StatusPill value={status.readiness.status} /><small>{status.readiness.reasonCodes.join(", ") || "No blocking reason"}</small></article>
      <article className="ops-card"><span>Workers</span><strong>{status.workers.active + status.workers.busy}/{status.workers.total}</strong><small>{status.workers.offline} offline</small></article>
      <article className="ops-card"><span>Recovery</span><StatusPill value={status.recovery.healthy ? "READY" : "BLOCKED"} /><small>last scan {formatTime(status.recovery.lastScanAt)}</small></article>
    </section>
    <section className="ops-panel"><div className="ops-panel-head"><div><h2>Dependencies</h2><p>Required dependencies block workload readiness; optional dependencies degrade it.</p></div><StatusPill value={status.overall} /></div>
      <div className="ops-dependencies">{status.dependencies.map(dependency => <article key={dependency.name}><div><b>{dependency.name}</b><small>{dependency.category} · {dependency.required ? "required" : "optional"}</small></div><StatusPill value={dependency.status} /><p>{dependency.summary}</p>{dependency.reasonCode && <code>{dependency.reasonCode}</code>}{dependency.recommendedAction && <div className="ops-remediation"><b>Recommended action</b><p>{dependency.recommendedAction}</p></div>}</article>)}</div>
    </section>
    <div className="ops-two-column">
      <section className="ops-panel"><div className="ops-panel-head"><div><h2>Runtime capacity</h2><p>Current durable work inventory.</p></div></div><dl className="ops-definition"><div><dt>Queued</dt><dd>{status.jobs.queued}</dd></div><div><dt>Running</dt><dd>{status.jobs.running}</dd></div><div><dt>Failed</dt><dd>{status.jobs.failed}</dd></div><div><dt>Total</dt><dd>{status.jobs.total}</dd></div></dl><Link className="ops-inline-link" to="/executions">Inspect executions →</Link></section>
      <section className="ops-panel"><div className="ops-panel-head"><div><h2>Telemetry exporter</h2><p>Operational evidence leaves the process when external export is active.</p></div><StatusPill value={status.telemetry.state} /></div><dl className="ops-definition"><div><dt>Exporter</dt><dd>{status.telemetry.exporter}</dd></div><div><dt>External</dt><dd>{String(status.telemetry.external)}</dd></div><div><dt>Queue</dt><dd>{status.telemetry.queueDepth}</dd></div><div><dt>Dropped</dt><dd>{status.telemetry.droppedRecords}</dd></div></dl></section>
    </div>
  </>;
}
