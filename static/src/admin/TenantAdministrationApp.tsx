import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import {
  type AdministrativeRole,
  AdminApiError,
  type AdminAccessContext,
  type AdministrativeAuditCategory,
  type AdministrativeAuditOutcome,
  type TenantAdministrativeAuditEntry,
  type GovernanceDecisionView,
  type GovernedAction,
  type TenantAdminDetail,
  type TenantMembershipView,
  type TenantStatus,
  type TenantGovernancePolicyInput,
  createAdminApi,
  formatAdminDate,
  readAdminAccessContext,
  writeAdminAccessContext,
} from './api'

type AdminTab = 'overview' | 'members' | 'governance' | 'entitlements' | 'limits' | 'audit'
type AdminRoute = { kind: 'list' } | { kind: 'detail'; tenantId: string; tab: AdminTab }
type Confirmation = { title: string; message: string; confirmLabel?: string; run: () => Promise<void> } | null

const TABS: readonly AdminTab[] = ['overview', 'members', 'governance', 'entitlements', 'limits', 'audit']
const GOVERNED_ACTIONS: readonly GovernedAction[] = ['agent.create', 'agent.configure', 'deployment.create', 'deployment.start', 'tool.install', 'plugin.install', 'execution.start']
const ROLE_OPTIONS: readonly AdministrativeRole[] = ['tenant_owner', 'tenant_admin', 'operator', 'auditor']
const ACTOR_OPTIONS = ['system', 'tenant-admin', 'tenant-member', 'auditor'] as const

function normalizePath(pathname: string) {
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.replace(/\/+$/, '') : pathname
}

function parseAdminRoute(pathname: string): AdminRoute {
  const segments = normalizePath(pathname).split('/').filter(Boolean)
  if (segments[0] !== 'admin' || segments[1] !== 'tenants') return { kind: 'list' }
  const tenantId = segments[2]
  if (!tenantId) return { kind: 'list' }
  const tabSegment = segments[3]
  if (tabSegment === 'members') return { kind: 'detail', tenantId: decodeURIComponent(tenantId), tab: 'members' }
  if (tabSegment === 'governance') return { kind: 'detail', tenantId: decodeURIComponent(tenantId), tab: 'governance' }
  if (tabSegment === 'entitlements') return { kind: 'detail', tenantId: decodeURIComponent(tenantId), tab: 'entitlements' }
  if (tabSegment === 'limits') return { kind: 'detail', tenantId: decodeURIComponent(tenantId), tab: 'limits' }
  if (tabSegment === 'audit') return { kind: 'detail', tenantId: decodeURIComponent(tenantId), tab: 'audit' }
  return { kind: 'detail', tenantId: decodeURIComponent(tenantId), tab: 'overview' }
}

function toTenantPath(tenantId: string, tab: AdminTab = 'overview') {
  return tab === 'overview' ? '/admin/tenants/' + encodeURIComponent(tenantId) : '/admin/tenants/' + encodeURIComponent(tenantId) + '/' + tab
}

function useSpaPathname() {
  const [pathname, setPathname] = useState(() => window.location.pathname)
  useEffect(() => {
    const update = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', update)
    window.addEventListener('acs:navigation', update)
    return () => {
      window.removeEventListener('popstate', update)
      window.removeEventListener('acs:navigation', update)
    }
  }, [])
  return pathname
}

function navigate(pathname: string) {
  if (window.location.pathname === pathname) return
  window.history.pushState({}, '', pathname)
  window.dispatchEvent(new Event('acs:navigation'))
}

function classNames(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(' ')
}

function useApi(context: AdminAccessContext) {
  return useMemo(() => createAdminApi(context), [context.actorId, context.actorType, context.authenticated, context.tenantId, context.wallet])
}

function useAdminContext() {
  const [context, setContext] = useState<AdminAccessContext>(() => readAdminAccessContext())
  useEffect(() => {
    writeAdminAccessContext(context)
  }, [context])
  return [context, setContext] as const
}

