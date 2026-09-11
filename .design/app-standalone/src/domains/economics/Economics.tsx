import * as Router from "react-router-dom";
import * as Api from "../../api/product-api";
import * as Shared from "../../shared";

export function EconomicsView() {
  const { data, loadState, loadError, stale, refresh } = Shared.useOperationalSummary<Api.EconomicSummary>(
    () => Api.productApi.getEconomicSummary(),
    "Unable to load economics from Product API",
    () => false,
  );
  const quotes = Shared.useOperationalSummary<Api.Quote[]>(
    () => Api.productApi.listQuotes(),
    "Unable to load quotes from Product API",
    () => false,
  );
  const reservations = Shared.useOperationalSummary<Api.Reservation[]>(
    () => Api.productApi.listReservations(),
    "Unable to load reservations from Product API",
    () => false,
  );
  const metering = Shared.useOperationalSummary<Api.MeteringRecord[]>(
    () => Api.productApi.listMeteringRecords(),
    "Unable to load metering records from Product API",
    () => false,
  );
  const settlements = Shared.useOperationalSummary<Api.Settlement[]>(
    () => Api.productApi.listSettlements(),
    "Unable to load settlements from Product API",
    () => false,
  );
  const receipts = Shared.useOperationalSummary<Api.Receipt[]>(
    () => Api.productApi.listReceipts(),
    "Unable to load receipts from Product API",
    () => false,
  );
  const formatEconomicAmount = (value: string | number | undefined, unit?: string) => value === undefined || value === null || value === "" ? "unavailable" : unit ? `${value} ${unit}` : String(value);
  const allBoundaryLinks = [
    { to: "/system/billing-boundary", label: "Billing boundary" },
    { to: "/system/pricing-invoice-boundary", label: "Pricing & invoice boundary" },
    { to: "/system/payment-rails-boundary", label: "Payment rails boundary" },
    { to: "/system/tenant-billing-boundary", label: "Tenant accountability boundary" },
    { to: "/system/settlement-reconciliation", label: "Settlement & receipt boundary" },
    { to: "/system/financial-audit", label: "Financial audit boundary" },
    { to: "/system/billing-acceptance", label: "Acceptance & claims" },
  ];
  return <>
    <Shared.DomainHeader domain="Economics" title="Economics" description="Operational usage and financial-boundary evidence from the Product API. Usage, economics and billing are separate truths." actions={<button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>Refresh</button>} />
    <Shared.ReportSectionNav sections={[{ id: "economics-primary", label: "Primary boundary" }, { id: "economics-secondary", label: "Attribution" }, { id: "economics-quotes", label: "Quotes & reservations" }, { id: "economics-diagnostics", label: "Diagnostics" }, { id: "economics-boundaries", label: "Boundary evidence" }]} />
    <div className="guardrail-banner" role="note"><span>Inspection mode</span><span>Sandbox only</span><span>Production ready = false</span><span>Operational truth ≠ economic truth ≠ billing truth</span><span>Missing values are unavailable, not zero</span></div>
    {Shared.staleBanner({ stale, loadState, loadError }, "economics")}
    <div className="flow-group" id="economics-primary">
      <div className="flow-group-head"><h2>Primary financial boundary</h2><p>Product API values only. The UI labels authority and never upgrades operational records into billing claims.</p></div>
      <div className="dashboard-grid execution-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Scope and totals</h2><p>Canonical Economics domain</p></div><Shared.Badge tone="muted">{data?.unit ?? "unit unavailable"}</Shared.Badge></div>
          <div className="panel-body">
            {data
              ? <div className="summary-list">
                <Shared.SummaryRow label="Economic unit" value={data.unit || data.currency || "unavailable"} />
                <Shared.SummaryRow label="Currency claim" value={data.currency ? `${data.currency} / operational unit only` : "unavailable"} tone="muted" />
                <Shared.SummaryRow label="Context" value={data.neuronsContext || "unavailable"} />
                <Shared.SummaryRow label="Estimated usage value" value={formatEconomicAmount(data.totalEstimated, data.unit)} />
                <Shared.SummaryRow label="Reserved usage value" value={formatEconomicAmount(data.totalReserved, data.unit)} />
                <Shared.SummaryRow label="Metered usage value" value={formatEconomicAmount(data.totalMetered, data.unit)} />
                <Shared.SummaryRow label="Settled operational value" value={formatEconomicAmount(data.totalSettled, data.unit)} />
                <Shared.SummaryRow label="Tenant scope" value="unavailable from current Product API projection" tone="muted" />
              </div>
              : <Shared.PanelStateLine state={loadState} error={loadError} emptyMessage="No economics available." />}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Claim discipline</h2><p>What these numbers may and may not mean</p></div><Shared.Badge tone="muted">no billing claim</Shared.Badge></div>
          <div className="panel-body">
            <div className="summary-list">
              <Shared.SummaryRow label="Authoritative source" value="Product API operational economics endpoints" />
              <Shared.SummaryRow label="Estimated" value="Pre-execution economic estimate, not settled cost" />
              <Shared.SummaryRow label="Metered" value="Recorded execution usage/economic event" />
              <Shared.SummaryRow label="Settled / receipt" value="Operational receipt evidence, not invoice or payment settlement" />
              <Shared.SummaryRow label="$Neurons" value="Implemented operational asset/unit only; no wallet, exchange or ecosystem transaction claim" />
            </div>
          </div>
        </section>
      </div>
    </div>
    <div id="economics-secondary"><Shared.SectionDisclosure title="Secondary — workload attribution" summary="Agent, deployment, runtime and execution aggregates only where Product API supplies them." tier="Secondary">
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Agent attribution</h2><p>Contextual aggregate, Economics-owned</p></div><Shared.Badge tone="muted">{data?.agentConsumption.length ?? 0}</Shared.Badge></div>
          <div className="panel-body"><Shared.TimelineList limit={6} items={(data?.agentConsumption ?? []).map((item) => ({ id: item.entityId, title: item.entityId, meta: `${item.status} · ${formatEconomicAmount(item.amount, item.unit)}`, detail: "Agent attribution from Product API economics summary.", tone: item.status === "available" ? "good" : item.status === "limited" ? "warn" : "muted" }))} /></div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Execution attribution</h2><p>Run-scoped values when available</p></div><Shared.Badge tone="muted">{data?.executionRunConsumption.length ?? 0}</Shared.Badge></div>
          <div className="panel-body"><Shared.TimelineList limit={6} items={(data?.executionRunConsumption ?? []).map((item) => ({ id: item.entityId, title: item.entityId, meta: `${item.status} · ${formatEconomicAmount(item.amount, item.unit)}`, detail: "Execution-run economic context; operational detail remains in Operations.", tone: item.status === "available" ? "good" : item.status === "limited" ? "warn" : "muted" }))} /></div>
        </section>
      </div>
    </Shared.SectionDisclosure></div>
    <div id="economics-quotes"><Shared.SectionDisclosure title="Secondary — quotes and reservations" summary="Operational quote/reservation visibility before and during execution; not payment authorization." tier="Secondary">
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Quotes</h2><p>Estimated operational economics</p></div><Shared.Badge tone="muted">{quotes.data?.length ?? 0}</Shared.Badge></div>
          <div className="panel-body">
            <Shared.TimelineList limit={8} items={(quotes.data ?? []).map(item => ({ id: item.quoteId, title: item.quoteId, meta: `${item.status} · ${item.agentId ?? "agent unavailable"} · estimated ${formatEconomicAmount(item.amount, item.unit)}`, detail: item.eligibility.eligible ? "eligible; not a billing authorization" : `not eligible: ${item.eligibility.reasons?.join("; ") || "reason unavailable"}`, tone: item.eligibility.eligible ? "good" : "warn" }))} />
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Reservations</h2><p>Reserved operational value</p></div><Shared.Badge tone="muted">{reservations.data?.length ?? 0}</Shared.Badge></div>
          <div className="panel-body">
            <Shared.TimelineList limit={8} items={(reservations.data ?? []).map(item => ({ id: item.reservationId, title: item.reservationId, meta: `${item.status} · ${item.agentId ?? "agent unavailable"} · reserved ${formatEconomicAmount(item.amount, item.unit)}`, detail: item.failureReason ?? `quote ${item.quoteId}; no payment capture implied`, tone: item.status === "reserved" || item.status === "confirmed" ? "good" : item.status === "failed" ? "warn" : "muted" }))} />
          </div>
        </section>
      </div>
    </Shared.SectionDisclosure></div>
    <div id="economics-diagnostics"><Shared.SectionDisclosure title="Diagnostic — metering, settlement and receipt evidence" summary="Execution-level operational accounting evidence. Legal billing and payment rails remain not claimed." tier="Diagnostic">
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Metering</h2><p>Recorded usage per execution run</p></div><Shared.Badge tone="muted">{metering.data?.length ?? 0}</Shared.Badge></div>
          <div className="panel-body">
            <Shared.TimelineList limit={8} items={(metering.data ?? []).map(item => ({ id: item.meterId, title: item.meterId, meta: `${item.status} · ${item.executionRunId} · metered ${formatEconomicAmount(item.amount, item.unit)}`, detail: `${item.target}; provider ${item.providerId ?? "unavailable"}`, tone: item.status === "settled" ? "good" : item.status === "failed" ? "warn" : "muted" }))} />
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Settlements</h2><p>Operational settlement records</p></div><Shared.Badge tone="muted">{settlements.data?.length ?? 0}</Shared.Badge></div>
          <div className="panel-body">
            <Shared.TimelineList limit={8} items={(settlements.data ?? []).map(item => ({ id: item.settlementId, title: item.settlementId, meta: `${item.status} · ${item.executionRunId ?? "run unavailable"} · ${formatEconomicAmount(item.amount, item.unit)}`, detail: item.failureReason ?? "operational settlement record; not legal settlement", tone: item.status === "settled" ? "good" : item.status === "failed" ? "warn" : "muted" }))} />
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Receipts</h2><p>Operational receipts only</p></div><Shared.Badge tone="muted">{receipts.data?.length ?? 0}</Shared.Badge></div>
          <div className="panel-body">
            <Shared.TimelineList limit={8} items={(receipts.data ?? []).map(item => ({ id: item.receiptId, title: item.receiptId, meta: `${item.status} · ${item.executionRunId} · ${formatEconomicAmount(item.amount, item.unit)}`, detail: `${item.summary}; not invoice/payment receipt`, tone: item.status === "issued" || item.status === "settled" ? "good" : "warn" }))} />
          </div>
        </section>
      </div>
    </Shared.SectionDisclosure>
    <Shared.SectionDisclosure title="Diagnostic — Product API warnings" summary="Economic warnings are operational findings, not budget or billing judgments." tier="Diagnostic">
      <section className="panel">
        <div className="panel-head"><div><h2>Warnings</h2><p>Operational findings</p></div><Shared.Badge tone="muted">{data?.warnings.length ?? 0}</Shared.Badge></div>
        <div className="panel-body">
            <Shared.TimelineList items={(data?.warnings ?? []).map((warning, index) => ({ id: `warning-${index}`, title: warning.severity, detail: warning.message, tone: warning.severity === "error" ? "warn" : undefined }))} />
        </div>
      </section>
    </Shared.SectionDisclosure></div>
    <div className="flow-group" id="economics-boundaries">
      <div className="flow-group-head"><h2>Boundary evidence</h2><p>EPIC-13 reports are Economics children. They prove financial no-claims; they are not billing products.</p></div>
      <section className="panel blocked-panel"><div className="panel-head"><div><h2>Not billing</h2><p>Governed read-only economics</p></div><Shared.Badge tone="muted">all billing claims not claimed</Shared.Badge></div><p className="panel-note">Billing, invoices, payment rails, tenant billing, balances, budgets, wallets, exchange rates and production financial operations are not implemented ACS claims. Open the boundary reports for evidence.</p><Shared.CrossLinks links={allBoundaryLinks} /></section>
    </div>
  </>;
}

