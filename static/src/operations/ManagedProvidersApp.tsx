import { useCallback, useEffect, useState } from 'react'

interface ProviderStatus {
  readonly name: string
  readonly classification: string
  readonly configured: boolean
  readonly reachable: boolean
  readonly authenticated: boolean
  readonly secureTransport: boolean
  readonly ready: boolean
  readonly degraded: boolean
  readonly reasonCode?: string
  readonly checkedAt: number
  readonly detail: string
}

interface ProviderHealth {
  readonly profile: string
  readonly ready: boolean
  readonly degraded: boolean
  readonly checkedAt: number
  readonly instanceId: string
  readonly statuses: readonly ProviderStatus[]
  readonly reasonCodes: readonly string[]
}

function apiUrl(path: string) {
  const base = (import.meta.env.VITE_ACS_API_BASE_URL ?? '').replace(/\/+$/, '')
  return base ? base + path : path
}

function bearerToken() {
  return (window as Window & { __ACS_AUTH__?: { readonly accessToken?: string } }).__ACS_AUTH__?.accessToken
}

function Status({ ready }: { ready: boolean }) {
  return <span className={'pill ' + (ready ? 'pill-active' : 'pill-suspended')}>{ready ? 'Ready' : 'Blocked'}</span>
}

export function ManagedProvidersApp() {
  const [health, setHealth] = useState<ProviderHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const token = bearerToken()
      const response = await fetch(apiUrl('/api/v1/system/providers'), {
        headers: token ? { authorization: `Bearer ${token}`, 'x-correlation-id': `operations-${Date.now()}` } : {},
      })
      const payload = await response.json() as { readonly success?: boolean; readonly data?: ProviderHealth; readonly error?: { readonly code?: string; readonly message?: string } }
      if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? payload.error?.code ?? `Provider diagnostics failed (${response.status})`)
      setHealth(payload.data)
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Provider diagnostics failed.')
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

  return <div className='admin-app'>
    <header className='admin-shell'>
      <div><span className='eyebrow'>ACS CONTROL PLANE</span><h1>Managed Provider Operations</h1><p>External identity, secrets, edge, limiting and telemetry status from the authoritative production composition.</p></div>
      <div className='admin-shell__actions'><a href='/admin/tenants'>Tenant Administration</a><button type='button' className='button ghost' onClick={() => void load()}>Refresh</button></div>
    </header>

    <section className='admin-context' aria-label='Provider readiness summary'>
      <div><span className='eyebrow'>DISTRIBUTED PRODUCTION PROFILE</span><h2>{health?.ready ? 'Provider composition ready' : loading ? 'Checking provider composition' : 'Provider composition blocked'}</h2><p>Readiness is calculated by the backend. This surface cannot override provider authority or security policy.</p></div>
      <div className='admin-page__meta'>{health && <Status ready={health.ready} />}<span className='admin-mono'>{health?.instanceId ?? 'pending'}</span></div>
    </section>

    {loading ? <div className='admin-grid'>{Array.from({ length: 6 }, (_, index) => <div key={index} className='admin-skeleton' />)}</div>
      : error ? <div className='admin-state admin-state-error' role='alert'><strong>Provider diagnostics unavailable</strong><p>{error}</p><button type='button' className='button ghost' onClick={() => void load()}>Retry</button></div>
        : health ? <main className='admin-page'>
          <section className='admin-panel'><div className='admin-panel__head'><h3>Provider boundaries</h3><span className='admin-mono'>Checked {new Date(health.checkedAt).toLocaleString()}</span></div>
            <div className='admin-cards'>{health.statuses.map(provider => <article key={provider.name} className='admin-card'>
              <div className='admin-card__head'><div><h3>{provider.name.replaceAll('_', ' ')}</h3><p>{provider.classification.replaceAll('_', ' ')}</p></div><Status ready={provider.ready} /></div>
              <dl className='admin-grid-2'>
                <div><dt>Reachable</dt><dd>{provider.reachable ? 'Yes' : 'No'}</dd></div>
                <div><dt>Authenticated</dt><dd>{provider.authenticated ? 'Yes' : 'No'}</dd></div>
                <div><dt>Secure transport</dt><dd>{provider.secureTransport ? 'Yes' : 'No'}</dd></div>
                <div><dt>Reason</dt><dd>{provider.reasonCode ?? 'READY'}</dd></div>
              </dl>
              <p>{provider.detail}</p>
            </article>)}</div>
          </section>
        </main> : null}
  </div>
}