function useResource<T>(loader: () => Promise<T>, deps: readonly unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    loader()
      .then(value => { if (alive) setData(value) })
      .catch(value => { if (alive) setError(value) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [tick, ...deps])
  return { data, loading, error, reload: () => setTick(value => value + 1) }
}

function statusMessage(error: unknown) {
  if (error instanceof AdminApiError) {
    if (error.status === 403) return { title: 'Forbidden', message: error.message }
    if (error.status === 404) return { title: 'Not found', message: error.message }
    if (error.status === 409) return { title: 'State conflict', message: error.message }
    if (error.status === 429) return { title: 'Limit exceeded', message: error.message }
    return { title: error.code + ' (' + error.status + ')', message: error.message }
  }
  return { title: 'Request failed', message: error instanceof Error ? error.message : 'The admin API request failed.' }
}

function pillClass(status: string) {
  return 'pill pill-' + status.replace(/[^a-z0-9]+/gi, '-')
}

function Panel({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return <section className='admin-panel'><div className='admin-panel__head'><h3>{title}</h3>{actions && <div className='admin-panel__actions'>{actions}</div>}</div>{children}</section>
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return <div className='admin-empty'><h3>{title}</h3><p>{message}</p></div>
}

function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const state = statusMessage(error)
  return <div className='admin-state admin-state-error' role='alert'><strong>{state.title}</strong><p>{state.message}</p>{onRetry && <div className='admin-form__actions'><button type='button' className='button ghost' onClick={onRetry}>Retry</button></div>}</div>
}

function ConfirmDialog({ confirmation, onCancel, onConfirm }: { confirmation: Confirmation; onCancel: () => void; onConfirm: (confirmation: Exclude<Confirmation, null>) => Promise<void> }) {
  if (!confirmation) return null
  return <div className='modal-backdrop' role='presentation' onClick={onCancel}>
    <div className='modal-card' role='dialog' aria-modal='true' aria-labelledby='confirm-title' onClick={event => event.stopPropagation()}>
      <h3 id='confirm-title'>{confirmation.title}</h3>
      <p>{confirmation.message}</p>
      <div className='modal-actions'>
        <button type='button' className='button ghost' onClick={onCancel}>Cancel</button>
        <button type='button' className='button button-danger' onClick={async () => { await onConfirm(confirmation) }}>{confirmation.confirmLabel ?? 'Confirm'}</button>
      </div>
    </div>
  </div>
}

function Link({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return <a href={href} className={className} onClick={event => { event.preventDefault(); navigate(href) }}>{children}</a>
}

function StatusBadge({ status }: { status: string }) {
  return <span className={pillClass(status)}>{status.replaceAll('_', ' ')}</span>
}

function ContextPanel({ context, setContext }: { context: AdminAccessContext; setContext: Dispatch<SetStateAction<AdminAccessContext>> }) {
  return <section className='admin-context' aria-label='Administrative access context'>
    <div>
      <span className='eyebrow'>ACCESS CONTEXT</span>
      <h2>Resolved actor for the Product API</h2>
      <p>Mock Control Plane credentials used to exercise tenant scope and authority boundaries.</p>
    </div>
    <form className='admin-context__form' onSubmit={event => event.preventDefault()}>
      <label><span>Actor type</span><select value={context.actorType} onChange={event => setContext(prev => ({ ...prev, actorType: event.target.value as AdminAccessContext['actorType'] }))}>{ACTOR_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}</select></label>
      <label><span>Actor id</span><input value={context.actorId} onChange={event => setContext(prev => ({ ...prev, actorId: event.target.value }))} /></label>
      <label><span>Tenant scope</span><input value={context.tenantId ?? ''} onChange={event => setContext(prev => ({ ...prev, tenantId: event.target.value || undefined }))} placeholder='Optional for system actor' /></label>
    </form>
  </section>
}

function TenantListPage({ api, context, onOpenTenant }: { api: ReturnType<typeof createAdminApi>; context: AdminAccessContext; onOpenTenant: (tenantId: string) => void }) {
  const [filter, setFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | TenantStatus>('all')
  const [draft, setDraft] = useState({ tenantId: '', displayName: '', description: '', reason: '' })
  const [busy, setBusy] = useState(false)
  const resource = useResource(() => api.listTenants(), [api, context.actorId, context.actorType, context.authenticated, context.tenantId, context.wallet])

  const items = (resource.data ?? []).filter(tenant => {
    const target = [tenant.tenantId, tenant.administrativeMetadata?.displayName ?? '', tenant.administrativeMetadata?.description ?? ''].join(' ').toLowerCase()
    return (!filter.trim() || target.includes(filter.trim().toLowerCase())) && (statusFilter === 'all' || tenant.status === statusFilter)
  })

  return <div className='admin-page'>
    <header className='admin-page__header'>
      <div>
        <span className='eyebrow'>TENANT ADMINISTRATION</span>
        <h1>Tenants</h1>
        <p>List, inspect and govern tenant lifecycle, membership, governance, entitlements and limits.</p>
      </div>
      <div className='admin-page__meta'>
        <StatusBadge status={context.actorType} />
        <span className='admin-mono'>{context.actorId}</span>
      </div>
    </header>

    <Panel title='Find tenants' actions={<button type='button' className='button ghost' onClick={() => resource.reload()}>Refresh</button>}>
      <div className='admin-filters'>
        <label><span>Search</span><input value={filter} onChange={event => setFilter(event.target.value)} placeholder='tenant id, display name, description' /></label>
        <label><span>Status</span><select value={statusFilter} onChange={event => setStatusFilter(event.target.value as 'all' | TenantStatus)}><option value='all'>All</option><option value='provisioning'>provisioning</option><option value='active'>active</option><option value='suspended'>suspended</option><option value='archived'>archived</option></select></label>
      </div>
    </Panel>

    <Panel title='Create tenant'>
      <form className='admin-form' onSubmit={async event => {
        event.preventDefault()
        if (!draft.tenantId.trim()) return
        setBusy(true)
        try {
          await api.createTenant({ tenantId: draft.tenantId.trim(), displayName: draft.displayName.trim() || undefined, description: draft.description.trim() || undefined, createdBy: context.actorId, reason: draft.reason.trim() || undefined })
          setDraft({ tenantId: '', displayName: '', description: '', reason: '' })
          resource.reload()
        } finally {
          setBusy(false)
        }
      }}>
        <label><span>Tenant id</span><input required value={draft.tenantId} onChange={event => setDraft(prev => ({ ...prev, tenantId: event.target.value }))} /></label>
        <label><span>Display name</span><input value={draft.displayName} onChange={event => setDraft(prev => ({ ...prev, displayName: event.target.value }))} /></label>
        <label><span>Description</span><input value={draft.description} onChange={event => setDraft(prev => ({ ...prev, description: event.target.value }))} /></label>
        <label><span>Reason</span><input value={draft.reason} onChange={event => setDraft(prev => ({ ...prev, reason: event.target.value }))} /></label>
        <div className='admin-form__actions'><button className='button' disabled={busy} type='submit'>Create tenant</button></div>
      </form>
    </Panel>

    {resource.loading ? <div className='admin-grid'>{Array.from({ length: 4 }, (_, index) => <div key={index} className='admin-skeleton' />)}</div> : resource.error ? <ErrorState error={resource.error} onRetry={resource.reload} /> : items.length ? <div className='admin-cards'>{items.map(tenant => <article key={tenant.tenantId} className='admin-card'>
      <div className='admin-card__head'>
        <div>
          <h3><button type='button' className='link-button' onClick={() => onOpenTenant(tenant.tenantId)}>{tenant.administrativeMetadata?.displayName ?? tenant.tenantId}</button></h3>
          <p className='admin-mono'>{tenant.tenantId}</p>
        </div>
        <StatusBadge status={tenant.status} />
      </div>
      <dl className='admin-grid-2'>
        <div><dt>Owner</dt><dd>{tenant.ownerSummary.count ? tenant.ownerSummary.principalIds.join(', ') : 'No owner yet'}</dd></div>
        <div><dt>Members</dt><dd>{tenant.membershipSummary.active}/{tenant.membershipSummary.total} active</dd></div>
        <div><dt>Governance</dt><dd>{tenant.governanceSummary.hasPolicy ? tenant.governanceSummary.ruleCount + ' rules' : 'Default deny'}</dd></div>
        <div><dt>Limits</dt><dd>{tenant.limitSummary.total}</dd></div>
      </dl>
      <div className='admin-card__foot'>
        <span>Updated {formatAdminDate(tenant.lifecycle?.updatedAt)}</span>
        <Link href={toTenantPath(tenant.tenantId)}>Open detail</Link>
      </div>
    </article>)}</div> : <EmptyState title='No tenants found' message='Create a tenant or clear the filters to see administrative records.' />}
  </div>
}

function OverviewTab({ detail }: { detail: TenantAdminDetail }) {
  return <div className='admin-grid'>
    <Panel title='Lifecycle'>
      <dl className='admin-grid-2'>
        <div><dt>Status</dt><dd><StatusBadge status={detail.status} /></dd></div>
        <div><dt>Created</dt><dd>{formatAdminDate(detail.lifecycle?.createdAt)}</dd></div>
        <div><dt>Updated</dt><dd>{formatAdminDate(detail.lifecycle?.updatedAt)}</dd></div>
        <div><dt>Archived</dt><dd>{formatAdminDate(detail.lifecycle?.archivedAt)}</dd></div>
      </dl>
    </Panel>
    <Panel title='Ownership'>
      <dl className='admin-grid-2'>
        <div><dt>Owners</dt><dd>{detail.ownerSummary.principalIds.length ? detail.ownerSummary.principalIds.join(', ') : 'No owner yet'}</dd></div>
        <div><dt>Owner count</dt><dd>{detail.ownerSummary.count}</dd></div>
      </dl>
    </Panel>
    <Panel title='Summaries'>
      <dl className='admin-grid-2'>
        <div><dt>Members</dt><dd>{detail.membershipSummary.active}/{detail.membershipSummary.total} active</dd></div>
        <div><dt>Governance rules</dt><dd>{detail.governance.policy?.rules.length ?? 0}</dd></div>
        <div><dt>Entitlements</dt><dd>{detail.governance.entitlements.length}</dd></div>
        <div><dt>Limits</dt><dd>{detail.governance.limits.length}</dd></div>
      </dl>
    </Panel>
  </div>
}

function MemberCard({ api, detail, member, onReload, onBusy, busy, onConfirm }: { api: ReturnType<typeof createAdminApi>; detail: TenantAdminDetail; member: TenantMembershipView; onReload: () => void; onBusy: (label: string | null) => void; busy: string | null; onConfirm: Dispatch<SetStateAction<Confirmation>> }) {
  const [role, setRole] = useState(member.role)
  useEffect(() => setRole(member.role), [member.role])
  const isOwner = detail.ownerSummary.principalIds.includes(member.principalId)
  return <article className='admin-card'>
    <div className='admin-card__head'>
      <div>
        <h3>{member.principalId}</h3>
        <p className='admin-mono'>created {formatAdminDate(member.createdAt)}</p>
      </div>
      <StatusBadge status={member.status} />
    </div>
    <dl className='admin-grid-2'>
      <div><dt>Role</dt><dd>{member.role.replaceAll('_', ' ')}</dd></div>
      <div><dt>Revision</dt><dd>{member.revision}</dd></div>
      <div><dt>Updated</dt><dd>{formatAdminDate(member.updatedAt)}</dd></div>
      <div><dt>Owner</dt><dd>{isOwner ? 'Yes' : 'No'}</dd></div>
    </dl>
    <form className='admin-form admin-form--compact' onSubmit={event => {
      event.preventDefault()
      if (role === member.role) return
      onConfirm({
        title: 'Change role',
        message: 'Change ' + member.principalId + ' from ' + member.role + ' to ' + role + '?',
        run: async () => {
          onBusy('role-' + member.principalId)
          try {
            await api.changeRole(detail.tenantId, member.principalId, { role, reason: undefined })
            onReload()
          } finally {
            onBusy(null)
          }
        },
      })
    }}>
      <label><span>Role</span><select value={role} onChange={event => setRole(event.target.value as AdministrativeRole)}>{ROLE_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}</select></label>
      <div className='admin-form__actions'>
        <button className='button' type='submit' disabled={busy === 'role-' + member.principalId || role === member.role}>Update role</button>
        <button className='button ghost' type='button' disabled={busy === 'suspend-' + member.principalId || member.status === 'suspended'} onClick={() => onConfirm({ title: 'Suspend member', message: 'Suspend ' + member.principalId + ' on ' + detail.tenantId + '?', run: async () => { onBusy('suspend-' + member.principalId); try { await api.suspendMember(detail.tenantId, member.principalId); onReload() } finally { onBusy(null) } } })}>Suspend</button>
        <button className='button ghost' type='button' disabled={busy === 'reactivate-' + member.principalId || member.status !== 'suspended'} onClick={() => onConfirm({ title: 'Reactivate member', message: 'Reactivate ' + member.principalId + ' on ' + detail.tenantId + '?', run: async () => { onBusy('reactivate-' + member.principalId); try { await api.reactivateMember(detail.tenantId, member.principalId); onReload() } finally { onBusy(null) } } })}>Reactivate</button>
        <button className='button button-danger' type='button' disabled={busy === 'remove-' + member.principalId} onClick={() => onConfirm({ title: 'Remove member', message: 'Remove ' + member.principalId + ' from ' + detail.tenantId + '?', run: async () => { onBusy('remove-' + member.principalId); try { await api.removeMember(detail.tenantId, member.principalId); onReload() } finally { onBusy(null) } } })}>Remove</button>
      </div>
    </form>
  </article>
}

function MembersTab({ api, detail, onReload, onBusy, busy, onConfirm }: { api: ReturnType<typeof createAdminApi>; detail: TenantAdminDetail; onReload: () => void; onBusy: (label: string | null) => void; busy: string | null; onConfirm: Dispatch<SetStateAction<Confirmation>> }) {
  const [draft, setDraft] = useState({ principalId: '', role: 'tenant_admin' as AdministrativeRole, reason: '' })
  const [ownerTarget, setOwnerTarget] = useState(detail.ownerSummary.principalIds[0] ?? '')

  useEffect(() => {
    setOwnerTarget(detail.ownerSummary.principalIds[0] ?? '')
  }, [detail.ownerSummary.principalIds.join('|')])

  return <div className='admin-stack'>
    <Panel title='Ownership transfer' actions={detail.ownerSummary.count ? <span className='admin-muted'>Owner state is governed and atomic.</span> : <span className='admin-muted'>No owner yet.</span>}>
      <form className='admin-form admin-form--compact' onSubmit={event => {
        event.preventDefault()
        if (!detail.ownerSummary.principalIds[0] || !ownerTarget || ownerTarget === detail.ownerSummary.principalIds[0]) return
        onConfirm({
          title: 'Transfer ownership',
          message: 'Transfer ownership of ' + detail.tenantId + ' from ' + detail.ownerSummary.principalIds[0] + ' to ' + ownerTarget + '?',
          run: async () => {
            onBusy('transfer')
            try {
              await api.transferOwnership(detail.tenantId, { fromPrincipalId: detail.ownerSummary.principalIds[0], toPrincipalId: ownerTarget })
              onReload()
            } finally {
              onBusy(null)
            }
          },
        })
      }}>
        <label><span>Current owner</span><input value={detail.ownerSummary.principalIds[0] ?? '—'} disabled /></label>
        <label><span>New owner</span><select value={ownerTarget} onChange={event => setOwnerTarget(event.target.value)}>{detail.memberships.filter(member => member.status === 'active').map(member => <option key={member.principalId} value={member.principalId}>{member.principalId}</option>)}</select></label>
        <div className='admin-form__actions'><button className='button' type='submit' disabled={!detail.ownerSummary.principalIds[0] || !ownerTarget || busy === 'transfer'}>Transfer</button></div>
      </form>
    </Panel>

    <Panel title='Add member'>
      <form className='admin-form admin-form--compact' onSubmit={async event => {
        event.preventDefault()
        if (!draft.principalId.trim()) return
        onBusy('add-member')
        try {
          await api.addMember(detail.tenantId, { principalId: draft.principalId.trim(), role: draft.role, reason: draft.reason.trim() || undefined })
          setDraft({ principalId: '', role: 'tenant_admin', reason: '' })
          onReload()
        } finally {
          onBusy(null)
        }
      }}>
        <label><span>Principal</span><input value={draft.principalId} onChange={event => setDraft(prev => ({ ...prev, principalId: event.target.value }))} /></label>
        <label><span>Role</span><select value={draft.role} onChange={event => setDraft(prev => ({ ...prev, role: event.target.value as AdministrativeRole }))}>{ROLE_OPTIONS.map(role => <option key={role} value={role}>{role}</option>)}</select></label>
        <label><span>Reason</span><input value={draft.reason} onChange={event => setDraft(prev => ({ ...prev, reason: event.target.value }))} /></label>
        <div className='admin-form__actions'><button className='button' type='submit' disabled={busy === 'add-member'}>Add member</button></div>
      </form>
    </Panel>

    <Panel title='Members'>
      {detail.memberships.length ? <div className='admin-cards'>{detail.memberships.map(member => <MemberCard key={member.principalId} api={api} detail={detail} member={member} onReload={onReload} onBusy={onBusy} busy={busy} onConfirm={onConfirm} />)}</div> : <EmptyState title='No memberships' message='Create a membership to establish tenant-scoped authority.' />}
    </Panel>
  </div>
}

function GovernanceTab({ api, detail, onReload, onBusy, busy }: { api: ReturnType<typeof createAdminApi>; detail: TenantAdminDetail; onReload: () => void; onBusy: (label: string | null) => void; busy: string | null }) {
  const policy = detail.governance.policy
  const [policyId, setPolicyId] = useState(policy?.policyId ?? detail.tenantId + '-policy')
  const [defaultEffect, setDefaultEffect] = useState<'allow' | 'deny'>(policy?.defaultEffect ?? 'deny')
  const [rules, setRules] = useState<Record<GovernedAction, { effect: 'allow' | 'deny'; priority: number }>>(() => {
    const next = Object.fromEntries(
      GOVERNED_ACTIONS.map(action => [action, { effect: 'deny' as const, priority: 100 }]),
    ) as Record<GovernedAction, { effect: 'allow' | 'deny'; priority: number }>
    for (const rule of policy?.rules ?? []) next[rule.action] = { effect: rule.effect, priority: rule.priority }
    return next
  })

  useEffect(() => {
    setPolicyId(policy?.policyId ?? detail.tenantId + '-policy')
    setDefaultEffect(policy?.defaultEffect ?? 'deny')
    setRules(prev => {
      const next = Object.fromEntries(
        GOVERNED_ACTIONS.map(action => [action, prev[action] ?? { effect: 'deny' as const, priority: 100 }]),
      ) as Record<GovernedAction, { effect: 'allow' | 'deny'; priority: number }>
      for (const rule of policy?.rules ?? []) next[rule.action] = { effect: rule.effect, priority: rule.priority }
      return next
    })
  }, [detail.governance.revision])

  return <div className='admin-stack'>
    <Panel title='Current policy'>
      {policy ? <div className='admin-stack'>
        <dl className='admin-grid-2'>
          <div><dt>Policy id</dt><dd>{policy.policyId}</dd></div>
          <div><dt>Default effect</dt><dd>{policy.defaultEffect}</dd></div>
          <div><dt>Rules</dt><dd>{policy.rules.length}</dd></div>
          <div><dt>Revision</dt><dd>{policy.revision}</dd></div>
        </dl>
        <div className='admin-rule-list'>{policy.rules.map(rule => <div key={rule.ruleId} className='admin-rule'><strong>{rule.action}</strong><span>{rule.effect}</span><small>priority {rule.priority}</small></div>)}</div>
      </div> : <EmptyState title='No explicit policy' message='Effective decision: deny.' />}
    </Panel>

    <Panel title='Replace policy'>
      <form className='admin-form' onSubmit={async event => {
        event.preventDefault()
        onBusy('policy')
        try {
          await api.savePolicy(detail.tenantId, {
            policyId: policyId.trim() || detail.tenantId + '-policy',
            defaultEffect,
            rules: GOVERNED_ACTIONS.map(action => ({
              ruleId: (policyId.trim() || detail.tenantId + '-' + action).replace(/[^a-z0-9.-]+/gi, '-'),
              action,
              effect: rules[action].effect,
              priority: Number.isFinite(rules[action].priority) ? rules[action].priority : 100,
            })),
          } as TenantGovernancePolicyInput)
          onReload()
        } finally {
          onBusy(null)
        }
      }}>
        <label><span>Policy id</span><input value={policyId} onChange={event => setPolicyId(event.target.value)} /></label>
        <label><span>Default effect</span><select value={defaultEffect} onChange={event => setDefaultEffect(event.target.value as 'allow' | 'deny')}><option value='deny'>deny</option><option value='allow'>allow</option></select></label>
        <div className='admin-rule-editor'>
          {GOVERNED_ACTIONS.map(action => <div key={action} className='admin-rule-editor__row'>
            <strong>{action}</strong>
            <select value={rules[action].effect} onChange={event => setRules(prev => ({ ...prev, [action]: { ...prev[action], effect: event.target.value as 'allow' | 'deny' } }))}><option value='deny'>deny</option><option value='allow'>allow</option></select>
            <input type='number' value={rules[action].priority} onChange={event => setRules(prev => ({ ...prev, [action]: { ...prev[action], priority: Number(event.target.value) } }))} />
          </div>)}
        </div>
        <div className='admin-form__actions'><button className='button' disabled={busy === 'policy'} type='submit'>Save policy</button></div>
      </form>
    </Panel>

    <Panel title='Decision inspection'>
      <DecisionInspector api={api} tenantId={detail.tenantId} />
    </Panel>
  </div>
}

function DecisionInspector({ api, tenantId }: { api: ReturnType<typeof createAdminApi>; tenantId: string }) {
  const [action, setAction] = useState<GovernedAction>('agent.create')
  const [result, setResult] = useState<GovernanceDecisionView | null>(null)
  const [error, setError] = useState<unknown>(null)
  return <form className='admin-form admin-form--compact' onSubmit={async event => {
    event.preventDefault()
    setError(null)
    try {
      setResult(await api.evaluateGovernance(tenantId, { action }))
    } catch (value) {
      setError(value)
    }
  }}>
    <label><span>Action</span><select value={action} onChange={event => setAction(event.target.value as GovernedAction)}>{GOVERNED_ACTIONS.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
    <div className='admin-form__actions'><button className='button' type='submit'>Evaluate</button></div>
    {result && <pre className='admin-pre'>{JSON.stringify(result, null, 2)}</pre>}
    {error ? <ErrorState error={error} /> : null}
  </form>
}

function EntitlementsTab({ api, detail, onReload, onBusy, busy, onConfirm }: { api: ReturnType<typeof createAdminApi>; detail: TenantAdminDetail; onReload: () => void; onBusy: (label: string | null) => void; busy: string | null; onConfirm: Dispatch<SetStateAction<Confirmation>> }) {
  const [draft, setDraft] = useState({ key: '', enabled: true })
  return <div className='admin-stack'>
    <Panel title='Configured entitlements'>
      {detail.governance.entitlements.length ? <div className='admin-cards'>{detail.governance.entitlements.map(entitlement => <article key={entitlement.entitlementKey} className='admin-card'>
        <div className='admin-card__head'><div><h3>{entitlement.entitlementKey}</h3><p className='admin-mono'>{entitlement.tenantId}</p></div><StatusBadge status={entitlement.enabled ? 'enabled' : 'disabled'} /></div>
        <dl className='admin-grid-2'>
          <div><dt>Source</dt><dd>{entitlement.provenance?.source ?? 'tenant'}</dd></div>
          <div><dt>Revision</dt><dd>{entitlement.revision}</dd></div>
          <div><dt>Updated</dt><dd>{formatAdminDate(entitlement.updatedAt)}</dd></div>
        </dl>
        <div className='admin-card__foot'>
          <button className='button' type='button' disabled={busy === 'entitlement-' + entitlement.entitlementKey} onClick={() => onConfirm({ title: entitlement.enabled ? 'Disable entitlement' : 'Enable entitlement', message: (entitlement.enabled ? 'Disable ' : 'Enable ') + entitlement.entitlementKey + ' for ' + detail.tenantId + '?', run: async () => { onBusy('entitlement-' + entitlement.entitlementKey); try { await api.setEntitlement(detail.tenantId, entitlement.entitlementKey, { enabled: !entitlement.enabled }); onReload() } finally { onBusy(null) } } })}>{entitlement.enabled ? 'Disable' : 'Enable'}</button>
          <button className='button ghost' type='button' disabled={busy === 'remove-entitlement-' + entitlement.entitlementKey} onClick={() => onConfirm({ title: 'Remove entitlement', message: 'Remove entitlement ' + entitlement.entitlementKey + ' from ' + detail.tenantId + '?', confirmLabel: 'Remove', run: async () => { onBusy('remove-entitlement-' + entitlement.entitlementKey); try { await api.removeEntitlement(detail.tenantId, entitlement.entitlementKey); onReload() } finally { onBusy(null) } } })}>Remove</button>
        </div>
      </article>)}</div> : <EmptyState title='No entitlements' message='Grant or disable capabilities through the Product API.' />}
    </Panel>
    <Panel title='Upsert entitlement'>
      <form className='admin-form admin-form--compact' onSubmit={async event => {
        event.preventDefault()
        if (!draft.key.trim()) return
        onBusy('upsert-entitlement')
        try {
          await api.setEntitlement(detail.tenantId, draft.key.trim(), { enabled: draft.enabled })
          setDraft({ key: '', enabled: true })
          onReload()
        } finally {
          onBusy(null)
        }
      }}>
        <label><span>Entitlement key</span><input value={draft.key} onChange={event => setDraft(prev => ({ ...prev, key: event.target.value }))} placeholder='custom_tools' /></label>
        <label><span>Enabled</span><select value={String(draft.enabled)} onChange={event => setDraft(prev => ({ ...prev, enabled: event.target.value === 'true' }))}><option value='true'>Enabled</option><option value='false'>Disabled</option></select></label>
        <div className='admin-form__actions'><button className='button' type='submit' disabled={busy === 'upsert-entitlement'}>Save entitlement</button></div>
      </form>
    </Panel>
  </div>
}

function LimitsTab({ api, detail, onReload, onBusy, busy, onConfirm }: { api: ReturnType<typeof createAdminApi>; detail: TenantAdminDetail; onReload: () => void; onBusy: (label: string | null) => void; busy: string | null; onConfirm: Dispatch<SetStateAction<Confirmation>> }) {
  const [draft, setDraft] = useState({ key: '', value: 0 })
  return <div className='admin-stack'>
    <Panel title='Configured limits'>
      {detail.governance.limits.length ? <div className='admin-cards'>{detail.governance.limits.map(limit => <article key={limit.limitKey} className='admin-card'>
        <div className='admin-card__head'><div><h3>{limit.limitKey}</h3><p className='admin-mono'>{limit.tenantId}</p></div><span className='pill'>Value {limit.value}</span></div>
        <dl className='admin-grid-2'>
          <div><dt>Configured</dt><dd>{limit.evaluation?.configuredLimit ?? limit.value}</dd></div>
          <div><dt>System hard limit</dt><dd>{limit.evaluation?.hardSystemLimit ?? '—'}</dd></div>
          <div><dt>Effective</dt><dd>{limit.evaluation?.effectiveLimit ?? limit.value}</dd></div>
          <div><dt>Within limit</dt><dd>{String(limit.evaluation?.withinLimit ?? true)}</dd></div>
        </dl>
        {limit.evaluation && <pre className='admin-pre'>{JSON.stringify(limit.evaluation, null, 2)}</pre>}
        <div className='admin-card__foot'>
          <button className='button' type='button' disabled={busy === 'limit-' + limit.limitKey} onClick={async () => { onBusy('limit-' + limit.limitKey); try { await api.setLimit(detail.tenantId, limit.limitKey, { value: limit.value }); onReload() } finally { onBusy(null) } }}>Update</button>
          <button className='button ghost' type='button' disabled={busy === 'clear-limit-' + limit.limitKey} onClick={() => onConfirm({ title: 'Reset limit', message: 'Reset tenant limit ' + limit.limitKey + ' for ' + detail.tenantId + '?', confirmLabel: 'Reset', run: async () => { onBusy('clear-limit-' + limit.limitKey); try { await api.clearLimit(detail.tenantId, limit.limitKey); onReload() } finally { onBusy(null) } } })}>Reset</button>
        </div>
      </article>)}</div> : <EmptyState title='No limits' message='Configured, system and effective limits are shown here when provided by the API.' />}
    </Panel>
    <Panel title='Set tenant limit'>
      <form className='admin-form admin-form--compact' onSubmit={async event => {
        event.preventDefault()
        if (!draft.key.trim()) return
        onBusy('upsert-limit')
        try {
          await api.setLimit(detail.tenantId, draft.key.trim(), { value: draft.value })
          setDraft({ key: '', value: 0 })
          onReload()
        } finally {
          onBusy(null)
        }
      }}>
        <label><span>Limit key</span><input value={draft.key} onChange={event => setDraft(prev => ({ ...prev, key: event.target.value }))} placeholder='max_agents' /></label>
        <label><span>Value</span><input type='number' value={draft.value} onChange={event => setDraft(prev => ({ ...prev, value: Number(event.target.value) }))} /></label>
        <div className='admin-form__actions'><button className='button' type='submit' disabled={busy === 'upsert-limit'}>Save limit</button></div>
      </form>
    </Panel>
  </div>
}

function AuditTab({ api, detail }: { api: ReturnType<typeof createAdminApi>; detail: TenantAdminDetail }) {
  const [category, setCategory] = useState<AdministrativeAuditCategory | ''>('')
  const [outcome, setOutcome] = useState<AdministrativeAuditOutcome | ''>('')
  const [actor, setActor] = useState('')
  const [correlationId, setCorrelationId] = useState('')
  const [eventType, setEventType] = useState('')
  const resource = useResource(() => api.listTenantAuditEntries(detail.tenantId, {
    ...(category ? { category } : {}),
    ...(outcome ? { outcome } : {}),
    ...(actor.trim() ? { actor: actor.trim() } : {}),
    ...(correlationId.trim() ? { correlationId: correlationId.trim() } : {}),
    ...(eventType.trim() ? { eventType: eventType.trim() } : {}),
  }), [api, detail.tenantId, category, outcome, actor, correlationId, eventType])

  return <div className='admin-stack'>
    <Panel title='Audit filters' actions={<button type='button' className='button ghost' onClick={() => resource.reload()}>Refresh</button>}>
      <div className='admin-filters'>
        <label><span>Category</span><select value={category} onChange={event => setCategory(event.target.value as AdministrativeAuditCategory | '')}><option value=''>All</option><option value='tenant.lifecycle'>tenant.lifecycle</option><option value='tenant.membership'>tenant.membership</option><option value='tenant.ownership'>tenant.ownership</option><option value='tenant.governance'>tenant.governance</option><option value='tenant.entitlement'>tenant.entitlement</option><option value='tenant.limit'>tenant.limit</option><option value='tenant.enforcement'>tenant.enforcement</option></select></label>
        <label><span>Outcome</span><select value={outcome} onChange={event => setOutcome(event.target.value as AdministrativeAuditOutcome | '')}><option value=''>All</option><option value='allowed'>allowed</option><option value='succeeded'>succeeded</option><option value='denied'>denied</option><option value='failed'>failed</option></select></label>
        <label><span>Actor</span><input value={actor} onChange={event => setActor(event.target.value)} placeholder='principal id' /></label>
        <label><span>Correlation</span><input value={correlationId} onChange={event => setCorrelationId(event.target.value)} placeholder='corr-...' /></label>
        <label><span>Event type</span><input value={eventType} onChange={event => setEventType(event.target.value)} placeholder='tenant.membership' /></label>
      </div>
    </Panel>
    {resource.loading ? <div className='admin-grid'>{Array.from({ length: 3 }, (_, index) => <div key={index} className='admin-skeleton' />)}</div> : resource.error ? <ErrorState error={resource.error} onRetry={resource.reload} /> : resource.data && resource.data.entries.length ? <div className='admin-cards'>{resource.data.entries.map((entry: TenantAdministrativeAuditEntry) => <article key={entry.eventId} className='admin-card'>
      <div className='admin-card__head'>
        <div>
          <h3>{entry.action}</h3>
          <p className='admin-mono'>{entry.summary}</p>
        </div>
        <StatusBadge status={entry.outcome} />
      </div>
      <dl className='admin-grid-2'>
        <div><dt>Category</dt><dd>{entry.category}</dd></div>
        <div><dt>Actor</dt><dd>{entry.actor ?? '—'}</dd></div>
        <div><dt>Target</dt><dd>{entry.targetType && entry.targetId ? entry.targetType + ":" + entry.targetId : '—'}</dd></div>
        <div><dt>Correlation</dt><dd className='admin-mono'>{entry.correlationId}</dd></div>
        <div><dt>Timestamp</dt><dd>{formatAdminDate(entry.timestamp)}</dd></div>
        <div><dt>Revision</dt><dd>{entry.revision ?? '—'}</dd></div>
      </dl>
      <div className='admin-chip-row'>
        {entry.authorityBasis && <span className='pill'>{entry.authorityBasis}</span>}
        {entry.deniedLayer && <span className='pill'>{entry.deniedLayer}</span>}
        {entry.governanceDecision && <span className='pill'>{entry.governanceDecision}</span>}
      </div>
      {entry.reason ? <p>{entry.reason}</p> : null}
    </article>)}</div> : <EmptyState title='No audit events' message='Administrative events for this tenant will appear here when mutations and decisions are recorded.' />}
  </div>
}

function TenantDetailPage({ api, detail, tab, onReload, onNavigate }: { api: ReturnType<typeof createAdminApi>; detail: TenantAdminDetail; tab: AdminTab; onReload: () => void; onNavigate: (pathname: string) => void }) {
  const [confirmation, setConfirmation] = useState<Confirmation>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const currentTab = tab
  const ownerId = detail.ownerSummary.principalIds[0]

  const lifecycleButtons = [
    { label: 'Activate', show: detail.status === 'provisioning' || detail.status === 'suspended', run: () => { setBusy('activate'); return api.activateTenant(detail.tenantId).then(onReload).finally(() => setBusy(null)) } },
    { label: 'Suspend', show: detail.status === 'active', run: () => { setBusy('suspend'); return api.suspendTenant(detail.tenantId).then(onReload).finally(() => setBusy(null)) } },
    { label: 'Reactivate', show: detail.status === 'suspended', run: () => { setBusy('reactivate'); return api.reactivateTenant(detail.tenantId).then(onReload).finally(() => setBusy(null)) } },
    { label: 'Archive', show: detail.status === 'active' || detail.status === 'suspended', run: () => { setBusy('archive'); return api.archiveTenant(detail.tenantId).then(onReload).finally(() => setBusy(null)) } },
  ]

  return <div className='admin-page'>
    <ConfirmDialog confirmation={confirmation} onCancel={() => setConfirmation(null)} onConfirm={async item => { setConfirmation(null); await item.run() }} />

    <header className='admin-detail-header'>
      <div>
        <div className='admin-breadcrumbs'><Link href='/admin/tenants' className='breadcrumb-link'>Tenants</Link><span>›</span><span>{detail.tenantId}</span></div>
        <h1>{detail.administrativeMetadata?.displayName ?? detail.tenantId}</h1>
        <p className='admin-mono'>{detail.tenantId}</p>
        <div className='admin-chip-row'>
          <StatusBadge status={detail.status} />
          <span className='pill'>Revision {detail.revision}</span>
          <span className='pill'>Updated {formatAdminDate(detail.lifecycle?.updatedAt)}</span>
          <span className='pill'>Owner {ownerId ?? 'unassigned'}</span>
        </div>
      </div>
      <div className='admin-stack'>
        {lifecycleButtons.filter(item => item.show).map(item => <button key={item.label} type='button' className='button' disabled={busy === item.label.toLowerCase()} onClick={() => setConfirmation({ title: item.label + ' tenant', message: 'Apply ' + item.label.toLowerCase() + ' to tenant ' + detail.tenantId + '?', run: item.run })}>{item.label}</button>)}
      </div>
    </header>

    <nav className='admin-tabs' aria-label='Tenant detail sections'>
      {TABS.map(tab => <button key={tab} type='button' className={classNames('admin-tab', currentTab === tab && 'active')} onClick={() => onNavigate(toTenantPath(detail.tenantId, tab))}>{tab}</button>)}
    </nav>

    <main className='admin-detail-body'>
      {currentTab === 'overview' && <OverviewTab detail={detail} />}
      {currentTab === 'members' && <MembersTab api={api} detail={detail} onReload={onReload} onBusy={setBusy} busy={busy} onConfirm={setConfirmation} />}
      {currentTab === 'governance' && <GovernanceTab api={api} detail={detail} onReload={onReload} onBusy={setBusy} busy={busy} />}
      {currentTab === 'entitlements' && <EntitlementsTab api={api} detail={detail} onReload={onReload} onBusy={setBusy} busy={busy} onConfirm={setConfirmation} />}
      {currentTab === 'limits' && <LimitsTab api={api} detail={detail} onReload={onReload} onBusy={setBusy} busy={busy} onConfirm={setConfirmation} />}
      {currentTab === 'audit' && <AuditTab api={api} detail={detail} />}
    </main>
  </div>
}

export function TenantAdministrationApp() {
  const pathname = useSpaPathname()
  const route = useMemo(() => parseAdminRoute(pathname), [pathname])
  const [context, setContext] = useAdminContext()
  const api = useApi(context)
  const listPage = useResource(() => api.listTenants(), [api, context.actorId, context.actorType, context.authenticated, context.tenantId, context.wallet, route.kind === 'list'])
  const detailPage = useResource(() => route.kind === 'detail' ? api.getTenant(route.tenantId) : Promise.resolve(null as TenantAdminDetail | null), [api, context.actorId, context.actorType, context.authenticated, context.tenantId, context.wallet, route.kind, route.kind === 'detail' ? route.tenantId : ''])

  useEffect(() => {
    if (route.kind === 'list' && !pathname.startsWith('/admin/tenants')) navigate('/admin/tenants')
  }, [pathname, route.kind])

  return <div className='admin-app'>
    <header className='admin-shell'>
      <div>
        <span className='eyebrow'>ACS CONTROL PLANE</span>
        <h1>Tenant Administration</h1>
        <p>Administrative UX over the governed Product API.</p>
      </div>
      <div className='admin-shell__actions'>
        <Link href='/'><span>Public site</span></Link>
        <Link href='/admin/tenants'><span>Tenant list</span></Link>
      </div>
    </header>

    <ContextPanel context={context} setContext={setContext} />

    {route.kind === 'list' ? (
      listPage.loading ? <div className='admin-grid'>{Array.from({ length: 4 }, (_, index) => <div key={index} className='admin-skeleton' />)}</div> : listPage.error ? <ErrorState error={listPage.error} /> : <TenantListPage api={api} context={context} onOpenTenant={tenantId => navigate(toTenantPath(tenantId))} />
    ) : detailPage.loading ? <div className='admin-grid'>{Array.from({ length: 3 }, (_, index) => <div key={index} className='admin-skeleton' />)}</div> : detailPage.error ? <ErrorState error={detailPage.error} onRetry={detailPage.reload} /> : detailPage.data ? <TenantDetailPage api={api} detail={detailPage.data} tab={route.kind === 'detail' ? route.tab : 'overview'} onReload={detailPage.reload} onNavigate={navigate} /> : <EmptyState title='Tenant unavailable' message='The selected tenant could not be loaded.' />}
  </div>
}