export function PaymentRailsBoundaryView() {
  const { data, loadState, loadError, stale, refresh } = Shared.useOperationalSummary<Api.PaymentRailsBoundaryReport>(
    () => Api.productApi.getPaymentRailsBoundaryReport(),
    "Unable to load payment rails boundary from Product API",
    () => false,
  );
  const paymentProviderBoundary = data?.paymentProviderBoundary;
  const authorizationCaptureBoundary = data?.authorizationCaptureBoundary;
  const noMoneyMovementGuardrail = data?.noMoneyMovementGuardrail;
  const refundChargebackBoundary = data?.refundChargebackBoundary;
  const paymentSecretBoundary = data?.paymentSecretBoundary;
  const readinessGates = data?.readinessGates ?? [];
  const failureDeferredStates = data?.failureDeferredStates ?? [];

  return <>
    <header className="domain-header">
      <div>
        <p className="eyebrow">PAYMENT RAILS BOUNDARY</p>
        <h1>Payment Rails Boundary</h1>
        <p>Read-only boundary projection for payment provider, authorization, capture, refund and chargeback concepts. No real money movement is allowed here.</p>
      </div>
      <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
    </header>
    <div className="guardrail-banner" role="note">
      <span>Inspection mode</span>
      <span>Sandbox only</span>
      <span>Read-only</span>
      <span>Product API is source of truth</span>
      <span>No real authorization / capture / refund / chargeback</span>
    </div>
    {Shared.staleBanner({ stale, loadState, loadError }, "payment rails boundary")}
    <Shared.CrossLinks links={[
      { to: "/economics", label: "Economics" },
      { to: "/system/billing-boundary", label: "Billing boundary" },
      { to: "/system/pricing-invoice-boundary", label: "Pricing & invoice boundary" },
    ]} />
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Claims</h2>
        <p>All payment claims remain explicitly not claimed.</p>
      </div>
      <div className="dashboard-grid execution-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Status</h2><p>Governed claims snapshot</p></div></div>
          <div className="panel-body">
            <div className="summary-list">
              <Shared.SummaryRow label="Payment Ready" value={data?.paymentReady ? "YES" : "NO / not yet claimed"} tone={data?.paymentReady ? "good" : "muted"} />
              <Shared.SummaryRow label="Refund Ready" value={data?.refundReady ? "YES" : "NO / not yet claimed"} tone={data?.refundReady ? "good" : "muted"} />
              <Shared.SummaryRow label="Chargeback Ready" value={data?.chargebackReady ? "YES" : "NO / not yet claimed"} tone={data?.chargebackReady ? "good" : "muted"} />
              <Shared.SummaryRow label="Production Financial Operations" value={data?.productionFinancialOperationsReady ? "YES" : "NO / not yet claimed"} tone={data?.productionFinancialOperationsReady ? "good" : "muted"} />
              <Shared.SummaryRow label="Claim" value={data?.claim ?? "not_claimed"} tone="muted" />
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Boundary model</h2><p>Provider and integration posture</p></div></div>
          <div className="panel-body">
            {paymentProviderBoundary
              ? <div className="summary-list">
                <Shared.SummaryRow label="Provider" value={`${paymentProviderBoundary.providerName} (${paymentProviderBoundary.providerType})`} />
                <Shared.SummaryRow label="Provider state" value={paymentProviderBoundary.providerState} />
                <Shared.SummaryRow label="Integration state" value={paymentProviderBoundary.integrationState} />
                <Shared.SummaryRow label="Credential state" value={paymentProviderBoundary.credentialBoundaryState} />
                <Shared.SummaryRow label="Authorization support" value={paymentProviderBoundary.authorizationSupportState} />
                <Shared.SummaryRow label="Capture support" value={paymentProviderBoundary.captureSupportState} />
                <Shared.SummaryRow label="Refund support" value={paymentProviderBoundary.refundSupportState} />
                <Shared.SummaryRow label="Chargeback support" value={paymentProviderBoundary.chargebackSupportState} />
                <Shared.SummaryRow label="Settlement dependency" value={paymentProviderBoundary.settlementDependency} />
              </div>
              : <Shared.PanelStateLine state={loadState} error={loadError} emptyMessage="No payment provider boundary available." />}
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Authorization / capture</h2>
        <p>Authorization and capture are conceptual only in this milestone.</p>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Authorization vs capture</h2><p>Read-only state model</p></div></div>
          <div className="panel-body">
            {authorizationCaptureBoundary
              ? <div className="summary-list">
                <Shared.SummaryRow label="Authorization intent" value={authorizationCaptureBoundary.authorizationIntent} />
                <Shared.SummaryRow label="Authorization state" value={authorizationCaptureBoundary.authorizationState} />
                <Shared.SummaryRow label="Capture state" value={authorizationCaptureBoundary.captureState} />
                <Shared.SummaryRow label="Capture dependency" value={authorizationCaptureBoundary.captureDependency} />
                <Shared.SummaryRow label="Settlement dependency" value={authorizationCaptureBoundary.settlementDependency} />
              </div>
              : <Shared.PanelStateLine state={loadState} error={loadError} emptyMessage="No authorization / capture boundary available." />}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>No-money-movement guardrail</h2><p>Hard stop for real payment activity</p></div></div>
          <div className="panel-body">
            {noMoneyMovementGuardrail
              ? <div className="summary-list">
                {noMoneyMovementGuardrail.statements.map((statement: string, index: number) => <Shared.SummaryRow key={`${statement}-${index}`} label={`Guardrail ${index + 1}`} value={statement} tone="muted" />)}
              </div>
              : <Shared.PanelStateLine state={loadState} error={loadError} emptyMessage="No guardrail snapshot available." />}
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Failure, secrets, and deferred scope</h2>
        <p>All unsupported paths remain deferred or blocked.</p>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Failure / deferred states</h2><p>Payment boundary vocabulary</p></div></div>
          <div className="panel-body">
            <Shared.TimelineList items={failureDeferredStates.map((item: string, index: number) => ({ id: `${item}-${index}`, title: item, tone: "muted" }))} />
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Secret boundary</h2><p>Credential posture</p></div></div>
          <div className="panel-body">
            {paymentSecretBoundary
              ? <div className="summary-list">
                <Shared.SummaryRow label="Secret class" value={paymentSecretBoundary.requiredSecretsClass.join(", ")} />
                <Shared.SummaryRow label="Storage requirement" value={paymentSecretBoundary.storageRequirement} />
                <Shared.SummaryRow label="Injection boundary" value={paymentSecretBoundary.injectionBoundary} />
                <Shared.SummaryRow label="Redaction requirement" value={paymentSecretBoundary.redactionRequirement} />
                <Shared.SummaryRow label="Production credential status" value={paymentSecretBoundary.productionCredentialStatus} />
              </div>
              : <Shared.PanelStateLine state={loadState} error={loadError} emptyMessage="No secret boundary available." />}
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Refund / chargeback and gates</h2>
        <p>Claim discipline blocks all financial readiness claims here.</p>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Refund / chargeback boundary</h2><p>Conceptual only</p></div></div>
          <div className="panel-body">
            {refundChargebackBoundary
              ? <div className="summary-list">
                <Shared.SummaryRow label="Refund boundary" value={refundChargebackBoundary.refundBoundary} />
                <Shared.SummaryRow label="Chargeback boundary" value={refundChargebackBoundary.chargebackBoundary} />
                <Shared.SummaryRow label="Dispute workflow" value={refundChargebackBoundary.disputeWorkflowDependency} />
                <Shared.SummaryRow label="Accounting dependency" value={refundChargebackBoundary.accountingDependency} />
                <Shared.SummaryRow label="Compliance caveat" value={refundChargebackBoundary.complianceCaveat} />
              </div>
              : <Shared.PanelStateLine state={loadState} error={loadError} emptyMessage="No refund / chargeback boundary available." />}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Readiness gates</h2><p>Claim impact remains blocked</p></div><Shared.Badge tone={readinessGates.length ? "good" : "muted"}>{readinessGates.length}</Shared.Badge></div>
          <div className="panel-body">
            <Shared.TimelineList items={(readinessGates ?? []).map((gate: Api.PaymentRailsBoundaryReport["readinessGates"][number]) => ({
              id: gate.id,
              title: gate.label,
              meta: `${gate.status} · ${gate.claimImpact}`,
              detail: `${gate.evidence.join(" · ") || "No evidence"}${gate.blockers.length ? ` · blockers: ${gate.blockers.join(" · ")}` : ""}${gate.caveats.length ? ` · caveats: ${gate.caveats.join(" · ")}` : ""}`,
              tone: gate.status === "blocked" ? "warn" : gate.status === "partial" ? "muted" : undefined,
            }))} />
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Evidence and scope</h2>
        <p>Visible evidence only; deferred EPIC-14+ scope stays deferred.</p>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Source evidence</h2><p>Product API snapshot</p></div></div>
          <div className="panel-body">
            <Shared.TimelineList items={(data?.sourceEvidence ?? []).map((item: string, index: number) => ({ id: `${item}-${index}`, title: item, tone: "muted" }))} />
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Deferred scope</h2><p>EPIC-14+ candidates only</p></div><Shared.Badge tone="muted">{data?.deferredScope?.length ?? 0}</Shared.Badge></div>
          <div className="panel-body">
            <Shared.TimelineList items={(data?.deferredScope ?? []).map((item: string, index: number) => ({ id: `${item}-${index}`, title: item, tone: "muted" }))} />
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Claim discipline</h2>
        <p>Payment-related financial claims remain NO / not yet claimed.</p>
      </div>
      <section className="panel blocked-panel">
        <div className="panel-head"><div><h2>Claim discipline</h2><p>No financial readiness claims in this milestone</p></div><Shared.Badge tone="muted">not claimed</Shared.Badge></div>
        <div className="panel-body">
          <div className="summary-list">
            <Shared.SummaryRow label="Payment Ready claim" value={data?.claimDiscipline?.paymentReadyClaimAllowed ? "allowed" : "NO / not yet claimed"} tone="muted" />
            <Shared.SummaryRow label="Refund Ready claim" value={data?.claimDiscipline?.refundReadyClaimAllowed ? "allowed" : "NO / not yet claimed"} tone="muted" />
            <Shared.SummaryRow label="Chargeback Ready claim" value={data?.claimDiscipline?.chargebackReadyClaimAllowed ? "allowed" : "NO / not yet claimed"} tone="muted" />
            <Shared.SummaryRow label="Billing Ready claim" value={data?.claimDiscipline?.billingReadyClaimAllowed ? "allowed" : "NO / not yet claimed"} tone="muted" />
            <Shared.SummaryRow label="Production Financial Operations claim" value={data?.claimDiscipline?.productionFinancialOperationsClaimAllowed ? "allowed" : "NO / not yet claimed"} tone="muted" />
            <Shared.SummaryRow label="Reason" value={data?.claimDiscipline?.reason ?? "claim discipline remains blocked"} />
          </div>
        </div>
      </section>
    </div>
  </>;
}

