import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

type Severity = 'error' | 'warning'

interface Finding {
  readonly code: string
  readonly severity: Severity
  readonly domain: string
  readonly message: string
}

interface DashboardSummary {
  readonly readiness: {
    readonly state: string
    readonly blockerCount: number
    readonly warningCount: number
    readonly checkedAt: number
  }
  readonly runtime: { readonly connectivity: string }
  readonly composition: {
    readonly authMode: string
    readonly secretBackend: string
    readonly persistenceBackend: string
    readonly settlementBackend: string
    readonly observabilityExporterEnabled: boolean
    readonly remoteWorkerSupported: boolean
    readonly liveDeploymentEnabled: boolean
    readonly rateLimitEnabled: boolean
  }
  readonly historicalBlockerScan: { readonly count: number; readonly matches: readonly string[] }
  readonly criticalBlockers: readonly Finding[]
  readonly operationalCaveats: readonly Finding[]
}

interface QuoteView {
  readonly quoteId: string
  readonly amount?: string
  readonly unit?: string
  readonly expiresAt?: number
  readonly agentId?: string
  readonly deploymentPlanId?: string
  readonly evidenceRefs?: readonly string[]
}

interface AuthorizationView {
  readonly decisionId: string
  readonly economicOperationId: string
  readonly authorizationEffect: 'allowed' | 'denied'
  readonly decisionCode: string
  readonly reasons: readonly string[]
  readonly governanceReferences: readonly string[]
  readonly entitlementReferences: readonly string[]
  readonly limitReferences: readonly string[]
  readonly requestedAmount?: string
  readonly effectiveAmount?: string
  readonly unit?: string
  readonly quoteId?: string
  readonly reservationId?: string
  readonly executionRunId?: string
  readonly workloadId?: string
  readonly idempotencyKey: string
  readonly auditCorrelation: string
  readonly createdAt: number
  readonly evaluatedAt: number
}

interface ReservationView {
  readonly reservationId: string
  readonly quoteId: string
  readonly amount?: string
  readonly unit?: string
  readonly status: string
  readonly expiresAt: number
  readonly failureReason?: string
  readonly evidenceRefs?: readonly string[]
  readonly createdAt: number
  readonly updatedAt?: number
  readonly releasedAt?: number
  readonly executionRunId?: string
  readonly agentId?: string
  readonly authorizationDecisionId?: string
  readonly decisionCode?: string
  readonly decisionReason?: string
}

interface UsageView {
  readonly usageId: string
  readonly executionRunId: string
  readonly runtimeId?: string
  readonly agentId?: string
  readonly deploymentId?: string
  readonly tenantId?: string
  readonly authorizationDecisionId?: string
  readonly reservationId?: string
  readonly settlementId?: string
  readonly quoteId?: string
  readonly measurementSource: string
  readonly dimension: string
  readonly quantity: string
  readonly unit: string
  readonly observedAt: number
  readonly recordedAt: number
  readonly measurementState: string
  readonly settlementState: string
  readonly status: string
  readonly pricingState: string
  readonly pricingProvenance?: string
  readonly evidenceRefs?: readonly string[]
}

interface SettlementView {
  readonly settlementId: string
  readonly executionRunId?: string
  readonly meterId?: string
  readonly amount: string
  readonly unit: string
  readonly status: string
  readonly failureReason?: string
  readonly receiptId?: string
  readonly createdAt: number
  readonly completedAt?: number
  readonly evidenceRefs?: readonly string[]
}

interface ReceiptView {
  readonly receiptId: string
  readonly settlementId?: string
  readonly executionRunId?: string
  readonly amount: string
  readonly unit: string
  readonly status: string
  readonly issuedAt: number
  readonly summary: string
  readonly evidenceRefs?: readonly string[]
}

function apiUrl(path: string) {
  const base = (import.meta.env.VITE_ACS_API_BASE_URL ?? '').replace(/\/+$/, '')
  return base ? base + path : path
}

function bearerToken() {
  return (window as Window & { __ACS_AUTH__?: { readonly accessToken?: string } }).__ACS_AUTH__?.accessToken
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const token = bearerToken()
  const response = await fetch(apiUrl(path), {
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: 'Bearer ' + token } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  })
  const payload = await response.json() as { readonly data?: T; readonly error?: { readonly message?: string; readonly code?: string } }
  if (!response.ok) throw new Error(payload.error?.message ?? payload.error?.code ?? 'Request failed (' + response.status + ')')
  return payload.data as T
}

