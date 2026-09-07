import { useCallback, useEffect, useState } from 'react'

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

function apiUrl(path: string) {
  const base = (import.meta.env.VITE_ACS_API_BASE_URL ?? '').replace(/\/+$/, '')
  return base ? base + path : path
}

function bearerToken() {
  return (window as Window & { __ACS_AUTH__?: { readonly accessToken?: string } }).__ACS_AUTH__?.accessToken
}

function FindingCard({ finding }: { finding: Finding }) {
  return <article className={`admin-card blocker ${finding.severity}`} data-severity={finding.severity}>
    <div className='admin-card__head'>
      <div><h3>{finding.domain.replaceAll('-', ' ')}</h3><p className='admin-mono'>{finding.code}</p></div>
      <strong className={`severity-${finding.severity}`}>{finding.severity.toUpperCase()}</strong>
    </div>
    <p>{finding.message}</p>
  </article>
}

export function DashboardOverviewApp() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const token = bearerToken()
      const response = await fetch(apiUrl('/api/v1/dashboard'), {
        credentials: 'same-origin',
        headers: token ? { authorization: `Bearer ${token}`, 'x-correlation-id': `overview-${Date.now()}` } : {},
      })
      const payload = await response.json() as { readonly success?: boolean; readonly data?: DashboardSummary; readonly error?: { readonly message?: string; readonly code?: string } }
      if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? payload.error?.code ?? `Dashboard request failed (${response.status})`)
      setSummary(payload.data)
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
      : error ? <div className='admin-state admin-state-error' role='alert'><strong>Dashboard unavailable</strong><p>{error}</p></div>
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