export function PricingInvoiceBoundaryView() {
  const { data, loadState, loadError, stale, refresh } = Shared.useOperationalSummary<Api.PricingInvoiceBoundaryReport>(
    () => Api.productApi.getPricingInvoiceBoundaryReport(),
    "Unable to load pricing and invoice boundary from Product API",
    () => false,
  );
  const pricingBoundary = data?.pricingBoundary;
  const quoteCandidates = data?.quoteCandidates ?? [];
  const quoteToInvoiceFlow = data?.quoteToInvoiceFlow;
  const invoiceCandidates = data?.invoiceCandidates ?? [];
  const invoiceArtifactBoundary = data?.invoiceArtifactBoundary;
  const readinessGates = data?.readinessGates ?? [];

  return <>
    <header className="domain-header">
      <div>
        <p className="eyebrow">PRICING, QUOTE &amp; INVOICE CONTRACTS</p>
        <h1>Pricing, Quote &amp; Invoice Contracts</h1>
        <p>Read-only boundary projection for pricing, quote candidates and invoice candidate contracts. No real invoice or payment activity is allowed here.</p>
      </div>
      <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
    </header>
    <div className="guardrail-banner" role="note">
      <span>Inspection mode</span>
      <span>Sandbox only</span>
      <span>Read-only</span>
      <span>Product API is source of truth</span>
      <span>No real invoice / no payment / no money movement</span>
    </div>
    {Shared.staleBanner({ stale, loadState, loadError }, "pricing and invoice boundary")}
    <Shared.CrossLinks links={[
      { to: "/economics", label: "Economics" },
      { to: "/system/billing-boundary", label: "Billing boundary" },
      { to: "/system/payment-rails-boundary", label: "Payment rails boundary" },
    ]} />
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Claims</h2>
        <p>All pricing, invoice and tax claims remain explicitly not claimed.</p>
      </div>
      <div className="dashboard-grid execution-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Status</h2><p>Governed claims snapshot</p></div></div>
          <div className="panel-body">
            <div className="summary-list">
              <Shared.SummaryRow label="Pricing Ready" value={data?.pricingReady ? "YES" : "NO / not yet claimed"} tone={data?.pricingReady ? "good" : "muted"} />
              <Shared.SummaryRow label="Invoice Ready" value={data?.invoiceReady ? "YES" : "NO / not yet claimed"} tone={data?.invoiceReady ? "good" : "muted"} />
              <Shared.SummaryRow label="Billing Ready" value={data?.billingReady ? "YES" : "NO / not yet claimed"} tone={data?.billingReady ? "good" : "muted"} />
              <Shared.SummaryRow label="Payment Ready" value={data?.paymentReady ? "YES" : "NO / not yet claimed"} tone={data?.paymentReady ? "good" : "muted"} />
              <Shared.SummaryRow label="Tenant Billing Ready" value={data?.tenantBillingReady ? "YES" : "NO / not yet claimed"} tone={data?.tenantBillingReady ? "good" : "muted"} />
              <Shared.SummaryRow label="Production Financial Operations" value={data?.productionFinancialOperationsReady ? "YES" : "NO / not yet claimed"} tone={data?.productionFinancialOperationsReady ? "good" : "muted"} />
              <Shared.SummaryRow label="Tax Ready" value={data?.taxReady ? "YES" : "NO / not yet claimed"} tone={data?.taxReady ? "good" : "muted"} />
              <Shared.SummaryRow label="Compliance Ready" value={data?.complianceReady ? "YES" : "NO / not yet claimed"} tone={data?.complianceReady ? "good" : "muted"} />
              <Shared.SummaryRow label="Claim" value={data?.claim ?? "not_claimed"} tone="muted" />
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Pricing boundary</h2><p>Source-of-truth posture and dependencies</p></div></div>
          <div className="panel-body">
            {pricingBoundary
              ? <div className="summary-list">
                <Shared.SummaryRow label="Pricing boundary status" value={pricingBoundary.pricingBoundaryStatus} />
                <Shared.SummaryRow label="Pricing source" value={pricingBoundary.pricingSource} />
                <Shared.SummaryRow label="Pricing authority" value={pricingBoundary.pricingAuthority} />
                <Shared.SummaryRow label="Pricing state" value={pricingBoundary.pricingState} />
                <Shared.SummaryRow label="Financial truth dependency" value={pricingBoundary.financialTruthDependency} />
                <Shared.SummaryRow label="Billable event dependency" value={pricingBoundary.billableEventDependency} />
                <Shared.SummaryRow label="Quote dependency" value={pricingBoundary.quoteDependency} />
              </div>
              : <Shared.PanelStateLine state={loadState} error={loadError} emptyMessage="No pricing boundary available." />}
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Quote candidates</h2>
        <p>Candidate quotes remain conceptual and evidence-bounded.</p>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Quote candidates</h2><p>Read-only candidate set</p></div><Shared.Badge tone="muted">{quoteCandidates.length}</Shared.Badge></div>
          <div className="panel-body">
            <Shared.TimelineList items={quoteCandidates.map((quote, index) => ({
              id: `${quote.quoteCandidateId}-${index}`,
              title: quote.quoteCandidateId,
              meta: `${quote.amountState} · ${quote.currencyState} · ${quote.approvalState}`,
              detail: `${quote.relatedBillableEvent}${quote.blockers.length ? ` · blockers: ${quote.blockers.join(" · ")}` : ""}${quote.caveats.length ? ` · caveats: ${quote.caveats.join(" · ")}` : ""}`,
              tone: quote.amountState === "computed_candidate" ? "good" : "muted",
            }))} />
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Quote-to-invoice flow</h2><p>Conceptual boundary only</p></div></div>
          <div className="panel-body">
            {quoteToInvoiceFlow
              ? <div className="summary-list">
                <Shared.SummaryRow label="Status" value={quoteToInvoiceFlow.status} />
                <Shared.SummaryRow label="Financial truth" value={quoteToInvoiceFlow.requiredFinancialTruth} />
                <Shared.SummaryRow label="Pricing source" value={quoteToInvoiceFlow.requiredPricingSource} />
                <Shared.SummaryRow label="Invoice boundary" value={quoteToInvoiceFlow.requiredInvoiceBoundary} />
                <Shared.SummaryRow label="Compliance / tax decision" value={quoteToInvoiceFlow.requiredComplianceTaxDecision} />
              </div>
              : <Shared.PanelStateLine state={loadState} error={loadError} emptyMessage="No quote-to-invoice flow available." />}
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Invoice candidates</h2>
        <p>Invoice artifacts remain candidates, not legal/tax invoices.</p>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Invoice candidates</h2><p>Read-only candidate set</p></div><Shared.Badge tone="muted">{invoiceCandidates.length}</Shared.Badge></div>
          <div className="panel-body">
            <Shared.TimelineList items={invoiceCandidates.map((invoice, index) => ({
              id: `${invoice.invoiceCandidateId}-${index}`,
              title: invoice.invoiceCandidateId,
              meta: `${invoice.artifactState} · ${invoice.legalTaxState} · ${invoice.approvalState}`,
              detail: `${invoice.relatedQuoteCandidate}${invoice.blockers.length ? ` · blockers: ${invoice.blockers.join(" · ")}` : ""}${invoice.caveats.length ? ` · caveats: ${invoice.caveats.join(" · ")}` : ""}`,
              tone: invoice.artifactState === "draft_candidate" ? "good" : "muted",
            }))} />
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Invoice artifact boundary</h2><p>Legal/tax and accounting caveats remain deferred</p></div></div>
          <div className="panel-body">
            {invoiceArtifactBoundary
              ? <div className="summary-list">
                <Shared.SummaryRow label="Invoice candidate" value={invoiceArtifactBoundary.invoiceCandidate} />
                <Shared.SummaryRow label="Operational invoice artifact" value={invoiceArtifactBoundary.operationalInvoiceArtifact} />
                <Shared.SummaryRow label="Legal/tax invoice" value={invoiceArtifactBoundary.legalTaxInvoice} />
                <Shared.SummaryRow label="Tax-compliant invoice" value={invoiceArtifactBoundary.taxCompliantInvoice} />
                <Shared.SummaryRow label="Accounting invoice" value={invoiceArtifactBoundary.accountingInvoice} />
                <Shared.SummaryRow label="Receipt" value={invoiceArtifactBoundary.receipt} />
                <Shared.SummaryRow label="Payment request" value={invoiceArtifactBoundary.paymentRequest} />
                <Shared.SummaryRow label="Legal/tax readiness" value={invoiceArtifactBoundary.legalTaxInvoiceReadiness} />
                <Shared.SummaryRow label="Compliance readiness" value={invoiceArtifactBoundary.complianceReadiness} />
                <Shared.SummaryRow label="Accounting integration" value={invoiceArtifactBoundary.accountingIntegration} />
                <Shared.SummaryRow label="Country-specific tax automation" value={invoiceArtifactBoundary.countrySpecificTaxAutomation} />
              </div>
              : <Shared.PanelStateLine state={loadState} error={loadError} emptyMessage="No invoice artifact boundary available." />}
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Readiness gates</h2>
        <p>Claim impact remains blocked for pricing, invoice and production financial operations.</p>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Readiness gates</h2><p>Contractual gates</p></div><Shared.Badge tone={readinessGates.length ? "good" : "muted"}>{readinessGates.length}</Shared.Badge></div>
          <div className="panel-body">
            <Shared.TimelineList items={readinessGates.map((gate: Api.PricingInvoiceBoundaryReport["readinessGates"][number]) => ({
              id: gate.id,
              title: gate.label,
              meta: `${gate.status} · ${Array.isArray(gate.claimImpact) ? gate.claimImpact.join(" · ") : gate.claimImpact}`,
              detail: `${gate.evidence.join(" · ") || "No evidence"}${gate.blockers.length ? ` · blockers: ${gate.blockers.join(" · ")}` : ""}${gate.caveats.length ? ` · caveats: ${gate.caveats.join(" · ")}` : ""}`,
              tone: gate.status === "blocked" ? "warn" : gate.status === "partial" ? "muted" : undefined,
            }))} />
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Claims discipline</h2><p>All pricing and invoice claims remain explicitly not claimed.</p></div></div>
          <div className="panel-body">
            <div className="summary-list">
              <Shared.SummaryRow label="Pricing Ready claim" value={data?.claimDiscipline?.pricingReadyClaimAllowed ? "allowed" : "NO / not yet claimed"} tone="muted" />
              <Shared.SummaryRow label="Invoice Ready claim" value={data?.claimDiscipline?.invoiceReadyClaimAllowed ? "allowed" : "NO / not yet claimed"} tone="muted" />
              <Shared.SummaryRow label="Billing Ready claim" value={data?.claimDiscipline?.billingReadyClaimAllowed ? "allowed" : "NO / not yet claimed"} tone="muted" />
              <Shared.SummaryRow label="Payment Ready claim" value={data?.claimDiscipline?.paymentReadyClaimAllowed ? "allowed" : "NO / not yet claimed"} tone="muted" />
              <Shared.SummaryRow label="Tenant Billing Ready claim" value={data?.claimDiscipline?.tenantBillingReadyClaimAllowed ? "allowed" : "NO / not yet claimed"} tone="muted" />
              <Shared.SummaryRow label="Production Financial Operations claim" value={data?.claimDiscipline?.productionFinancialOperationsClaimAllowed ? "allowed" : "NO / not yet claimed"} tone="muted" />
              <Shared.SummaryRow label="Tax Ready claim" value={data?.claimDiscipline?.taxReadyClaimAllowed ? "allowed" : "NO / not yet claimed"} tone="muted" />
              <Shared.SummaryRow label="Compliance Ready claim" value={data?.claimDiscipline?.complianceReadyClaimAllowed ? "allowed" : "NO / not yet claimed"} tone="muted" />
              <Shared.SummaryRow label="Reason" value={data?.claimDiscipline?.reason ?? "claim discipline remains blocked"} />
            </div>
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Evidence and scope</h2>
        <p>Visible evidence only; deferred EPIC-14+ scope stays deferred.</p>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Source evidence</h2><p>Product API snapshot</p></div></div>
          <div className="panel-body">
            <Shared.TimelineList items={(data?.sourceEvidence ?? []).map((item: string, index: number) => ({ id: `${item}-${index}`, title: item, tone: "muted" }))} />
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Deferred scope</h2><p>EPIC-14+ candidates only</p></div><Shared.Badge tone="muted">{data?.deferredScope?.length ?? 0}</Shared.Badge></div>
          <div className="panel-body">
            <Shared.TimelineList items={(data?.deferredScope ?? []).map((item: string, index: number) => ({ id: `${item}-${index}`, title: item, tone: "muted" }))} />
          </div>
        </section>
      </div>
    </div>
  </>;
}