function formatTime(value?: number) {
  return value ? new Date(value).toLocaleString() : '—'
}

function formatValue(value: unknown) {
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—'
  return value === undefined || value === null || value === '' ? '—' : String(value)
}

function FindingCard({ finding }: { finding: Finding }) {
  return <article className={'admin-card blocker ' + finding.severity} data-severity={finding.severity}>
    <div className='admin-card__head'>
      <div><h3>{finding.domain.replaceAll('-', ' ')}</h3><p className='admin-mono'>{finding.code}</p></div>
      <strong className={'severity-' + finding.severity}>{finding.severity.toUpperCase()}</strong>
    </div>
    <p>{finding.message}</p>
  </article>
}

function Panel({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return <section className='admin-panel'>
    <div className='admin-panel__head'><h3>{title}</h3>{actions}</div>
    {children}
  </section>
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return <div className='admin-empty'><strong className='severity-ready'>{title}</strong><p>{message}</p></div>
}

function ErrorState({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return <div className='admin-state admin-state-error' role='alert'>
    <strong>Dashboard unavailable</strong>
    <p>{error}</p>
    {onRetry && <div className='admin-form__actions'><button type='button' className='button ghost' onClick={onRetry}>Retry</button></div>}
  </div>
}

function EconomicOperationsPanel() {
  const [quotes, setQuotes] = useState<readonly QuoteView[]>([])
  const [authorizations, setAuthorizations] = useState<readonly AuthorizationView[]>([])
  const [reservations, setReservations] = useState<readonly ReservationView[]>([])
  const [usageRecords, setUsageRecords] = useState<readonly UsageView[]>([])
  const [settlements, setSettlements] = useState<readonly SettlementView[]>([])
  const [receipts, setReceipts] = useState<readonly ReceiptView[]>([])
  const [quoteError, setQuoteError] = useState('')
  const [authorizationError, setAuthorizationError] = useState('')
  const [reservationError, setReservationError] = useState('')
  const [usageError, setUsageError] = useState('')
  const [settlementError, setSettlementError] = useState('')
  const [receiptError, setReceiptError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyAction, setBusyAction] = useState<'authorize' | 'reserve' | 'release' | ''>('')
  const [statusMessage, setStatusMessage] = useState('')
  const [lastResult, setLastResult] = useState<unknown>(null)
  const [quoteId, setQuoteId] = useState('')
  const [economicOperationId, setEconomicOperationId] = useState(() => 'econ-' + crypto.randomUUID().slice(0, 8))
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => crypto.randomUUID())
  const [decisionId, setDecisionId] = useState('')
  const [reservationId, setReservationId] = useState('')
  const [requestedAmount, setRequestedAmount] = useState('')
  const [unit, setUnit] = useState('neurons')
  const [entitlementKey, setEntitlementKey] = useState('')
  const [limitKey, setLimitKey] = useState('')
  const [usage, setUsage] = useState('')
  const [releaseReason, setReleaseReason] = useState('operator_release')

  const selectedQuote = useMemo(() => quotes.find(quote => quote.quoteId === quoteId) ?? quotes[0] ?? null, [quotes, quoteId])
  const selectedReservation = useMemo(() => reservations.find(item => item.reservationId === reservationId) ?? reservations[0] ?? null, [reservations, reservationId])

  const loadEconomics = useCallback(async () => {
    setLoading(true)
    setQuoteError('')
    setAuthorizationError('')
    setReservationError('')
    setUsageError('')
    setSettlementError('')
    setReceiptError('')
    try {
      const [quoteResult, authorizationResult, reservationResult, usageResult, settlementResult, receiptResult] = await Promise.allSettled([
        requestJson<readonly QuoteView[]>('/api/v1/economics/quotes?limit=8'),
        requestJson<readonly AuthorizationView[]>('/api/v1/economics/authorizations?limit=8'),
        requestJson<readonly ReservationView[]>('/api/v1/economics/reservations?limit=8'),
        requestJson<readonly UsageView[]>('/api/v1/economics/usage?limit=8'),
        requestJson<readonly SettlementView[]>('/api/v1/economics/settlements?limit=8'),
        requestJson<readonly ReceiptView[]>('/api/v1/economics/receipts?limit=8'),
      ])
      if (quoteResult.status === 'fulfilled') {
        setQuotes(quoteResult.value)
        setQuoteId(prev => prev || quoteResult.value[0]?.quoteId || '')
      } else {
        setQuoteError(quoteResult.reason instanceof Error ? quoteResult.reason.message : String(quoteResult.reason))
      }
      if (authorizationResult.status === 'fulfilled') {
        setAuthorizations(authorizationResult.value)
        setDecisionId(prev => prev || authorizationResult.value[0]?.decisionId || '')
      } else {
        setAuthorizationError(authorizationResult.reason instanceof Error ? authorizationResult.reason.message : String(authorizationResult.reason))
      }
      if (reservationResult.status === 'fulfilled') {
        setReservations(reservationResult.value)
        setReservationId(prev => prev || reservationResult.value[0]?.reservationId || '')
      } else {
        setReservationError(reservationResult.reason instanceof Error ? reservationResult.reason.message : String(reservationResult.reason))
      }
      if (usageResult?.status === 'fulfilled') {
        setUsageRecords(usageResult.value)
      } else if (usageResult) {
        setUsageError(usageResult.reason instanceof Error ? usageResult.reason.message : String(usageResult.reason))
      }
      if (settlementResult?.status === 'fulfilled') {
        setSettlements(settlementResult.value)
      } else if (settlementResult) {
        setSettlementError(settlementResult.reason instanceof Error ? settlementResult.reason.message : String(settlementResult.reason))
      }
      if (receiptResult?.status === 'fulfilled') {
        setReceipts(receiptResult.value)
      } else if (receiptResult) {
        setReceiptError(receiptResult.reason instanceof Error ? receiptResult.reason.message : String(receiptResult.reason))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadEconomics()
  }, [loadEconomics])

  useEffect(() => {
    if (!requestedAmount && selectedQuote?.amount) setRequestedAmount(selectedQuote.amount)
    if ((!unit || unit === 'neurons') && selectedQuote?.unit) setUnit(selectedQuote.unit)
  }, [requestedAmount, selectedQuote, unit])

  async function postMutation(action: 'authorize' | 'reserve' | 'release') {
    setBusyAction(action)
    setStatusMessage('')
    try {
      if (action === 'authorize') {
        if (!economicOperationId.trim()) throw new Error('economicOperationId is required')
        const body: Record<string, unknown> = {
          economicOperationId: economicOperationId.trim(),
          idempotencyKey: idempotencyKey.trim() || crypto.randomUUID(),
          quoteId: selectedQuote?.quoteId,
          unit: unit.trim() || undefined,
          entitlementKey: entitlementKey.trim() || undefined,
          limitKey: limitKey.trim() || undefined,
          executionRunId: selectedQuote?.agentId ? 'run-' + selectedQuote.agentId : undefined,
          workloadId: selectedQuote?.deploymentPlanId,
        }
        if (requestedAmount.trim()) body.requestedAmount = requestedAmount.trim()
        if (usage.trim()) body.usage = Number(usage)
        const data = await requestJson<AuthorizationView>('/api/v1/economics/authorizations', {
          method: 'POST',
          body: JSON.stringify(body),
        })
        setDecisionId(data.decisionId)
        setLastResult(data)
        setStatusMessage('Authorization ' + data.authorizationEffect + ' (' + data.decisionCode + ')')
        await loadEconomics()
        return
      }

      if (action === 'reserve') {
        if (!selectedQuote?.quoteId) throw new Error('quoteId is required')
        if (!decisionId.trim()) throw new Error('authorizationDecisionId is required')
        const data = await requestJson<ReservationView>('/api/v1/economics/reservations', {
          method: 'POST',
          body: JSON.stringify({
            reservationId: reservationId.trim() || undefined,
            economicOperationId: economicOperationId.trim(),
            quoteId: selectedQuote.quoteId,
            authorizationDecisionId: decisionId.trim(),
            idempotencyKey: idempotencyKey.trim() || crypto.randomUUID(),
            requestedAmount: requestedAmount.trim() || undefined,
            unit: unit.trim() || undefined,
            entitlementKey: entitlementKey.trim() || undefined,
            limitKey: limitKey.trim() || undefined,
            usage: usage.trim() ? Number(usage) : undefined,
            executionRunId: selectedQuote.agentId ? 'run-' + selectedQuote.agentId : undefined,
            workloadId: selectedQuote.deploymentPlanId,
          }),
        })
        setReservationId(data.reservationId)
        setLastResult(data)
        setStatusMessage('Reservation ' + data.status)
        await loadEconomics()
        return
      }

      if (!selectedReservation?.reservationId) throw new Error('reservationId is required')
      const data = await requestJson<ReservationView>('/api/v1/economics/reservations/' + encodeURIComponent(selectedReservation.reservationId) + '/release', {
        method: 'POST',
        body: JSON.stringify({
          reason: releaseReason.trim() || 'operator_release',
          idempotencyKey: idempotencyKey.trim() || crypto.randomUUID(),
        }),
      })
      setLastResult(data)
      setStatusMessage('Reservation ' + data.status)
      await loadEconomics()
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setBusyAction('')
    }
  }

  return <div className='admin-stack'>
    <Panel title='Economic operation control' actions={<button type='button' className='button ghost' onClick={() => void loadEconomics()}>Refresh economics</button>}>
      <form className='admin-form' onSubmit={event => { event.preventDefault(); void postMutation('authorize') }}>
        <label><span>Quote</span><select value={quoteId} onChange={event => setQuoteId(event.target.value)}>{quotes.length ? quotes.map(quote => <option key={quote.quoteId} value={quote.quoteId}>{quote.quoteId}</option>) : <option value=''>No quotes available</option>}</select></label>
        <label><span>Economic operation id</span><input value={economicOperationId} onChange={event => setEconomicOperationId(event.target.value)} /></label>
        <label><span>Idempotency key</span><input value={idempotencyKey} onChange={event => setIdempotencyKey(event.target.value)} /></label>
        <label><span>Requested amount</span><input value={requestedAmount} onChange={event => setRequestedAmount(event.target.value)} placeholder='quote derived or explicit amount' /></label>
        <label><span>Unit</span><input value={unit} onChange={event => setUnit(event.target.value)} placeholder='neurons' /></label>
        <label><span>Entitlement key</span><input value={entitlementKey} onChange={event => setEntitlementKey(event.target.value)} placeholder='optional' /></label>
        <label><span>Limit key</span><input value={limitKey} onChange={event => setLimitKey(event.target.value)} placeholder='optional' /></label>
        <label><span>Usage</span><input type='number' value={usage} onChange={event => setUsage(event.target.value)} placeholder='optional' /></label>
        <div className='admin-form__actions'>
          <button className='button' type='submit' disabled={busyAction === 'authorize'}>Authorize</button>
          <button className='button' type='button' disabled={busyAction === 'reserve' || !selectedQuote || !decisionId.trim()} onClick={() => void postMutation('reserve')}>Reserve</button>
          <button className='button ghost' type='button' disabled={busyAction === 'release' || !selectedReservation} onClick={() => void postMutation('release')}>Release</button>
        </div>
      </form>
      <dl className='admin-grid-2'>
        <div><dt>Selected quote</dt><dd>{selectedQuote?.quoteId ?? 'No quote selected'}</dd></div>
        <div><dt>Selected decision</dt><dd>{decisionId || 'No authorization yet'}</dd></div>
        <div><dt>Selected reservation</dt><dd>{(selectedReservation?.reservationId ?? reservationId) || 'No reservation selected'}</dd></div>
        <div><dt>Latest status</dt><dd>{statusMessage || 'Idle'}</dd></div>
      </dl>
      {lastResult ? <pre className='admin-pre'>{JSON.stringify(lastResult, null, 2)}</pre> : null}
    </Panel>

    <div className='admin-grid'>
      <Panel title='Quotes' actions={<span className='admin-mono'>{quoteError ? 'UNAVAILABLE' : quotes.length ? String(quotes.length) + ' items' : 'EMPTY'}</span>}>
        {quoteError ? <ErrorState error={quoteError} onRetry={() => void loadEconomics()} /> : quotes.length ? <div className='admin-cards'>{quotes.map(quote => <article key={quote.quoteId} className='admin-card'>
          <div className='admin-card__head'><div><h3>{quote.quoteId}</h3><p className='admin-mono'>{formatValue(quote.agentId ?? quote.deploymentPlanId)}</p></div><span className='pill'>{formatValue(quote.amount)} {formatValue(quote.unit)}</span></div>
          <dl className='admin-grid-2'>
            <div><dt>Expires</dt><dd>{formatTime(quote.expiresAt)}</dd></div>
            <div><dt>Evidence</dt><dd>{formatValue(quote.evidenceRefs)}</dd></div>
          </dl>
        </article>)}</div> : <EmptyState title='No quotes available' message='The browser can still certify truthful empty-state behavior.' />}
      </Panel>

      <Panel title='Authorizations' actions={<span className='admin-mono'>{authorizationError ? 'UNAVAILABLE' : authorizations.length ? String(authorizations.length) + ' items' : 'EMPTY'}</span>}>
        {authorizationError ? <ErrorState error={authorizationError} onRetry={() => void loadEconomics()} /> : authorizations.length ? <div className='admin-cards'>{authorizations.map(item => <article key={item.decisionId} className='admin-card'>
          <div className='admin-card__head'><div><h3>{item.decisionId}</h3><p className='admin-mono'>{item.economicOperationId}</p></div><strong className={item.authorizationEffect === 'allowed' ? 'severity-ready' : 'severity-error'}>{item.authorizationEffect.toUpperCase()}</strong></div>
          <dl className='admin-grid-2'>
            <div><dt>Decision</dt><dd>{item.decisionCode}</dd></div>
            <div><dt>Quote</dt><dd>{item.quoteId ?? '—'}</dd></div>
            <div><dt>Requested</dt><dd>{formatValue(item.requestedAmount)} {formatValue(item.unit)}</dd></div>
            <div><dt>Effective</dt><dd>{formatValue(item.effectiveAmount)} {formatValue(item.unit)}</dd></div>
            <div><dt>Reasons</dt><dd>{formatValue(item.reasons)}</dd></div>
            <div><dt>Evidence</dt><dd>{formatValue([
              ...item.governanceReferences,
              ...item.entitlementReferences,
              ...item.limitReferences,
            ])}</dd></div>
          </dl>
          <div className='admin-card__foot'><span>Evaluated {formatTime(item.evaluatedAt)}</span><span className='admin-mono'>{item.auditCorrelation}</span></div>
        </article>)}</div> : <EmptyState title='No authorizations yet' message='Authorization decisions appear here once the operator submits a request.' />}
      </Panel>

      <Panel title='Reservations' actions={<span className='admin-mono'>{reservationError ? 'UNAVAILABLE' : reservations.length ? String(reservations.length) + ' items' : 'EMPTY'}</span>}>
        {reservationError ? <ErrorState error={reservationError} onRetry={() => void loadEconomics()} /> : reservations.length ? <div className='admin-cards'>{reservations.map(item => <article key={item.reservationId} className='admin-card'>
          <div className='admin-card__head'><div><h3>{item.reservationId}</h3><p className='admin-mono'>{item.quoteId}</p></div><strong className={item.status === 'reserved' ? 'severity-ready' : item.status === 'released' ? 'severity-warning' : 'severity-ready'}>{item.status.toUpperCase()}</strong></div>
          <dl className='admin-grid-2'>
            <div><dt>Amount</dt><dd>{formatValue(item.amount)} {formatValue(item.unit)}</dd></div>
            <div><dt>Expires</dt><dd>{formatTime(item.expiresAt)}</dd></div>
            <div><dt>Decision</dt><dd>{item.authorizationDecisionId ?? '—'}</dd></div>
            <div><dt>Evidence</dt><dd>{formatValue(item.evidenceRefs)}</dd></div>
            <div><dt>Updated</dt><dd>{formatTime(item.updatedAt)}</dd></div>
            <div><dt>Reason</dt><dd>{item.failureReason ?? item.decisionReason ?? '—'}</dd></div>
          </dl>
          <div className='admin-card__foot'><span>Created {formatTime(item.createdAt)}</span><button type='button' className='button ghost' onClick={() => { setReservationId(item.reservationId); setStatusMessage('Selected reservation ' + item.reservationId) }}>Inspect</button></div>
        </article>)}</div> : <EmptyState title='No reservations yet' message='Reservations appear only after a governed authorization succeeds.' />}
      </Panel>

      <Panel title='Usage' actions={<span className='admin-mono'>{usageError ? 'UNAVAILABLE' : usageRecords.length ? String(usageRecords.length) + ' items' : 'EMPTY'}</span>}>
        {usageError ? <ErrorState error={usageError} onRetry={() => void loadEconomics()} /> : usageRecords.length ? <div className='admin-cards'>{usageRecords.map(item => <article key={item.usageId} className='admin-card'>
          <div className='admin-card__head'><div><h3>{item.usageId}</h3><p className='admin-mono'>{item.executionRunId}</p></div><strong className={item.status === 'settled' ? 'severity-ready' : item.status === 'rejected' ? 'severity-error' : 'severity-warning'}>{item.status.toUpperCase()}</strong></div>
          <dl className='admin-grid-2'>
            <div><dt>Dimension</dt><dd>{item.dimension}</dd></div>
            <div><dt>Quantity</dt><dd>{item.quantity} {item.unit}</dd></div>
            <div><dt>Measurement</dt><dd>{item.measurementState}</dd></div>
            <div><dt>Settlement</dt><dd>{item.settlementState}</dd></div>
            <div><dt>Pricing</dt><dd>{item.pricingState}{item.pricingProvenance ? ' · ' + item.pricingProvenance : ''}</dd></div>
            <div><dt>Evidence</dt><dd>{formatValue(item.evidenceRefs)}</dd></div>
          </dl>
          <div className='admin-card__foot'><span>Observed {formatTime(item.observedAt)}</span><span className='admin-mono'>{item.tenantId ?? 'tenant-unknown'}</span></div>
        </article>)}</div> : <EmptyState title='No usage recorded' message='The operator surface shows truthful emptiness until usage is recorded by execution.' />}
      </Panel>

      <Panel title='Settlements' actions={<span className='admin-mono'>{settlementError ? 'UNAVAILABLE' : settlements.length ? String(settlements.length) + ' items' : 'EMPTY'}</span>}>
        {settlementError ? <ErrorState error={settlementError} onRetry={() => void loadEconomics()} /> : settlements.length ? <div className='admin-cards'>{settlements.map(item => <article key={item.settlementId} className='admin-card'>
          <div className='admin-card__head'><div><h3>{item.settlementId}</h3><p className='admin-mono'>{item.executionRunId ?? item.meterId ?? '—'}</p></div><strong className={item.status === 'settled' ? 'severity-ready' : item.status === 'failed' ? 'severity-error' : 'severity-warning'}>{item.status.toUpperCase()}</strong></div>
          <dl className='admin-grid-2'>
            <div><dt>Amount</dt><dd>{item.amount} {item.unit}</dd></div>
            <div><dt>Receipt</dt><dd>{item.receiptId ?? '—'}</dd></div>
            <div><dt>Completed</dt><dd>{formatTime(item.completedAt)}</dd></div>
            <div><dt>Evidence</dt><dd>{formatValue(item.evidenceRefs)}</dd></div>
            <div><dt>Failure</dt><dd>{item.failureReason ?? '—'}</dd></div>
            <div><dt>Created</dt><dd>{formatTime(item.createdAt)}</dd></div>
          </dl>
        </article>)}</div> : <EmptyState title='No settlements yet' message='Settlement history appears only after governed economic completion.' />}
      </Panel>

      <Panel title='Receipts' actions={<span className='admin-mono'>{receiptError ? 'UNAVAILABLE' : receipts.length ? String(receipts.length) + ' items' : 'EMPTY'}</span>}>
        {receiptError ? <ErrorState error={receiptError} onRetry={() => void loadEconomics()} /> : receipts.length ? <div className='admin-cards'>{receipts.map(item => <article key={item.receiptId} className='admin-card'>
          <div className='admin-card__head'><div><h3>{item.receiptId}</h3><p className='admin-mono'>{item.settlementId ?? item.executionRunId ?? '—'}</p></div><strong className={item.status === 'issued' ? 'severity-ready' : item.status === 'failed' ? 'severity-error' : 'severity-warning'}>{item.status.toUpperCase()}</strong></div>
          <dl className='admin-grid-2'>
            <div><dt>Amount</dt><dd>{item.amount} {item.unit}</dd></div>
            <div><dt>Issued</dt><dd>{formatTime(item.issuedAt)}</dd></div>
            <div><dt>Summary</dt><dd>{item.summary}</dd></div>
            <div><dt>Evidence</dt><dd>{formatValue(item.evidenceRefs)}</dd></div>
          </dl>
        </article>)}</div> : <EmptyState title='No receipts yet' message='Receipts stay truthful and empty until settlement authoritatively issues one.' />}
      </Panel>
    </div>
  </div>
}

export function DashboardOverviewApp() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await requestJson<DashboardSummary>('/api/v1/dashboard')
      setSummary(response)
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Dashboard request failed.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const refreshForTrustedSession = () => { void load() }
    window.addEventListener('acs:auth-ready', refreshForTrustedSession)
    return () => window.removeEventListener('acs:auth-ready', refreshForTrustedSession)
  }, [load])

  return <div className='admin-app' data-theme-surface='operational-overview'>
    <header className='admin-shell'>
      <div><span className='eyebrow'>ACS CONTROL PLANE</span><h1>Dashboard Overview</h1><p>Authoritative operational readiness from the active backend composition.</p></div>
      <div className='admin-shell__actions'><a href='/operations/providers'>Providers</a><a href='/admin/tenants'>Tenant Administration</a><button type='button' className='button ghost' onClick={() => void load()}>Refresh</button></div>
    </header>

    {loading ? <div className='admin-grid'>{Array.from({ length: 4 }, (_, index) => <div key={index} className='admin-skeleton' />)}</div>
      : error ? <ErrorState error={error} onRetry={() => void load()} />
        : summary ? <main className='admin-page'>
          <section className='admin-context' aria-label='Global Readiness'>
            <div><span className='eyebrow'>GLOBAL READINESS</span><h2 className={summary.readiness.blockerCount ? 'severity-error' : 'severity-ready'}>{summary.readiness.blockerCount ? 'Operational errors requiring attention' : 'Ready for certified topology'}</h2><p>Global claims remain limited by explicit caveats.</p></div>
            <dl className='admin-grid-2'>
              <div><dt>State</dt><dd className={summary.readiness.blockerCount ? 'severity-error' : 'severity-ready'}>{summary.readiness.state}</dd></div>
              <div><dt>Runtime</dt><dd>{summary.runtime.connectivity}</dd></div>
              <div><dt>Errors</dt><dd className='severity-error'>{summary.readiness.blockerCount}</dd></div>
              <div><dt>Warnings</dt><dd className='severity-warning'>{summary.readiness.warningCount}</dd></div>
            </dl>
          </section>

          <section className='admin-panel' aria-label='Active composition descriptors'>
            <div className='admin-panel__head'><h3>Active composition</h3><span className='admin-mono'>checked {new Date(summary.readiness.checkedAt).toLocaleString()}</span></div>
            <dl className='admin-grid-2'>{Object.entries(summary.composition).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{String(value)}</dd></div>)}</dl>
          </section>

          <section className='admin-panel' aria-label='Economic operations'>
            <EconomicOperationsPanel />
          </section>

          <section className='admin-panel' aria-label='Critical blockers'>
            <div className='admin-panel__head'><h3>Critical blockers</h3><span className='severity-error'>{summary.criticalBlockers.length} ERROR</span></div>
            {summary.criticalBlockers.length ? <div className='admin-cards'>{summary.criticalBlockers.map(finding => <FindingCard key={finding.code} finding={finding} />)}</div> : <div className='admin-empty'><strong className='severity-ready'>No active critical blockers</strong><p>Historical blocker scan: {summary.historicalBlockerScan.count}</p></div>}
          </section>

          <section className='admin-panel' aria-label='Operational caveats'>
            <div className='admin-panel__head'><h3>Operational caveats</h3><span className='severity-warning'>{summary.operationalCaveats.length} WARNING</span></div>
            {summary.operationalCaveats.length ? <div className='admin-cards'>{summary.operationalCaveats.map(finding => <FindingCard key={finding.code} finding={finding} />)}</div> : <div className='admin-empty'><strong className='severity-ready'>No active caveats</strong></div>}
          </section>
        </main> : null}
  </div>
}