export function BillingBoundaryView() {
  const { data, loadState, loadError, stale, refresh } = Shared.useOperationalSummary<Api.BillingBoundaryReport>(
    () => Api.productApi.getBillingBoundaryReport(),
    "Unable to load billing boundary from Product API",
    () => false,
  );
  const financialTruth = data?.financialTruth;
  const billingBoundary = data?.billingBoundary;
  const billableEventCandidates = data?.billableEventCandidates ?? [];
  const readinessGates = data?.readinessGates ?? [];

  return <>
    <header className="domain-header">
      <div>
        <p className="eyebrow">BILLING BOUNDARY &amp; FINANCIAL TRUTH</p>
        <h1>Billing Boundary &amp; Financial Truth</h1>
        <p>Read-only boundary projection for financial truth, billing intent and billable event candidates. No billing mutation or real money movement is allowed here.</p>
      </div>
      <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
    </header>
    <div className="guardrail-banner" role="note">
      <span>Inspection mode</span>
      <span>Sandbox only</span>
      <span>Read-only</span>
      <span>Product API is source of truth</span>
      <span>No billing mutation / no invoice / no payment / no money movement</span>
    </div>
    {Shared.staleBanner({ stale, loadState, loadError }, "billing boundary")}
    <Shared.CrossLinks links={[
      { to: "/economics", label: "Economics" },
      { to: "/system/pricing-invoice-boundary", label: "Pricing & invoice boundary" },
      { to: "/system/payment-rails-boundary", label: "Payment rails boundary" },
      { to: "/system/tenant-billing-boundary", label: "Tenant billing boundary" },
    ]} />
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Claims</h2>
        <p>All billing and financial-operation claims remain explicitly not claimed.</p>
      </div>
      <div className="dashboard-grid execution-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Status</h2><p>Governed claims snapshot</p></div></div>
          <div className="panel-body">
            <div className="summary-list">
              <Shared.SummaryRow label="Billing Ready" value={data?.billingReady ? "YES" : "NO / not yet claimed"} tone={data?.billingReady ? "good" : "muted"} />
              <Shared.SummaryRow label="Payment Ready" value={data?.paymentReady ? "YES" : "NO / not yet claimed"} tone={data?.paymentReady ? "good" : "muted"} />
              <Shared.SummaryRow label="Invoice Ready" value={data?.invoiceReady ? "YES" : "NO / not yet claimed"} tone={data?.invoiceReady ? "good" : "muted"} />
              <Shared.SummaryRow label="Tenant Billing Ready" value={data?.tenantBillingReady ? "YES" : "NO / not yet claimed"} tone={data?.tenantBillingReady ? "good" : "muted"} />
              <Shared.SummaryRow label="Production Financial Operations" value={data?.productionFinancialOperationsReady ? "YES" : "NO / not yet claimed"} tone={data?.productionFinancialOperationsReady ? "good" : "muted"} />
              <Shared.SummaryRow label="Claim" value={data?.claim ?? "not_claimed"} tone="muted" />
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Financial truth</h2><p>Source candidates and evidence posture</p></div></div>
          <div className="panel-body">
            {financialTruth
              ? <div className="summary-list">
                <Shared.SummaryRow label="Source id" value={financialTruth.sourceId} />
                <Shared.SummaryRow label="Source name" value={financialTruth.sourceName} />
                <Shared.SummaryRow label="Source type" value={financialTruth.sourceType} />
                <Shared.SummaryRow label="Authority level" value={financialTruth.authorityLevel} />
                <Shared.SummaryRow label="State" value={financialTruth.state} />
                <Shared.SummaryRow label="Claim impact" value={financialTruth.claimImpact} />
              </div>
              : <Shared.PanelStateLine state={loadState} error={loadError} emptyMessage="No financial truth snapshot available." />}
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Billing boundary</h2>
        <p>Billing intent and evidence-bounded dependency model.</p>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Boundary model</h2><p>Read-only posture</p></div></div>
          <div className="panel-body">
            {billingBoundary
              ? <div className="summary-list">
                <Shared.SummaryRow label="Billing boundary status" value={billingBoundary.billingBoundaryStatus} />
                <Shared.SummaryRow label="Billing intent" value={billingBoundary.billingIntent} />
                <Shared.SummaryRow label="Billable event model" value={billingBoundary.billableEventModel} />
                <Shared.SummaryRow label="Financial truth dependency" value={billingBoundary.financialTruthDependency} />
                <Shared.SummaryRow label="Product API dependency" value={billingBoundary.productApiSourceOfTruthDependency} />
                <Shared.SummaryRow label="No-claim posture" value={billingBoundary.noClaimPosture} />
              </div>
              : <Shared.PanelStateLine state={loadState} error={loadError} emptyMessage="No billing boundary snapshot available." />}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Readiness gates</h2><p>Claim impact remains blocked</p></div><Shared.Badge tone={readinessGates.length ? "good" : "muted"}>{readinessGates.length}</Shared.Badge></div>
          <div className="panel-body">
            <Shared.TimelineList items={readinessGates.map((gate: Api.BillingBoundaryReport["readinessGates"][number]) => ({
              id: gate.id,
              title: gate.label,
              meta: `${gate.status} · ${Array.isArray(gate.claimImpact) ? gate.claimImpact.join(" · ") : gate.claimImpact}`,
              detail: `${gate.evidence.join(" · ") || "No evidence"}${gate.blockers.length ? ` · blockers: ${gate.blockers.join(" · ")}` : ""}${gate.caveats.length ? ` · caveats: ${gate.caveats.join(" · ")}` : ""}`,
              tone: gate.status === "blocked" ? "warn" : gate.status === "partial" ? "muted" : undefined,
            }))} />
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Billable event candidates</h2>
        <p>Candidate events remain conceptual and evidence-bounded.</p>
      </div>
      <section className="panel">
        <div className="panel-head"><div><h2>Billable event candidates</h2><p>Read-only candidate set</p></div><Shared.Badge tone="muted">{billableEventCandidates.length}</Shared.Badge></div>
        <div className="panel-body">
          <Shared.TimelineList items={billableEventCandidates.map((event, index) => ({
            id: `${event.eventId}-${index}`,
            title: event.eventId,
            meta: `${event.eventType} · ${event.state}`,
            detail: `${event.eventSource}${event.blockers.length ? ` · blockers: ${event.blockers.join(" · ")}` : ""}${event.caveats.length ? ` · caveats: ${event.caveats.join(" · ")}` : ""}`,
            tone: event.state === "observed_evidence" ? "good" : "muted",
          }))} />
        </div>
      </section>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Evidence and scope</h2>
        <p>Visible evidence only; deferred EPIC-14+ scope stays deferred.</p>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Source evidence</h2><p>Product API snapshot</p></div></div>
          <div className="panel-body">
            <Shared.TimelineList items={(data?.sourceEvidence ?? []).map((item: string, index: number) => ({ id: `${item}-${index}`, title: item, tone: "muted" }))} />
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Deferred scope</h2><p>EPIC-14+ candidates only</p></div><Shared.Badge tone="muted">{data?.deferredScope?.length ?? 0}</Shared.Badge></div>
          <div className="panel-body">
            <Shared.TimelineList items={(data?.deferredScope ?? []).map((item: string, index: number) => ({ id: `${item}-${index}`, title: item, tone: "muted" }))} />
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Claim discipline</h2>
        <p>No financial readiness claims in this milestone.</p>
      </div>
      <section className="panel blocked-panel">
        <div className="panel-head"><div><h2>Claim discipline</h2><p>No billing financial claims in this milestone</p></div><Shared.Badge tone="muted">not claimed</Shared.Badge></div>
        <div className="panel-body">
          <div className="summary-list">
            <Shared.SummaryRow label="Billing Ready claim" value={data?.claimDiscipline?.billingReadyClaimAllowed ? "allowed" : "NO / not yet claimed"} tone="muted" />
            <Shared.SummaryRow label="Payment Ready claim" value={data?.claimDiscipline?.paymentReadyClaimAllowed ? "allowed" : "NO / not yet claimed"} tone="muted" />
            <Shared.SummaryRow label="Invoice Ready claim" value={data?.claimDiscipline?.invoiceReadyClaimAllowed ? "allowed" : "NO / not yet claimed"} tone="muted" />
            <Shared.SummaryRow label="Tenant Billing Ready claim" value={data?.claimDiscipline?.tenantBillingReadyClaimAllowed ? "allowed" : "NO / not yet claimed"} tone="muted" />
            <Shared.SummaryRow label="Production Financial Operations claim" value={data?.claimDiscipline?.productionFinancialOperationsClaimAllowed ? "allowed" : "NO / not yet claimed"} tone="muted" />
            <Shared.SummaryRow label="Reason" value={data?.claimDiscipline?.reason ?? "claim discipline remains blocked"} />
          </div>
        </div>
      </section>
    </div>
  </>;
}

export function TenantBillingBoundaryView() {
  const { data, loadState, loadError, stale, refresh } = Shared.useOperationalSummary<Api.TenantBillingBoundaryReport>(
    () => Api.productApi.getTenantBillingBoundaryReport(),
    "Unable to load tenant billing boundary from Product API",
    () => false,
  );
  const tenantAccountResponsibility = data?.tenantAccountResponsibility;
  const payerIdentityBoundary = data?.payerIdentityBoundary;
  const operatorIdentityBoundary = data?.operatorIdentityBoundary;
  const accountOwnershipBoundary = data?.accountOwnershipBoundary;
  const billingAccountabilityBoundary = data?.billingAccountabilityBoundary;
  const readinessGates = data?.readinessGates ?? [];
  const actorMatrix = data?.actorMatrix ?? [];

  return <>
    <header className="domain-header">
      <div>
        <p className="eyebrow">TENANT BILLING & ACCOUNT RESPONSIBILITY</p>
        <h1>Tenant Billing &amp; Account Responsibility</h1>
        <p>Read-only boundary projection for tenant, payer, operator and account accountability. No tenant billing mutation is allowed here.</p>
      </div>
      <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
    </header>
    <div className="guardrail-banner" role="note">
      <span>Inspection mode</span>
      <span>Sandbox only</span>
      <span>Read-only</span>
      <span>Product API is source of truth</span>
      <span>No tenant billing mutation / no payment method / no account mutation</span>
    </div>
    {Shared.staleBanner({ stale, loadState, loadError }, "tenant billing boundary")}
    <Shared.CrossLinks links={[
      { to: "/economics", label: "Economics" },
      { to: "/system/billing-boundary", label: "Billing boundary" },
      { to: "/system/payment-rails-boundary", label: "Payment rails boundary" },
      { to: "/system/pricing-invoice-boundary", label: "Pricing & invoice boundary" },
    ]} />
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Claims</h2>
        <p>All tenant billing claims remain explicitly not claimed.</p>
      </div>
      <div className="dashboard-grid execution-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Status</h2><p>Governed claims snapshot</p></div></div>
          <div className="panel-body">
            <div className="summary-list">
              <Shared.SummaryRow label="Tenant Billing Ready" value={data?.tenantBillingReady ? "YES" : "NO / not yet claimed"} tone={data?.tenantBillingReady ? "good" : "muted"} />
              <Shared.SummaryRow label="Tenant Administration Ready" value={data?.tenantAdministrationReady ? "YES" : "NO / not yet claimed"} tone={data?.tenantAdministrationReady ? "good" : "muted"} />
              <Shared.SummaryRow label="Billing Ready" value={data?.billingReady ? "YES" : "NO / not yet claimed"} tone={data?.billingReady ? "good" : "muted"} />
              <Shared.SummaryRow label="Payment Ready" value={data?.paymentReady ? "YES" : "NO / not yet claimed"} tone={data?.paymentReady ? "good" : "muted"} />
              <Shared.SummaryRow label="Invoice Ready" value={data?.invoiceReady ? "YES" : "NO / not yet claimed"} tone={data?.invoiceReady ? "good" : "muted"} />
              <Shared.SummaryRow label="Production Financial Operations" value={data?.productionFinancialOperationsReady ? "YES" : "NO / not yet claimed"} tone={data?.productionFinancialOperationsReady ? "good" : "muted"} />
              <Shared.SummaryRow label="Claim" value={data?.claim ?? "not_claimed"} tone="muted" />
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Tenant responsibility</h2><p>Tenant/account responsibility boundary</p></div></div>
          <div className="panel-body">
            {tenantAccountResponsibility
              ? <div className="summary-list">
                <Shared.SummaryRow label="Tenant id" value={tenantAccountResponsibility.tenantId} />
                <Shared.SummaryRow label="Tenant account id" value={tenantAccountResponsibility.tenantAccountId} />
                <Shared.SummaryRow label="Account owner state" value={tenantAccountResponsibility.accountOwnerState} />
                <Shared.SummaryRow label="Billing responsibility state" value={tenantAccountResponsibility.billingResponsibilityState} />
                <Shared.SummaryRow label="Payer dependency" value={tenantAccountResponsibility.payerDependency} />
                <Shared.SummaryRow label="Operator dependency" value={tenantAccountResponsibility.operatorDependency} />
                <Shared.SummaryRow label="Financial truth dependency" value={tenantAccountResponsibility.financialTruthDependency} />
                <Shared.SummaryRow label="Invoice dependency" value={tenantAccountResponsibility.invoiceDependency} />
                <Shared.SummaryRow label="Payment dependency" value={tenantAccountResponsibility.paymentDependency} />
              </div>
              : <Shared.PanelStateLine state={loadState} error={loadError} emptyMessage="No tenant account responsibility snapshot available." />}
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Actor boundaries</h2>
        <p>Identity and authority remain separated.</p>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Payer identity</h2><p>Who can be associated with billing accountability</p></div></div>
          <div className="panel-body">
            {payerIdentityBoundary
              ? <div className="summary-list">
                <Shared.SummaryRow label="Payer id" value={payerIdentityBoundary.payerId} />
                <Shared.SummaryRow label="Payer type" value={payerIdentityBoundary.payerType} />
                <Shared.SummaryRow label="Verification state" value={payerIdentityBoundary.payerVerificationState} />
                <Shared.SummaryRow label="Authority state" value={payerIdentityBoundary.payerAuthorityState} />
                <Shared.SummaryRow label="Billing accountability state" value={payerIdentityBoundary.billingAccountabilityState} />
                <Shared.SummaryRow label="Payment dependency" value={payerIdentityBoundary.paymentDependency} />
                <Shared.SummaryRow label="Compliance dependency" value={payerIdentityBoundary.complianceDependency} />
              </div>
              : <Shared.PanelStateLine state={loadState} error={loadError} emptyMessage="No payer identity boundary available." />}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Operator identity</h2><p>Operational actor with no billing mutation authority</p></div></div>
          <div className="panel-body">
            {operatorIdentityBoundary
              ? <div className="summary-list">
                <Shared.SummaryRow label="Operator id" value={operatorIdentityBoundary.operatorId} />
                <Shared.SummaryRow label="Operator role" value={operatorIdentityBoundary.operatorRole} />
                <Shared.SummaryRow label="Operation authority" value={operatorIdentityBoundary.operationAuthorityState} />
                <Shared.SummaryRow label="Billing action authority" value={operatorIdentityBoundary.billingActionAuthorityState} />
                <Shared.SummaryRow label="Audit responsibility" value={operatorIdentityBoundary.auditResponsibility} />
                <Shared.SummaryRow label="Actor correlation" value={operatorIdentityBoundary.actorCorrelation} />
              </div>
              : <Shared.PanelStateLine state={loadState} error={loadError} emptyMessage="No operator identity boundary available." />}
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Account accountability</h2>
        <p>Ownership and accountability are evidence-bounded only.</p>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Account ownership</h2><p>Source of ownership and related billing posture</p></div></div>
          <div className="panel-body">
            {accountOwnershipBoundary
              ? <div className="summary-list">
                <Shared.SummaryRow label="Ownership source" value={accountOwnershipBoundary.accountOwnershipSource} />
                <Shared.SummaryRow label="Billing accountability source" value={accountOwnershipBoundary.billingAccountabilitySource} />
                <Shared.SummaryRow label="Owner verification" value={accountOwnershipBoundary.ownerVerificationState} />
                <Shared.SummaryRow label="Payer relation" value={accountOwnershipBoundary.payerRelation} />
                <Shared.SummaryRow label="Tenant relation" value={accountOwnershipBoundary.tenantRelation} />
                <Shared.SummaryRow label="Invoice relation" value={accountOwnershipBoundary.invoiceRelation} />
                <Shared.SummaryRow label="Payment relation" value={accountOwnershipBoundary.paymentRelation} />
                <Shared.SummaryRow label="Audit relation" value={accountOwnershipBoundary.auditRelation} />
              </div>
              : <Shared.PanelStateLine state={loadState} error={loadError} emptyMessage="No account ownership boundary available." />}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Billing accountability</h2><p>Boundary around billing authority and evidence</p></div></div>
          <div className="panel-body">
            {billingAccountabilityBoundary
              ? <div className="summary-list">
                <Shared.SummaryRow label="Accountability source" value={billingAccountabilityBoundary.accountabilitySource} />
                <Shared.SummaryRow label="Authority state" value={billingAccountabilityBoundary.authorityState} />
                <Shared.SummaryRow label="Invoice dependency" value={billingAccountabilityBoundary.invoiceDependency} />
                <Shared.SummaryRow label="Payment dependency" value={billingAccountabilityBoundary.paymentDependency} />
                <Shared.SummaryRow label="Audit dependency" value={billingAccountabilityBoundary.auditDependency} />
              </div>
              : <Shared.PanelStateLine state={loadState} error={loadError} emptyMessage="No billing accountability boundary available." />}
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Actor matrix and gates</h2>
        <p>Tenant billing remains blocked by design.</p>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Actor matrix</h2><p>Role separation snapshot</p></div></div>
          <div className="panel-body">
            <div className="summary-list">
              {(actorMatrix.length > 0 ? actorMatrix : [{
                actor: "tenant / payer / operator / admin / system",
                responsibility: "candidate",
                authority: "not authorized for tenant billing mutation",
                supportState: "not_claimed",
                claimImpact: "Tenant Billing Ready blocked",
              }]).map((item, index) => (
                <div className="summary-row" key={`${item.actor}-${index}`}>
                  <span>{item.actor}</span>
                  <strong>{item.responsibility}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Readiness gates</h2><p>Evidence-bounded constraints</p></div></div>
          <div className="panel-body">
            <div className="summary-list">
              {readinessGates.map(gate => (
                <div className="summary-row" key={gate.label}>
                  <span>{gate.label}</span>
                  <strong>{gate.status}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Evidence and posture</h2>
        <p>Read-only evidence with deferred scope only.</p>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Evidence</h2><p>Source evidence and caveats</p></div></div>
          <div className="panel-body">
            <div className="summary-list">
              <Shared.SummaryRow label="Evidence" value={(data?.sourceEvidence ?? []).join(" • ") || "Unavailable"} />
              <Shared.SummaryRow label="Deferred scope" value={(data?.deferredScope ?? []).join(" • ") || "Unavailable"} />
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Claim discipline</h2><p>No readiness claims are upgraded here</p></div></div>
          <div className="panel-body">
            <div className="summary-list">
              <Shared.SummaryRow label="Tenant Billing Ready" value={data?.tenantBillingReady ? "YES" : "NO / not yet claimed"} tone={data?.tenantBillingReady ? "good" : "muted"} />
              <Shared.SummaryRow label="Tenant Administration Ready" value={data?.tenantAdministrationReady ? "YES" : "NO / not yet claimed"} tone={data?.tenantAdministrationReady ? "good" : "muted"} />
              <Shared.SummaryRow label="Billing Ready" value={data?.billingReady ? "YES" : "NO / not yet claimed"} tone={data?.billingReady ? "good" : "muted"} />
              <Shared.SummaryRow label="Payment Ready" value={data?.paymentReady ? "YES" : "NO / not yet claimed"} tone={data?.paymentReady ? "good" : "muted"} />
              <Shared.SummaryRow label="Invoice Ready" value={data?.invoiceReady ? "YES" : "NO / not yet claimed"} tone={data?.invoiceReady ? "good" : "muted"} />
              <Shared.SummaryRow label="Production Financial Operations" value={data?.productionFinancialOperationsReady ? "YES" : "NO / not yet claimed"} tone={data?.productionFinancialOperationsReady ? "good" : "muted"} />
            </div>
          </div>
        </section>
      </div>
    </div>
  </>;
}

export function SettlementReconciliationBoundaryView() {
  const { data, loadState, loadError, stale, refresh } = Shared.useOperationalSummary<Api.SettlementReconciliationBoundaryReport>(
    () => Api.productApi.getSettlementReconciliationBoundaryReport(),
    "Unable to load settlement and reconciliation boundary from Product API",
    () => false,
  );
  const operationalReceiptBoundary = data?.operationalReceiptBoundary;
  const legalTaxReceiptBoundary = data?.legalTaxReceiptBoundary;
  const settlementVisibility = data?.settlementVisibility;
  const reconciliationEvidence = data?.reconciliationEvidence;
  const providerAccountingDependencies = data?.providerAccountingDependencies;
  const readinessGates = data?.readinessGates ?? [];

  return <>
    <header className="domain-header">
      <div>
        <p className="eyebrow">RECEIPTS, SETTLEMENT & RECONCILIATION</p>
        <h1>Receipts, Settlement &amp; Reconciliation</h1>
        <p>Read-only evidence boundary for operational receipts, settlement visibility and reconciliation evidence. No legal receipt, settlement execution or accounting integration is allowed here.</p>
      </div>
      <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
    </header>
    <div className="guardrail-banner" role="note">
      <span>Inspection mode</span>
      <span>Sandbox only</span>
      <span>Read-only</span>
      <span>Product API is source of truth</span>
      <span>No receipt action / no settlement / no reconciliation job / no accounting integration</span>
    </div>
    {Shared.staleBanner({ stale, loadState, loadError }, "settlement and reconciliation boundary")}
    <Shared.CrossLinks links={[
      { to: "/economics", label: "Economics" },
      { to: "/system/billing-boundary", label: "Billing boundary" },
      { to: "/system/pricing-invoice-boundary", label: "Pricing & invoice boundary" },
      { to: "/system/payment-rails-boundary", label: "Payment rails boundary" },
      { to: "/system/tenant-billing-boundary", label: "Tenant billing boundary" },
    ]} />
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Claims</h2>
        <p>Receipt, settlement and reconciliation readiness remain explicitly not claimed.</p>
      </div>
      <div className="dashboard-grid execution-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Status</h2><p>Governed claims snapshot</p></div></div>
          <div className="panel-body">
            <div className="summary-list">
              <Shared.SummaryRow label="Receipt Ready" value={data?.receiptReady ? "YES" : "NO / not yet claimed"} tone={data?.receiptReady ? "good" : "muted"} />
              <Shared.SummaryRow label="Legal/Tax Receipt Ready" value={data?.legalTaxReceiptReady ? "YES" : "NO / not yet claimed"} tone={data?.legalTaxReceiptReady ? "good" : "muted"} />
              <Shared.SummaryRow label="Settlement Ready" value={data?.settlementReady ? "YES" : "NO / not yet claimed"} tone={data?.settlementReady ? "good" : "muted"} />
              <Shared.SummaryRow label="Reconciliation Ready" value={data?.reconciliationReady ? "YES" : "NO / not yet claimed"} tone={data?.reconciliationReady ? "good" : "muted"} />
              <Shared.SummaryRow label="Accounting Integration Ready" value={data?.accountingIntegrationReady ? "YES" : "NO / not yet claimed"} tone={data?.accountingIntegrationReady ? "good" : "muted"} />
              <Shared.SummaryRow label="Billing Ready" value={data?.billingReady ? "YES" : "NO / not yet claimed"} tone={data?.billingReady ? "good" : "muted"} />
              <Shared.SummaryRow label="Payment Ready" value={data?.paymentReady ? "YES" : "NO / not yet claimed"} tone={data?.paymentReady ? "good" : "muted"} />
              <Shared.SummaryRow label="Production Financial Operations" value={data?.productionFinancialOperationsReady ? "YES" : "NO / not yet claimed"} tone={data?.productionFinancialOperationsReady ? "good" : "muted"} />
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Operational receipt boundary</h2><p>Operational evidence only</p></div></div>
          <div className="panel-body">
            {operationalReceiptBoundary
              ? <div className="summary-list">
                <Shared.SummaryRow label="Receipt candidate id" value={operationalReceiptBoundary.receiptCandidateId} />
                <Shared.SummaryRow label="Receipt type" value={operationalReceiptBoundary.receiptType} />
                <Shared.SummaryRow label="Related invoice candidate" value={operationalReceiptBoundary.relatedInvoiceCandidate} />
                <Shared.SummaryRow label="Related quote candidate" value={operationalReceiptBoundary.relatedQuoteCandidate} />
                <Shared.SummaryRow label="Related billable event" value={operationalReceiptBoundary.relatedBillableEvent} />
                <Shared.SummaryRow label="Tenant/account context" value={operationalReceiptBoundary.relatedTenantAccountContext} />
                <Shared.SummaryRow label="Payer/operator context" value={operationalReceiptBoundary.relatedPayerOperatorContext} />
                <Shared.SummaryRow label="Artifact state" value={operationalReceiptBoundary.artifactState} />
                <Shared.SummaryRow label="Legal/tax classification" value={operationalReceiptBoundary.legalTaxClassificationState} />
              </div>
              : <Shared.PanelStateLine state={loadState} error={loadError} emptyMessage="No operational receipt boundary available." />}
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Receipt and settlement distinctions</h2>
        <p>Operational evidence is separated from legal receipt and financial settlement.</p>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Legal / tax receipt boundary</h2><p>Not claimed in this milestone</p></div></div>
          <div className="panel-body">
            {legalTaxReceiptBoundary
              ? <div className="summary-list">
                <Shared.SummaryRow label="Operational receipt" value={legalTaxReceiptBoundary.operationalReceipt} />
                <Shared.SummaryRow label="Payment acknowledgement" value={legalTaxReceiptBoundary.paymentAcknowledgement} />
                <Shared.SummaryRow label="Invoice artifact" value={legalTaxReceiptBoundary.invoiceArtifact} />
                <Shared.SummaryRow label="Tax/legal receipt" value={legalTaxReceiptBoundary.taxLegalReceipt} />
                <Shared.SummaryRow label="Accounting receipt" value={legalTaxReceiptBoundary.accountingReceipt} />
                <Shared.SummaryRow label="Settlement receipt" value={legalTaxReceiptBoundary.settlementReceipt} />
                <Shared.SummaryRow label="Legal/tax receipt readiness" value={legalTaxReceiptBoundary.legalTaxReceiptReadiness} />
                <Shared.SummaryRow label="Compliance readiness" value={legalTaxReceiptBoundary.complianceReadiness} />
                <Shared.SummaryRow label="Accounting integration" value={legalTaxReceiptBoundary.accountingIntegration} />
                <Shared.SummaryRow label="Jurisdiction decision" value={legalTaxReceiptBoundary.jurisdictionDecision} />
              </div>
              : <Shared.PanelStateLine state={loadState} error={loadError} emptyMessage="No legal/tax receipt distinction available." />}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Settlement visibility</h2><p>Provider-dependent evidence only</p></div></div>
          <div className="panel-body">
            {settlementVisibility
              ? <div className="summary-list">
                <Shared.SummaryRow label="Settlement candidate ID" value={settlementVisibility.settlementCandidateId} />
                <Shared.SummaryRow label="Related payment boundary" value={settlementVisibility.relatedPaymentBoundary} />
                <Shared.SummaryRow label="Provider dependency" value={settlementVisibility.providerDependency} />
                <Shared.SummaryRow label="Payment state dependency" value={settlementVisibility.paymentStateDependency} />
                <Shared.SummaryRow label="Settlement state" value={settlementVisibility.settlementState} />
                <Shared.SummaryRow label="Settlement source" value={settlementVisibility.settlementSource} />
                <Shared.SummaryRow label="Amount availability" value={settlementVisibility.amountAvailabilityState} />
                <Shared.SummaryRow label="Currency availability" value={settlementVisibility.currencyAvailabilityState} />
                <Shared.SummaryRow label="Settled at availability" value={settlementVisibility.settledAtAvailabilityState} />
              </div>
              : <Shared.PanelStateLine state={loadState} error={loadError} emptyMessage="No settlement visibility boundary available." />}
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Reconciliation and dependencies</h2>
        <p>No accounting-grade reconciliation is performed in S07.</p>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Reconciliation evidence</h2><p>Evidence-only matching posture</p></div></div>
          <div className="panel-body">
            {reconciliationEvidence
              ? <div className="summary-list">
                <Shared.SummaryRow label="Reconciliation candidate id" value={reconciliationEvidence.reconciliationCandidateId} />
                <Shared.SummaryRow label="Related receipt candidate" value={reconciliationEvidence.relatedReceiptCandidate} />
                <Shared.SummaryRow label="Related settlement candidate" value={reconciliationEvidence.relatedSettlementCandidate} />
                <Shared.SummaryRow label="Related invoice candidate" value={reconciliationEvidence.relatedInvoiceCandidate} />
                <Shared.SummaryRow label="Related tenant/account" value={reconciliationEvidence.relatedTenantAccount} />
                <Shared.SummaryRow label="Matching state" value={reconciliationEvidence.matchingState} />
                <Shared.SummaryRow label="Discrepancy state" value={reconciliationEvidence.discrepancyState} />
                <Shared.SummaryRow label="Accounting dependency" value={reconciliationEvidence.accountingDependency} />
                <Shared.SummaryRow label="Provider dependency" value={reconciliationEvidence.providerDependency} />
              </div>
              : <Shared.PanelStateLine state={loadState} error={loadError} emptyMessage="No reconciliation evidence boundary available." />}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Provider / accounting dependencies</h2><p>External systems remain unresolved</p></div></div>
          <div className="panel-body">
            {providerAccountingDependencies
              ? <div className="summary-list">
                <Shared.SummaryRow label="Payment provider dependency" value={providerAccountingDependencies.paymentProviderDependency} />
                <Shared.SummaryRow label="Accounting system dependency" value={providerAccountingDependencies.accountingSystemDependency} />
                <Shared.SummaryRow label="Ledger dependency" value={providerAccountingDependencies.ledgerDependency} />
                <Shared.SummaryRow label="Bank settlement dependency" value={providerAccountingDependencies.bankSettlementDependency} />
                <Shared.SummaryRow label="Jurisdiction/tax dependency" value={providerAccountingDependencies.jurisdictionTaxDependency} />
                <Shared.SummaryRow label="Data availability" value={providerAccountingDependencies.dataAvailability} />
                <Shared.SummaryRow label="Boundary state" value={providerAccountingDependencies.state} />
              </div>
              : <Shared.PanelStateLine state={loadState} error={loadError} emptyMessage="No provider/accounting dependency boundary available." />}
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Readiness gates and posture</h2>
        <p>Every readiness claim remains blocked by design in this milestone.</p>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Readiness gates</h2><p>Evidence-bounded constraints</p></div></div>
          <div className="panel-body">
            <div className="summary-list">
              {readinessGates.map(gate => (
                <div className="summary-row" key={gate.label}>
                  <span>{gate.label}</span>
                  <strong>{gate.status}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Claim discipline</h2><p>No readiness upgrade is allowed here</p></div></div>
          <div className="panel-body">
            <div className="summary-list">
              <Shared.SummaryRow label="Receipt Ready" value={data?.receiptReady ? "YES" : "NO / not yet claimed"} tone={data?.receiptReady ? "good" : "muted"} />
              <Shared.SummaryRow label="Legal/Tax Receipt Ready" value={data?.legalTaxReceiptReady ? "YES" : "NO / not yet claimed"} tone={data?.legalTaxReceiptReady ? "good" : "muted"} />
              <Shared.SummaryRow label="Settlement Ready" value={data?.settlementReady ? "YES" : "NO / not yet claimed"} tone={data?.settlementReady ? "good" : "muted"} />
              <Shared.SummaryRow label="Reconciliation Ready" value={data?.reconciliationReady ? "YES" : "NO / not yet claimed"} tone={data?.reconciliationReady ? "good" : "muted"} />
              <Shared.SummaryRow label="Accounting Integration Ready" value={data?.accountingIntegrationReady ? "YES" : "NO / not yet claimed"} tone={data?.accountingIntegrationReady ? "good" : "muted"} />
              <Shared.SummaryRow label="Reason" value={data?.claimDiscipline?.reason ?? "claim discipline remains blocked"} />
            </div>
          </div>
        </section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Evidence and deferred scope</h2>
        <p>No legal receipt, no real settlement and no accounting integration are introduced in S07.</p>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Source evidence</h2><p>Boundary inputs only</p></div></div>
          <div className="panel-body">
            <div className="summary-list">
              <Shared.SummaryRow label="Evidence" value={(data?.sourceEvidence ?? []).join(" • ") || "Unavailable"} />
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Deferred scope</h2><p>EPIC-14+ and future milestones</p></div></div>
          <div className="panel-body">
            <div className="summary-list">
              <Shared.SummaryRow label="Deferred scope" value={(data?.deferredScope ?? []).join(" • ") || "Unavailable"} />
              <Shared.SummaryRow label="Caveats" value={(data?.caveats ?? []).join(" • ") || "Unavailable"} />
            </div>
          </div>
        </section>
      </div>
    </div>
  </>;
}

export function FinancialAuditBoundaryView() {
  const state = Shared.useOperationalSummary<Api.FinancialAuditBoundaryReport>(
    () => Api.productApi.getFinancialAuditBoundaryReport(),
    "Unable to load financial audit boundary from Product API",
    () => false,
  );
  const data = state.data;
  const audit = data?.financialAuditTrailBoundary;
  return <>
    <header className="domain-header">
      <div><p className="eyebrow">FINANCIAL AUDIT, COMPLIANCE & RISK</p><h1>Financial Audit, Compliance &amp; Risk</h1><p>Read-only audit, compliance, tax and risk boundary. No certification or productive financial operation is claimed.</p></div>
      <button className="secondary" disabled={state.loadState === "loading" || state.loadState === "refreshing"} onClick={state.refresh}>{state.loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
    </header>
    <div className="guardrail-banner" role="note"><span>Inspection mode</span><span>Read-only</span><span>No audit certification</span><span>No compliance/tax readiness</span><span>No ledger or accounting integration</span></div>
    {Shared.staleBanner(state, "financial audit boundary")}
    <Shared.CrossLinks links={[{ to: "/system/settlement-reconciliation", label: "Receipts & reconciliation" }, { to: "/system/payment-rails-boundary", label: "Payment rails" }, { to: "/system/billing-boundary", label: "Billing boundary" }]} />
    <div className="flow-group">
      <div className="flow-group-head"><h2>Claims</h2><p>All claims remain NO / not yet claimed.</p></div>
      <div className="dashboard-grid execution-grid">
        <section className="panel"><div className="panel-head"><div><h2>Financial readiness</h2><p>No-claim snapshot</p></div></div><div className="panel-body"><div className="summary-list">
          <Shared.SummaryRow label="Financial Audit Ready" value={data?.financialAuditReady ? "YES" : "NO / not yet claimed"} tone="muted" />
          <Shared.SummaryRow label="Compliance Ready" value={data?.complianceReady ? "YES" : "NO / not yet claimed"} tone="muted" />
          <Shared.SummaryRow label="Tax Ready" value={data?.taxReady ? "YES" : "NO / not yet claimed"} tone="muted" />
          <Shared.SummaryRow label="Billing Ready" value={data?.billingReady ? "YES" : "NO / not yet claimed"} tone="muted" />
          <Shared.SummaryRow label="Payment Ready" value={data?.paymentReady ? "YES" : "NO / not yet claimed"} tone="muted" />
          <Shared.SummaryRow label="Production Financial Operations" value={data?.productionFinancialOperationsReady ? "YES" : "NO / not yet claimed"} tone="muted" />
        </div></div></section>
        <section className="panel"><div className="panel-head"><div><h2>Audit trail boundary</h2><p>Candidate correlation only</p></div></div><div className="panel-body">{audit ? <div className="summary-list">
          <Shared.SummaryRow label="Audit trail id" value={audit.auditTrailId} />
          <Shared.SummaryRow label="Scope" value={audit.auditTrailScope} />
          <Shared.SummaryRow label="Correlation state" value={audit.correlationState} />
          <Shared.SummaryRow label="Audit-grade state" value={audit.auditGradeState} />
          <Shared.SummaryRow label="Evidence completeness" value={audit.evidenceCompleteness} />
        </div> : <Shared.PanelStateLine state={state.loadState} error={state.loadError} emptyMessage="No audit boundary available." />}</div></section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head"><h2>Correlation and compliance</h2><p>Partial evidence and unresolved approvals remain visible.</p></div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel"><div className="panel-head"><div><h2>Evidence correlation matrix</h2><p>Missing dependencies are explicit</p></div></div><div className="panel-body"><div className="summary-list">{(data?.evidenceCorrelationMatrix ?? []).map((item, index) => <div className="summary-row" key={item.source + index}><span>{item.source}</span><strong>{item.correlationState} / {item.evidenceState}</strong></div>)}</div></div></section>
        <section className="panel"><div className="panel-head"><div><h2>Compliance boundary</h2><p>No compliance certification</p></div></div><div className="panel-body"><div className="summary-list">{(data?.complianceBoundary?.domains ?? []).map((item, index) => <div className="summary-row" key={item.complianceDomain + index}><span>{item.complianceDomain}</span><strong>{item.readinessState}</strong></div>)}</div></div></section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head"><h2>Tax/legal and risk</h2><p>No legal attestation, tax readiness or resolved-risk claim.</p></div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel"><div className="panel-head"><div><h2>Tax / legal boundary</h2><p>Explicitly not claimed</p></div></div><div className="panel-body"><div className="summary-list">
          <Shared.SummaryRow label="Legal invoice readiness" value={data?.taxLegalReadinessBoundary?.legalInvoiceReadiness ?? "NO / not yet claimed"} />
          <Shared.SummaryRow label="Tax invoice readiness" value={data?.taxLegalReadinessBoundary?.taxInvoiceReadiness ?? "NO / not yet claimed"} />
          <Shared.SummaryRow label="Legal receipt readiness" value={data?.taxLegalReadinessBoundary?.legalReceiptReadiness ?? "NO / not yet claimed"} />
          <Shared.SummaryRow label="Tax receipt readiness" value={data?.taxLegalReadinessBoundary?.taxReceiptReadiness ?? "NO / not yet claimed"} />
          <Shared.SummaryRow label="Jurisdiction decision" value={data?.taxLegalReadinessBoundary?.jurisdictionDecision ?? "required"} />
        </div></div></section>
        <section className="panel"><div className="panel-head"><div><h2>Financial risk register</h2><p>Risk visibility is not resolution</p></div></div><div className="panel-body"><div className="summary-list">{(data?.financialRiskRegister ?? []).map(risk => <div className="summary-row" key={risk.riskId}><span>{risk.riskId} · {risk.riskCategory}</span><strong>{risk.severity} / {risk.mitigationState}</strong></div>)}</div></div></section>
      </div>
    </div>
    <div className="flow-group">
      <div className="flow-group-head"><h2>No-claim discipline and gates</h2><p>Every financial readiness claim stays false.</p></div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel"><div className="panel-head"><div><h2>No-claim discipline</h2><p>Consolidated claims</p></div></div><div className="panel-body"><div className="summary-list">{(data?.noClaimDiscipline?.claims ?? []).map((claim, index) => <div className="summary-row" key={claim.claimName + index}><span>{claim.claimName}</span><strong>{claim.claimStatus}</strong></div>)}</div></div></section>
        <section className="panel"><div className="panel-head"><div><h2>Readiness gates</h2><p>Audit/compliance/risk blockers</p></div></div><div className="panel-body"><div className="summary-list">{(data?.readinessGates ?? []).map(gate => <div className="summary-row" key={gate.id}><span>{gate.label}</span><strong>{gate.status}</strong></div>)}</div></div></section>
      </div>
    </div>
  </>;
}

const BILLING_OPERATOR_REVIEW_STEPS = [
  {
    step: "01",
    title: "Financial Truth / Billing Boundary",
    route: "/system/billing-boundary",
    review: "Review financial truth source candidates, billing intent and billable event candidates.",
    blockedClaim: "Billing Ready: NO / not yet claimed",
    caveat: "No billing mutation, invoice, payment or money movement is available.",
    deferred: "Authoritative financial truth and billing-grade computation remain deferred.",
  },
  {
    step: "02",
    title: "Pricing / Quote / Invoice Boundary",
    route: "/system/pricing-invoice-boundary",
    review: "Review pricing source dependencies, quote candidates and invoice artifact caveats.",
    blockedClaim: "Pricing Ready / Invoice Ready: NO / not yet claimed",
    caveat: "Quote and invoice candidates are not charges, tax invoices or payment requests.",
    deferred: "Pricing engine, legal/tax invoice issuance and billing-grade amounts remain deferred.",
  },
  {
    step: "03",
    title: "Payment Rails Boundary",
    route: "/system/payment-rails-boundary",
    review: "Review provider boundary, authorization vs capture states and no-money-movement guardrails.",
    blockedClaim: "Payment Ready: NO / not yet claimed",
    caveat: "No provider integration, authorization, capture, refund or chargeback action is exposed.",
    deferred: "Provider setup, credentials, settlement and payment operations remain deferred.",
  },
  {
    step: "04",
    title: "Tenant Billing Responsibility",
    route: "/system/tenant-billing-boundary",
    review: "Review tenant account responsibility, payer/operator boundaries and account ownership caveats.",
    blockedClaim: "Tenant Billing Ready: NO / not yet claimed",
    caveat: "Payer candidates are not verified payment authority and no tenant billing action exists.",
    deferred: "Tenant billing operations, payment methods and customer account mutation remain deferred.",
  },
  {
    step: "05",
    title: "Receipts / Settlement / Reconciliation",
    route: "/system/settlement-reconciliation",
    review: "Review operational receipt evidence, settlement visibility and reconciliation evidence boundaries.",
    blockedClaim: "Receipt / Settlement / Reconciliation Ready: NO / not yet claimed",
    caveat: "Operational receipt evidence is not legal receipt, bank settlement or accounting reconciliation.",
    deferred: "Legal receipts, settlement sync, ledger and reconciliation jobs remain deferred.",
  },
  {
    step: "06",
    title: "Financial Audit / Compliance / Risk",
    route: "/system/financial-audit",
    review: "Review audit trail boundary, evidence correlation, compliance caveats and risk register.",
    blockedClaim: "Financial Audit / Compliance / Tax Ready: NO / not yet claimed",
    caveat: "Evidence correlation is not audit certification, legal attestation or tax readiness.",
    deferred: "Audit certification, compliance certification, legal/tax readiness and provider compliance remain deferred.",
  },
] as const;

const BILLING_OPERATOR_CLAIMS = [
  "Billing UX Accepted",
  "Operator Acceptance Ready",
  "Browser Acceptance Ready",
  "Billing Ready",
  "Payment Ready",
  "Invoice Ready",
  "Tenant Billing Ready",
  "Receipt Ready",
  "Settlement Ready",
  "Reconciliation Ready",
  "Financial Audit Ready",
  "Compliance Ready",
  "Tax Ready",
  "Production Financial Operations",
] as const;

const BILLING_STATE_TAXONOMY = [
  ["candidate", "Candidate boundary evidence only; not ready."],
  ["planned", "Planned future work; not available for operation."],
  ["partial", "Partial evidence exists; blockers remain visible."],
  ["unavailable", "Expected data is not available from Product API."],
  ["unsupported", "Capability is outside current supported scope."],
  ["deferred", "Explicitly postponed to S10/S11 or EPIC-14+."],
  ["blocked", "Readiness is blocked by missing gates or evidence."],
  ["not_started", "No implementation or approval has begun."],
  ["unknown", "State cannot be trusted as readiness."],
  ["evidence_only", "Operational evidence only; not certified."],
  ["not_claimed", "No readiness claim is made."],
] as const;

export function BillingUxAcceptanceView() {
  return <>
    <header className="domain-header">
      <div>
        <p className="eyebrow">BILLING UX &amp; OPERATOR ACCEPTANCE</p>
        <h1>Billing UX &amp; Operator Acceptance</h1>
        <p>Read-only operator review baseline for EPIC-13 financial boundaries. Acceptance summary is not production readiness and does not authorize financial actions.</p>
      </div>
      <Router.Link className="detail-link" to="/system/billing-boundary">Start review →</Router.Link>
    </header>
    <div className="guardrail-banner" role="note">
      <span>Product API is source of truth</span>
      <span>Read-only review flow</span>
      <span>No financial actions</span>
      <span>No browser certification claim</span>
      <span>Formal S03-S06 sequencing caveat retained</span>
    </div>
    <Shared.CrossLinks links={BILLING_OPERATOR_REVIEW_STEPS.map(step => ({ to: step.route, label: step.title }))} />

    <div className="flow-group billing-acceptance-flow">
      <div className="flow-group-head">
        <h2>Operator review flow</h2>
        <p>Review boundaries in this order. This is not an approval flow and does not promote any claim.</p>
      </div>
      <div className="dashboard-grid evidence-grid">
        {BILLING_OPERATOR_REVIEW_STEPS.map(step => <section className="panel blocked-panel" key={step.step}>
          <div className="panel-head"><div><h2>{step.step}. {step.title}</h2><p>{step.blockedClaim}</p></div><Shared.Badge tone="muted">review</Shared.Badge></div>
          <div className="panel-body">
            <div className="summary-list">
              <Shared.SummaryRow label="What to review" value={step.review} />
              <Shared.SummaryRow label="Caveat" value={step.caveat} />
              <Shared.SummaryRow label="Deferred" value={step.deferred} />
            </div>
            <Router.Link className="surface-link" to={step.route}>Open boundary →</Router.Link>
          </div>
        </section>)}
      </div>
    </div>

    <div className="flow-group">
      <div className="flow-group-head">
        <h2>Claim display consistency</h2>
        <p>Every readiness or acceptance claim remains NO / not yet claimed.</p>
      </div>
      <div className="dashboard-grid execution-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Acceptance claims</h2><p>Baseline only</p></div></div>
          <div className="panel-body"><div className="summary-list">
            {BILLING_OPERATOR_CLAIMS.map(claim => <Shared.SummaryRow key={claim} label={claim} value="NO / not yet claimed" tone="muted" />)}
          </div></div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>State taxonomy</h2><p>Non-ready states are explicit</p></div></div>
          <div className="panel-body"><div className="summary-list">
            {BILLING_STATE_TAXONOMY.map(([state, meaning]) => <Shared.SummaryRow key={state} label={state} value={meaning} tone={state === "blocked" ? "warn" : "muted"} />)}
          </div></div>
        </section>
        <section className="panel unsupported-panel">
          <div className="panel-head"><div><h2>Non-ideal states</h2><p>Loading, error, empty and stale handling</p></div></div>
          <div className="panel-body"><div className="summary-list">
            <Shared.SummaryRow label="Loading" value="Show Product API loading without implying readiness." />
            <Shared.SummaryRow label="Error / endpoint missing" value="Show Product API unavailable and preserve no-claim posture." />
            <Shared.SummaryRow label="Empty / partial data" value="Show unavailable or partial evidence, blockers and caveats." />
            <Shared.SummaryRow label="Stale" value="Show stale banner and keep claims not_claimed." />
          </div></div>
        </section>
      </div>
    </div>

    <div className="flow-group">
      <div className="flow-group-head">
        <h2>No-action financial guardrails</h2>
        <p>Only inspect, review and navigate actions are allowed in S09.</p>
      </div>
      <div className="dashboard-grid evidence-grid">
        <section className="panel blocked-panel">
          <div className="panel-head"><div><h2>Prohibited productive actions</h2><p>Not present in this acceptance surface</p></div></div>
          <div className="panel-body"><div className="summary-list">
            <Shared.SummaryRow label="Billing / invoice / payment" value="No tenant charge, invoice issue, payment authorization or capture." />
            <Shared.SummaryRow label="Refund / dispute / settlement" value="No refund, chargeback, settlement or reconciliation execution." />
            <Shared.SummaryRow label="Legal / tax / accounting" value="No legal receipt, tax invoice, provider setup or accounting connection." />
          </div></div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Manual/browser baseline</h2><p>Documented acceptance only</p></div></div>
          <div className="panel-body"><div className="summary-list">
            <Shared.SummaryRow label="Checklist" value="docs/epics/epic-13/browser-acceptance.md" />
            <Shared.SummaryRow label="Browser real execution" value="NOT EXECUTED / pending S10 unless run separately" tone="warn" />
            <Shared.SummaryRow label="Allowed operator actions" value="Open boundary, inspect evidence, review caveats, read documentation." />
          </div></div>
        </section>
      </div>
    </div>
  </>;
}
