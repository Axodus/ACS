import * as React from "react";
import * as Router from "react-router-dom";
import * as Api from "../../api/product-api";
import * as Shared from "../../shared";

export function CompositionOverview() {
  const { data: summary, loadState, loadError, stale, refresh } = Shared.useOperationalSummary<Api.CompositionSummary>(
    () => Api.productApi.getCompositionSummary(),
    "Unable to load composition summary from Product API",
    data => data.stale,
  );
  const { data: agents } = Shared.useOperationalSummary<Api.AgentListItem[]>(
    () => Api.productApi.listAgents(),
    "Unable to load agents for composition links",
    () => false,
  );

  const cardState = (count: number | undefined): Shared.DashboardCardState => {
    if (!summary && loadState === "loading") return "loading";
    if (!summary && loadState === "error") return "error";
    if (summary && loadState === "refreshing") return "refreshing";
    return count !== undefined && count > 0 ? "ready" : "empty";
  };
  const signalCount = (summary?.warningCount ?? 0) + (summary?.missingRequirementCount ?? 0) + (summary?.conflictCount ?? 0);
  const checkedAt = summary ? new Date(summary.checkedAt).toLocaleTimeString() : "--";

  return <>
    <Shared.DomainHeader domain="Capabilities" title="Composition" description="Operational summary of the elements that form an Agent, sourced from the Product API." actions={<button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadError ? "Retry" : loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>} />
    <Shared.OperationalModeNotice guardrails={summary?.guardrails} />
    {stale && <div className="stale-banner" role="status">Showing a stale composition snapshot. Refresh to recover live state.</div>}
    {loadState === "refreshing" && <div className="refresh-banner" role="status">Refreshing composition...</div>}
    {loadError && <div className="error-banner" role="alert">{loadError}</div>}
    <div className="composition-grid">
      <Shared.CompositionCard title="Roles" meta="Role catalog and revisions" count={summary?.roleCount} state={cardState(summary?.roleCount)} to="/roles" />
      <Shared.CompositionCard title="Profiles" meta="Profile catalog and OpenClaw state" count={summary?.profileCount} state={cardState(summary?.profileCount)} to="/profiles" />
      <Shared.CompositionCard title="Capabilities" meta="Capability registry" count={summary?.capabilityCount} state={cardState(summary?.capabilityCount)} to="/capabilities" />
      <Shared.CompositionCard title="Skills" meta="Installed and assigned skills" count={summary?.skillCount} state={cardState(summary?.skillCount)} to="/skills" />
      <Shared.CompositionCard title="Tools" meta="Assigned and available tools" count={summary?.toolCount} state={cardState(summary?.toolCount)} to="/plugins" />
      <Shared.CompositionCard title="Plugins" meta="Plugin packages and sources" count={summary?.pluginCount} state={cardState(summary?.pluginCount)} to="/plugins" />
      <Shared.CompositionCard title="Engines" meta="Engine registry" count={summary?.engineCount} state={cardState(summary?.engineCount)} to="/engines" />
      <Shared.CompositionCard title="Providers" meta="Provider registry and credentials" count={summary?.providerCount} state={cardState(summary?.providerCount)} to="/engines" />
      <Shared.CompositionCard title="Models" meta="Model catalog" count={summary?.modelCount} state={cardState(summary?.modelCount)} to="/engines" />
    </div>
    <div className="dashboard-grid composition-detail-grid">
      <section className="panel">
        <div className="panel-head"><div><h2>Composition health</h2><p>Operational signals from the Product API</p></div><Shared.Badge tone={signalCount > 0 ? "warn" : "good"}>{signalCount > 0 ? "attention" : "clean"}</Shared.Badge></div>
        <div className="summary-list card-body">
          <Shared.SummaryRow label="Warnings" value={summary?.warningCount ?? 0} tone={(summary?.warningCount ?? 0) > 0 ? "warn" : "good"} />
          <Shared.SummaryRow label="Missing requirements" value={summary?.missingRequirementCount ?? 0} tone={(summary?.missingRequirementCount ?? 0) > 0 ? "warn" : "good"} />
          <Shared.SummaryRow label="Conflicts" value={summary?.conflictCount ?? 0} tone={(summary?.conflictCount ?? 0) > 0 ? "warn" : "good"} />
          <Shared.SummaryRow label="Checked" value={checkedAt} />
        </div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Agent compositions</h2><p>Convergence point for every composition block</p></div></div>
        <div className="panel-body">
          {!agents
            ? <div className="state-line">Loading agent compositions...</div>
            : agents.length === 0
              ? <div className="state-line empty">No agents registered.</div>
              : <div className="agent-composition-links">
                {agents.map(agent => (
                  <Router.Link className="agent-composition-link" to={`/agents/${agent.agentId}/composition`} key={agent.agentId}>
                    <div><b>{agent.name}</b><small className="mono">{agent.agentId}</small></div>
                    <Shared.Badge tone={agent.compositionSummary.ready ? "good" : "warn"}>{agent.compositionSummary.ready ? "ready" : `${agent.compositionSummary.errorCount} errors`}</Shared.Badge>
                  </Router.Link>
                ))}
              </div>}
        </div>
      </section>
    </div>
  </>;
}

export function AgentCompositionView() {
  const { agentId } = Router.useParams();
  if (!agentId) return <Router.Navigate to="/agents" replace />;
  return <AgentCompositionSurface key={agentId} agentId={agentId} />;
}

function AgentCompositionSurface({ agentId }: { agentId: string }) {
  const { data: composition, loadState, loadError, stale, refresh } = Shared.useOperationalSummary<Api.AgentCompositionDetail>(
    () => Api.productApi.getAgentComposition(agentId),
    "Unable to load agent composition from Product API",
    data => data.stale,
  );

  if (loadState === "loading" && !composition) return <><Router.Link className="back" to={`/agents/${agentId}`}>← Agent</Router.Link><Shared.CatalogLoading message="Loading agent composition..." /></>;
  if (loadState === "error" && !composition) return <><Router.Link className="back" to={`/agents/${agentId}`}>← Agent</Router.Link><Shared.CatalogError message={loadError ?? "Agent composition not found"} /></>;
  if (!composition) return <div className="empty-state">Agent composition not found</div>;

  const compat = composition.compatibilitySummary;
  return <>
    <Router.Link className="back" to={`/agents/${agentId}`}>← Agent detail</Router.Link>
    {loadError && <div className="error-banner" role="alert">{loadError}</div>}
    {stale && <div className="stale-banner" role="status">Showing a stale composition snapshot. Refresh to recover live state.</div>}
    {loadState === "refreshing" && <div className="refresh-banner" role="status">Refreshing agent composition...</div>}
    <header className="detail-head">
      <div className="detail-id">
        <div>
          <div className="title-status"><h1>{composition.agentName}</h1><Shared.Badge tone={compat.ready ? "good" : "warn"}>{compat.ready ? "compatible" : "attention"}</Shared.Badge></div>
          <p className="mono">{composition.agentId} · current revision r{composition.currentRevisionId}</p>
        </div>
      </div>
      <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
    </header>
    <div className="guardrail-banner" role="note"><span>Inspection mode</span><span>Sandbox only</span><span>Read-only</span><span>Composition governed by Product API</span></div>
    <div className="detail-grid">
      <section className="panel">
        <div className="panel-head"><div><h2>Role</h2><p>Active role on this Agent</p></div>{composition.roleSummary && <Shared.Badge tone="good">assigned</Shared.Badge>}</div>
        <div className="panel-body">
          {composition.roleSummary
            ? <dl className="config-list">
              <div><dt>Role</dt><dd><Router.Link className="surface-link" to={`/roles/${composition.roleSummary.roleId}`}>{composition.roleSummary.name}</Router.Link></dd></div>
              <div><dt>Role ID</dt><dd className="mono">{composition.roleSummary.roleId}</dd></div>
              <div><dt>Revision</dt><dd className="mono">r{composition.roleSummary.revision}</dd></div>
              <div><dt>Shared.Status</dt><dd><Shared.Status status={composition.roleSummary.status} /></dd></div>
            </dl>
            : <div className="state-line empty">No role assigned to this Agent.</div>}
        </div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Profile</h2><p>Active profile on this Agent</p></div>{composition.profileSummary && <Shared.Badge tone="good">assigned</Shared.Badge>}</div>
        <div className="panel-body">
          {composition.profileSummary
            ? <dl className="config-list">
              <div><dt>Profile</dt><dd><Router.Link className="surface-link" to={`/profiles/${composition.profileSummary.profileId}`}>{composition.profileSummary.name}</Router.Link></dd></div>
              <div><dt>Profile ID</dt><dd className="mono">{composition.profileSummary.profileId}</dd></div>
              <div><dt>Revision</dt><dd className="mono">r{composition.profileSummary.revision}</dd></div>
              <div><dt>OpenClaw compatible</dt><dd>{composition.profileSummary.openClawCompatible ? "Yes" : "No"}</dd></div>
              <div><dt>Legacy profile visible</dt><dd>{composition.profileSummary.legacyProfileVisible ? "Yes" : "No"}</dd></div>
            </dl>
            : <div className="state-line empty">No profile assigned to this Agent.</div>}
        </div>
      </section>
      <section className="panel wide">
        <div className="panel-head"><div><h2>Effective capabilities</h2><p>Capability source map from the Product API — never recomputed in the UI</p></div><Shared.Badge tone="good">{composition.effectiveCapabilities.length}</Shared.Badge></div>
        <div className="panel-body"><Shared.SourceMap entries={composition.effectiveCapabilities} /></div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Skills</h2><p>Assigned and available skills</p></div><Shared.Badge tone={composition.skills.length > 0 ? "good" : "muted"}>{composition.skills.length}</Shared.Badge></div>
        <div className="panel-body">
          {composition.skills.length === 0
            ? <div className="state-line empty">No skills on this Agent.</div>
            : <div className="catalog-list compact">
              {composition.skills.map(skill => (
                <Router.Link className="catalog-row" to={`/skills/${skill.skillId}`} key={skill.skillId}>
                  <div className="catalog-row-main"><b>{skill.name}</b><small className="mono">{skill.skillId}</small></div>
                  <div className="catalog-badges">
                    {skill.assigned && <Shared.Badge tone="good">assigned</Shared.Badge>}
                    {skill.installed && <Shared.Badge tone="good">installed</Shared.Badge>}
                    <Shared.Badge tone={skill.compatibility === "compatible" ? "good" : "warn"}>{skill.compatibility}</Shared.Badge>
                  </div>
                </Router.Link>
              ))}
            </div>}
        </div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Tools</h2><p>Assigned and available tools</p></div><Shared.Badge tone={composition.tools.length > 0 ? "good" : "muted"}>{composition.tools.length}</Shared.Badge></div>
        <div className="panel-body">
          {composition.tools.length === 0
            ? <div className="state-line empty">No tools on this Agent.</div>
            : <div className="catalog-list compact">
              {composition.tools.map(tool => (
                <Router.Link className="catalog-row" to={`/tools/${tool.toolId}`} key={tool.toolId}>
                  <div className="catalog-row-main"><b>{tool.name}</b><small className="mono">{tool.toolId}</small></div>
                  <div className="catalog-badges">
                    {tool.assigned && <Shared.Badge tone="good">assigned</Shared.Badge>}
                    <Shared.Badge tone={tool.availability === "available" ? "good" : "warn"}>{tool.availability}</Shared.Badge>
                  </div>
                </Router.Link>
              ))}
            </div>}
        </div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Plugins</h2><p>Plugin state on this Agent</p></div><Shared.Badge tone={composition.plugins.length > 0 ? "good" : "muted"}>{composition.plugins.length}</Shared.Badge></div>
        <div className="panel-body">
          {composition.plugins.length === 0
            ? <div className="state-line empty">No plugins on this Agent. Plugin installations are not supported in this milestone.</div>
            : <div className="catalog-list compact">
              {composition.plugins.map(plugin => (
                <div className="catalog-row" key={plugin.pluginId}>
                  <div className="catalog-row-main"><b>{plugin.name}</b><small className="mono">{plugin.pluginId}</small></div>
                  <div className="catalog-badges">
                    {plugin.installed && <Shared.Badge tone="good">installed</Shared.Badge>}
                    {plugin.failureState !== "none" && <Shared.Badge tone="warn">failure</Shared.Badge>}
                    <Shared.Badge tone={plugin.compatibility === "compatible" ? "good" : "warn"}>{plugin.compatibility}</Shared.Badge>
                  </div>
                </div>
              ))}
            </div>}
        </div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Engine / Provider / Model</h2><p>Selected composition references</p></div>{composition.engine && <Shared.Badge tone="good">selected</Shared.Badge>}</div>
        <div className="panel-body">
          <dl className="config-list">
            <div><dt>Engine</dt><dd>{composition.engine ? <Router.Link className="surface-link" to={`/engines/${composition.engine.id}`}>{composition.engine.name}</Router.Link> : "none"}</dd></div>
            <div><dt>Provider</dt><dd>{composition.provider ? <Router.Link className="surface-link" to={`/providers/${composition.provider.id}`}>{composition.provider.name}</Router.Link> : "none"}</dd></div>
            <div><dt>Model</dt><dd className="mono">{composition.model ? composition.model.id : "none"}</dd></div>
          </dl>
          <p className="panel-note">Selection actions are governed by the Product API and are not supported in this milestone.</p>
        </div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Compatibility summary</h2><p>From the Product API — never recomputed in the UI</p></div><Shared.Badge tone={compat.ready ? "good" : "warn"}>{compat.ready ? "ready" : "not ready"}</Shared.Badge></div>
        <dl className="config-list">
          <div><dt>Missing requirements</dt><dd>{compat.missingRequirements.length}</dd></div>
          <div><dt>Conflicts</dt><dd>{compat.conflicts.length}</dd></div>
          <div><dt>Warnings</dt><dd>{compat.warnings.length}</dd></div>
          <div><dt>Checked</dt><dd><Shared.Time value={compat.checkedAt} /></dd></div>
        </dl>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Readiness summary</h2><p>Reference only — readiness truth stays in the Product API</p></div><Shared.ReadinessBadge summary={composition.readinessSummary} /></div>
        <dl className="config-list">
          <div><dt>State</dt><dd>{composition.readinessSummary.state}</dd></div>
          <div><dt>Blockers</dt><dd>{composition.readinessSummary.blockerCount}</dd></div>
          <div><dt>Warnings</dt><dd>{composition.readinessSummary.warningCount}</dd></div>
        </dl>
      </section>
      <Shared.FindingSection title="Missing requirements" meta="Required but absent composition elements" findings={composition.missingRequirements} emptyMessage="No missing requirements reported." />
      <Shared.FindingSection title="Conflicts" meta="Incompatible or conflicting composition elements" findings={composition.conflicts} emptyMessage="No conflicts reported." />
      <Shared.FindingSection title="Compatibility warnings" meta="Non-blocking compatibility findings" findings={compat.warnings} emptyMessage="No compatibility warnings reported." />
      <Shared.UnsupportedActionsPanel actions={composition.availableActions} note="Composition mutations on this Agent" />
    </div>
  </>;
}

export function RoleCatalog() {
  const { data: roles, loadState, loadError, stale, refresh } = Shared.useOperationalSummary<Api.RoleSummary[]>(
    () => Api.productApi.listRoles(),
    "Unable to load roles from Product API",
    () => false,
  );
  return <Shared.CatalogPage eyebrow="ROLE & PROFILE COMPOSITION" title="Roles" description="Role catalog with capabilities, revisions and usage from the Product API." loadState={loadState} loadError={loadError} stale={stale} refresh={refresh}>
    {loadState === "loading" && !roles && <Shared.CatalogLoading message="Loading roles..." />}
    {loadState === "error" && !roles && <Shared.CatalogError message={loadError ?? "Unable to load roles"} />}
    {roles && roles.length === 0 && <section className="panel"><div className="empty-state">No roles registered in the Product API.</div></section>}
    {roles && roles.length > 0 && <section className="catalog-list">
      {roles.map(role => (
        <Router.Link className="catalog-row" to={`/roles/${role.roleId}`} key={role.roleId}>
          <div className="catalog-row-main"><b>{role.name}</b><small className="mono">{role.roleId}</small><p>{role.description}</p></div>
          <div className="catalog-badges">
            <Shared.Status status={role.status} />
            <span className="tag mono">r{role.revision}</span>
            <span className="catalog-count">{role.capabilities.length} capabilities</span>
            <span className="catalog-count">{role.usageCount} agents</span>
          </div>
        </Router.Link>
      ))}
    </section>}
  </Shared.CatalogPage>;
}

export function RoleDetail() {
  const { roleId } = Router.useParams();
  if (!roleId) return <Router.Navigate to="/roles" replace />;
  return <RoleDetailSurface key={roleId} roleId={roleId} />;
}

function RoleDetailSurface({ roleId }: { roleId: string }) {
  const { data: role, loadState, loadError, stale, refresh } = Shared.useOperationalSummary<Api.RoleSummary>(
    () => Api.productApi.getRoleDetail(roleId),
    "Unable to load role from Product API",
    () => false,
  );
  if (loadState === "loading" && !role) return <><Router.Link className="back" to="/roles">← Roles</Router.Link><Shared.CatalogLoading message="Loading role..." /></>;
  if (loadState === "error" && !role) return <><Router.Link className="back" to="/roles">← Roles</Router.Link><Shared.CatalogError message={loadError ?? "Role not found"} /></>;
  if (!role) return <div className="empty-state">Role not found</div>;
  return <>
    <Router.Link className="back" to="/roles">← Roles</Router.Link>
    {loadError && <div className="error-banner" role="alert">{loadError}</div>}
    {stale && <div className="stale-banner" role="status">Showing a stale role snapshot. Refresh to recover live state.</div>}
    {loadState === "refreshing" && <div className="refresh-banner" role="status">Refreshing role...</div>}
    <header className="detail-head">
      <div className="detail-id">
        <div>
          <div className="title-status"><h1>{role.name}</h1><Shared.Status status={role.status} /></div>
          <p className="mono">{role.roleId} · revision r{role.revision}</p>
        </div>
      </div>
      <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
    </header>
    <div className="guardrail-banner" role="note"><span>Inspection mode</span><span>Sandbox only</span><span>Read-only</span><span>Composition governed by Product API</span></div>
    <div className="detail-grid">
      <section className="panel">
        <div className="panel-head"><div><h2>Role</h2><p>Catalog entry from the Product API</p></div></div>
        <dl className="config-list">
          <div><dt>Role ID</dt><dd className="mono">{role.roleId}</dd></div>
          <div><dt>Name</dt><dd>{role.name}</dd></div>
          <div><dt>Description</dt><dd>{role.description}</dd></div>
          <div><dt>Revision</dt><dd className="mono">r{role.revision}</dd></div>
          <div><dt>Shared.Status</dt><dd><Shared.Status status={role.status} /></dd></div>
          <div><dt>Used by agents</dt><dd>{role.usageCount}</dd></div>
        </dl>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Role capabilities</h2><p>Capabilities granted by this role</p></div><Shared.Badge tone={role.capabilities.length > 0 ? "good" : "muted"}>{role.capabilities.length}</Shared.Badge></div>
        <div className="panel-body"><Shared.IdList label="Capabilities" ids={role.capabilities} /></div>
      </section>
      <Shared.UnsupportedActionsPanel actions={role.availableActions} note="Role assignment and adoption" />
    </div>
  </>;
}

export function ProfileCatalog() {
  const { data: profiles, loadState, loadError, stale, refresh } = Shared.useOperationalSummary<Api.ProfileSummary[]>(
    () => Api.productApi.listProfiles(),
    "Unable to load profiles from Product API",
    () => false,
  );
  return <Shared.CatalogPage eyebrow="ROLE & PROFILE COMPOSITION" title="Profiles" description="Profile catalog with sections, OpenClaw-compatible state and legacy visibility from the Product API." loadState={loadState} loadError={loadError} stale={stale} refresh={refresh}>
    {loadState === "loading" && !profiles && <Shared.CatalogLoading message="Loading profiles..." />}
    {loadState === "error" && !profiles && <Shared.CatalogError message={loadError ?? "Unable to load profiles"} />}
    {profiles && profiles.length === 0 && <section className="panel"><div className="empty-state">No profiles registered in the Product API.</div></section>}
    {profiles && profiles.length > 0 && <section className="catalog-list">
      {profiles.map(profile => (
        <Router.Link className="catalog-row" to={`/profiles/${profile.profileId}`} key={profile.profileId}>
          <div className="catalog-row-main"><b>{profile.name}</b><small className="mono">{profile.profileId}</small><p>{profile.description}</p></div>
          <div className="catalog-badges">
            <Shared.Status status={profile.status} />
            {profile.openClawCompatible && <Shared.Badge tone="good">openclaw-compatible</Shared.Badge>}
            {profile.legacyProfileVisible && <Shared.Badge tone="warn">legacy visible</Shared.Badge>}
            <span className="tag mono">r{profile.revision}</span>
            <span className="catalog-count">{profile.sections.length} sections</span>
            <span className="catalog-count">{profile.usageCount} agents</span>
          </div>
        </Router.Link>
      ))}
    </section>}
  </Shared.CatalogPage>;
}

export function ProfileDetail() {
  const { profileId } = Router.useParams();
  if (!profileId) return <Router.Navigate to="/profiles" replace />;
  return <ProfileDetailSurface key={profileId} profileId={profileId} />;
}

function ProfileDetailSurface({ profileId }: { profileId: string }) {
  const { data: profile, loadState, loadError, stale, refresh } = Shared.useOperationalSummary<Api.ProfileSummary>(
    () => Api.productApi.getProfileDetail(profileId),
    "Unable to load profile from Product API",
    () => false,
  );
  if (loadState === "loading" && !profile) return <><Router.Link className="back" to="/profiles">← Profiles</Router.Link><Shared.CatalogLoading message="Loading profile..." /></>;
  if (loadState === "error" && !profile) return <><Router.Link className="back" to="/profiles">← Profiles</Router.Link><Shared.CatalogError message={loadError ?? "Profile not found"} /></>;
  if (!profile) return <div className="empty-state">Profile not found</div>;
  return <>
    <Router.Link className="back" to="/profiles">← Profiles</Router.Link>
    {loadError && <div className="error-banner" role="alert">{loadError}</div>}
    {stale && <div className="stale-banner" role="status">Showing a stale profile snapshot. Refresh to recover live state.</div>}
    {loadState === "refreshing" && <div className="refresh-banner" role="status">Refreshing profile...</div>}
    <header className="detail-head">
      <div className="detail-id">
        <div>
          <div className="title-status"><h1>{profile.name}</h1><Shared.Status status={profile.status} /></div>
          <p className="mono">{profile.profileId} · revision r{profile.revision}</p>
        </div>
      </div>
      <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
    </header>
    <div className="guardrail-banner" role="note"><span>Inspection mode</span><span>Sandbox only</span><span>Read-only</span><span>Composition governed by Product API</span></div>
    <div className="detail-grid">
      <section className="panel">
        <div className="panel-head"><div><h2>Profile</h2><p>Catalog entry from the Product API</p></div></div>
        <dl className="config-list">
          <div><dt>Profile ID</dt><dd className="mono">{profile.profileId}</dd></div>
          <div><dt>Name</dt><dd>{profile.name}</dd></div>
          <div><dt>Description</dt><dd>{profile.description}</dd></div>
          <div><dt>Revision</dt><dd className="mono">r{profile.revision}</dd></div>
          <div><dt>Shared.Status</dt><dd><Shared.Status status={profile.status} /></dd></div>
          <div><dt>OpenClaw compatible</dt><dd>{profile.openClawCompatible ? "Yes" : "No"}</dd></div>
          <div><dt>Legacy profile visible</dt><dd>{profile.legacyProfileVisible ? "Yes" : "No"}</dd></div>
          <div><dt>Used by agents</dt><dd>{profile.usageCount}</dd></div>
        </dl>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Profile sections</h2><p>Composition sections carried by this profile</p></div><Shared.Badge tone={profile.sections.length > 0 ? "good" : "muted"}>{profile.sections.length}</Shared.Badge></div>
        <div className="panel-body">
          {profile.sections.length === 0
            ? <div className="state-line empty">No sections reported.</div>
            : <div className="catalog-list compact">{profile.sections.map(section => <div className="catalog-row" key={section}><div className="catalog-row-main"><b>{section}</b></div></div>)}</div>}
        </div>
      </section>
      <Shared.UnsupportedActionsPanel actions={profile.availableActions} note="Profile assignment and adoption" />
    </div>
  </>;
}

export function CapabilityCatalog() {
  const { data: capabilities, loadState, loadError, stale, refresh } = Shared.useOperationalSummary<Api.CapabilitySummary[]>(
    () => Api.productApi.listCapabilities(),
    "Unable to load capabilities from Product API",
    () => false,
  );
  const [source, setSource] = React.useState("all");
  const [type, setType] = React.useState("all");
  const [status, setStatus] = React.useState("all");

  const sources = Array.from(new Set((capabilities ?? []).map(capability => capability.source))).sort();
  const types = Array.from(new Set((capabilities ?? []).map(capability => capability.type))).sort();
  const statuses = Array.from(new Set((capabilities ?? []).map(capability => capability.status))).sort();
  const filtered = (capabilities ?? []).filter(capability =>
    (source === "all" || capability.source === source)
    && (type === "all" || capability.type === type)
    && (status === "all" || capability.status === status));

  return <Shared.CatalogPage eyebrow="CAPABILITY MODEL" title="Capabilities" description="Capability registry from the Product API. Filters and badges are presentation only — effective capability truth is never recomputed here." loadState={loadState} loadError={loadError} stale={stale} refresh={refresh}>
    {loadState === "loading" && !capabilities && <Shared.CatalogLoading message="Loading capabilities..." />}
    {loadState === "error" && !capabilities && <Shared.CatalogError message={loadError ?? "Unable to load capabilities"} />}
    {capabilities && capabilities.length === 0 && <section className="panel"><div className="empty-state">No capabilities registered in the Product API.</div></section>}
    {capabilities && capabilities.length > 0 && <>
      <div className="toolbar">
        <select className="filter select-filter" value={source} onChange={e => setSource(e.target.value)} aria-label="Filter by source">
          <option value="all">All sources</option>
          {sources.map(item => <option value={item} key={item}>{item}</option>)}
        </select>
        <select className="filter select-filter" value={type} onChange={e => setType(e.target.value)} aria-label="Filter by type">
          <option value="all">All types</option>
          {types.map(item => <option value={item} key={item}>{item}</option>)}
        </select>
        <select className="filter select-filter" value={status} onChange={e => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="all">All statuses</option>
          {statuses.map(item => <option value={item} key={item}>{item}</option>)}
        </select>
        <span className="env-chip">{filtered.length} of {capabilities.length}</span>
      </div>
      {filtered.length === 0
        ? <section className="panel"><div className="empty-state">No capabilities match the selected filters.</div></section>
        : <section className="catalog-list">
          {filtered.map(capability => (
            <Router.Link className="catalog-row" to={`/capabilities/${capability.capabilityId}`} key={capability.capabilityId}>
              <div className="catalog-row-main"><b>{capability.name}</b><small className="mono">{capability.capabilityId}</small></div>
              <div className="catalog-badges">
                <Shared.Status status={capability.status} />
                <Shared.Badge tone="muted">{capability.source}</Shared.Badge>
                <Shared.Badge tone="muted">{capability.type}</Shared.Badge>
                {capability.level && <Shared.Badge tone="muted">{capability.level}</Shared.Badge>}
                <span className="catalog-count">{capability.usageCount} agents</span>
              </div>
            </Router.Link>
          ))}
        </section>}
    </>}
  </Shared.CatalogPage>;
}

export function CapabilityDetail() {
  const { capabilityId } = Router.useParams();
  if (!capabilityId) return <Router.Navigate to="/capabilities" replace />;
  return <CapabilityDetailSurface key={capabilityId} capabilityId={capabilityId} />;
}

function CapabilityDetailSurface({ capabilityId }: { capabilityId: string }) {
  const { data: capability, loadState, loadError, stale, refresh } = Shared.useOperationalSummary<Api.CapabilitySummary>(
    () => Api.productApi.getCapabilityDetail(capabilityId),
    "Unable to load capability from Product API",
    () => false,
  );
  if (loadState === "loading" && !capability) return <><Router.Link className="back" to="/capabilities">← Capabilities</Router.Link><Shared.CatalogLoading message="Loading capability..." /></>;
  if (loadState === "error" && !capability) return <><Router.Link className="back" to="/capabilities">← Capabilities</Router.Link><Shared.CatalogError message={loadError ?? "Capability not found"} /></>;
  if (!capability) return <div className="empty-state">Capability not found</div>;
  return <>
    <Router.Link className="back" to="/capabilities">← Capabilities</Router.Link>
    {loadError && <div className="error-banner" role="alert">{loadError}</div>}
    {stale && <div className="stale-banner" role="status">Showing a stale capability snapshot. Refresh to recover live state.</div>}
    {loadState === "refreshing" && <div className="refresh-banner" role="status">Refreshing capability...</div>}
    <header className="detail-head">
      <div className="detail-id">
        <div>
          <div className="title-status"><h1>{capability.name}</h1><Shared.Status status={capability.status} /></div>
          <p className="mono">{capability.capabilityId}</p>
        </div>
      </div>
      <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
    </header>
    <div className="guardrail-banner" role="note"><span>Inspection mode</span><span>Sandbox only</span><span>Read-only</span><span>Composition governed by Product API</span></div>
    <div className="detail-grid">
      <section className="panel">
        <div className="panel-head"><div><h2>Capability</h2><p>Registry entry from the Product API</p></div></div>
        <dl className="config-list">
          <div><dt>Capability ID</dt><dd className="mono">{capability.capabilityId}</dd></div>
          <div><dt>Name</dt><dd>{capability.name}</dd></div>
          <div><dt>Source</dt><dd>{capability.source}</dd></div>
          <div><dt>Type</dt><dd>{capability.type}</dd></div>
          <div><dt>Level</dt><dd>{capability.level ?? "—"}</dd></div>
          <div><dt>Shared.Status</dt><dd><Shared.Status status={capability.status} /></dd></div>
          <div><dt>Used by agents</dt><dd>{capability.usageCount}</dd></div>
        </dl>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Requirements</h2><p>Prerequisites reported by the Product API</p></div><Shared.Badge tone={capability.requirements.length > 0 ? "warn" : "good"}>{capability.requirements.length}</Shared.Badge></div>
        <div className="panel-body"><Shared.IdList label="Requirements" ids={capability.requirements} /></div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Conflicts</h2><p>Conflicting capabilities reported by the Product API</p></div><Shared.Badge tone={capability.conflicts.length > 0 ? "warn" : "good"}>{capability.conflicts.length}</Shared.Badge></div>
        <div className="panel-body"><Shared.IdList label="Conflicts" ids={capability.conflicts} /></div>
      </section>
    </div>
  </>;
}

export function SkillCatalog() {
  const { data: skills, loadState, loadError, stale, refresh } = Shared.useOperationalSummary<Api.SkillSummary[]>(
    () => Api.productApi.listSkills(),
    "Unable to load skills from Product API",
    () => false,
  );
  return <Shared.CatalogPage eyebrow="SKILLS MANAGEMENT" title="Skills" description="Skill catalog with installed, assigned and compatibility state from the Product API." loadState={loadState} loadError={loadError} stale={stale} refresh={refresh}>
    {loadState === "loading" && !skills && <Shared.CatalogLoading message="Loading skills..." />}
    {loadState === "error" && !skills && <Shared.CatalogError message={loadError ?? "Unable to load skills"} />}
    {skills && skills.length === 0 && <section className="panel"><div className="empty-state">No skills registered in the Product API.</div></section>}
    {skills && skills.length > 0 && <section className="catalog-list">
      {skills.map(skill => (
        <Router.Link className="catalog-row" to={`/skills/${skill.skillId}`} key={skill.skillId}>
          <div className="catalog-row-main"><b>{skill.name}</b><small className="mono">{skill.skillId}</small><p>{skill.description}</p></div>
          <div className="catalog-badges">
            {skill.installed && <Shared.Badge tone="good">installed</Shared.Badge>}
            {skill.assigned && <Shared.Badge tone="good">assigned</Shared.Badge>}
            <Shared.Badge tone={skill.compatibility === "compatible" ? "good" : "warn"}>{skill.compatibility}</Shared.Badge>
            <span className="catalog-count">{skill.capabilities.length} capabilities</span>
            <span className="catalog-count">{skill.usageCount} agents</span>
          </div>
        </Router.Link>
      ))}
    </section>}
  </Shared.CatalogPage>;
}

export function SkillDetail() {
  const { skillId } = Router.useParams();
  if (!skillId) return <Router.Navigate to="/skills" replace />;
  return <SkillDetailSurface key={skillId} skillId={skillId} />;
}

function SkillDetailSurface({ skillId }: { skillId: string }) {
  const { data: skill, loadState, loadError, stale, refresh } = Shared.useOperationalSummary<Api.SkillSummary>(
    () => Api.productApi.getSkillDetail(skillId),
    "Unable to load skill from Product API",
    () => false,
  );
  if (loadState === "loading" && !skill) return <><Router.Link className="back" to="/skills">← Skills</Router.Link><Shared.CatalogLoading message="Loading skill..." /></>;
  if (loadState === "error" && !skill) return <><Router.Link className="back" to="/skills">← Skills</Router.Link><Shared.CatalogError message={loadError ?? "Skill not found"} /></>;
  if (!skill) return <div className="empty-state">Skill not found</div>;
  return <>
    <Router.Link className="back" to="/skills">← Skills</Router.Link>
    {loadError && <div className="error-banner" role="alert">{loadError}</div>}
    {stale && <div className="stale-banner" role="status">Showing a stale skill snapshot. Refresh to recover live state.</div>}
    {loadState === "refreshing" && <div className="refresh-banner" role="status">Refreshing skill...</div>}
    <header className="detail-head">
      <div className="detail-id">
        <div>
          <div className="title-status"><h1>{skill.name}</h1>{skill.installed && <Shared.Badge tone="good">installed</Shared.Badge>}{skill.assigned && <Shared.Badge tone="good">assigned</Shared.Badge>}</div>
          <p className="mono">{skill.skillId}</p>
        </div>
      </div>
      <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
    </header>
    <div className="guardrail-banner" role="note"><span>Inspection mode</span><span>Sandbox only</span><span>Read-only</span><span>Composition governed by Product API</span></div>
    <div className="detail-grid">
      <section className="panel">
        <div className="panel-head"><div><h2>Skill</h2><p>Catalog entry from the Product API</p></div></div>
        <dl className="config-list">
          <div><dt>Skill ID</dt><dd className="mono">{skill.skillId}</dd></div>
          <div><dt>Name</dt><dd>{skill.name}</dd></div>
          <div><dt>Description</dt><dd>{skill.description}</dd></div>
          <div><dt>Installed</dt><dd>{skill.installed ? "Yes" : "No"}</dd></div>
          <div><dt>Assigned</dt><dd>{skill.assigned ? "Yes" : "No"}</dd></div>
          <div><dt>Compatibility</dt><dd><Shared.Status status={skill.compatibility} /></dd></div>
          <div><dt>Used by agents</dt><dd>{skill.usageCount}</dd></div>
        </dl>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Skill capabilities</h2><p>Capabilities provided by this skill</p></div><Shared.Badge tone={skill.capabilities.length > 0 ? "good" : "muted"}>{skill.capabilities.length}</Shared.Badge></div>
        <div className="panel-body"><Shared.IdList label="Capabilities" ids={skill.capabilities} /></div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Requirements</h2><p>Prerequisites reported by the Product API</p></div><Shared.Badge tone={skill.requirements.length > 0 ? "warn" : "good"}>{skill.requirements.length}</Shared.Badge></div>
        <div className="panel-body"><Shared.IdList label="Requirements" ids={skill.requirements} /></div>
      </section>
      <Shared.UnsupportedActionsPanel actions={skill.availableActions} note="Skill assignment, unassignment, install and removal" />
    </div>
  </>;
}

export function ToolsPluginsCatalog() {
  const { data: tools, loadState, loadError, stale, refresh } = Shared.useOperationalSummary<Api.ToolSummary[]>(
    () => Api.productApi.listTools(),
    "Unable to load tools from Product API",
    () => false,
  );
  const { data: plugins, loadState: pluginsState, loadError: pluginsError } = Shared.useOperationalSummary<Api.PluginSummary[]>(
    () => Api.productApi.listPlugins(),
    "Unable to load plugins from Product API",
    () => false,
  );
  const { data: packages, loadState: packagesState, loadError: packagesError } = Shared.useOperationalSummary<Api.PluginPackage[]>(
    () => Api.productApi.listPluginPackages(),
    "Unable to load plugin packages from Product API",
    () => false,
  );
  const { data: sources, loadState: sourcesState, loadError: sourcesError } = Shared.useOperationalSummary<Api.PackageSource[]>(
    () => Api.productApi.listPackageSources(),
    "Unable to load package sources from Product API",
    () => false,
  );

  return <>
    <header className="domain-header">
      <div><p className="eyebrow">TOOLS & PLUGINS MANAGEMENT</p><h1>Tools & Plugins</h1><p>Tool catalog, plugin packages and package sources from the Product API.</p></div>
      <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadError ? "Retry" : loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
    </header>
    <div className="guardrail-banner" role="note"><span>Inspection mode</span><span>Sandbox only</span><span>Read-only</span><span>Composition governed by Product API</span></div>
    {stale && <div className="stale-banner" role="status">Showing a stale snapshot. Refresh to recover live state.</div>}
    {loadState === "refreshing" && <div className="refresh-banner" role="status">Refreshing tools and plugins...</div>}
    {loadError && <div className="error-banner" role="alert">{loadError}</div>}
    <section className="panel">
      <div className="panel-head"><div><h2>Tool catalog</h2><p>Assigned and available tools</p></div><Shared.Badge tone={tools && tools.length > 0 ? "good" : "muted"}>{tools?.length ?? 0}</Shared.Badge></div>
      {loadState === "loading" && !tools && <div className="state-line card-body">Loading tools...</div>}
      {loadState === "error" && !tools && <div className="state-line error card-body">Unable to load tools.</div>}
      {tools && tools.length === 0 && <div className="state-line empty card-body">No tools registered in the Product API.</div>}
      {tools && tools.length > 0 && <div className="catalog-list card-body">
        {tools.map(tool => (
          <Router.Link className="catalog-row" to={`/tools/${tool.toolId}`} key={tool.toolId}>
            <div className="catalog-row-main"><b>{tool.name}</b><small className="mono">{tool.toolId}</small><p>{tool.description}</p></div>
            <div className="catalog-badges">
              {tool.assigned && <Shared.Badge tone="good">assigned</Shared.Badge>}
              <Shared.Badge tone={tool.availability === "available" ? "good" : "warn"}>{tool.availability}</Shared.Badge>
              <span className="catalog-count">{tool.capabilities.length} capabilities</span>
              <span className="catalog-count">{tool.usageCount} agents</span>
            </div>
          </Router.Link>
        ))}
      </div>}
    </section>
    <div className="dashboard-grid composition-detail-grid">
      <section className="panel">
        <div className="panel-head"><div><h2>Plugin packages</h2><p>Package catalog from the Product API</p></div><Shared.Badge tone={packages && packages.length > 0 ? "good" : "muted"}>{packages?.length ?? 0}</Shared.Badge></div>
        <div className="panel-body">
          {packagesState === "loading" && !packages && <div className="state-line">Loading plugin packages...</div>}
          {packagesError && <div className="state-line error">{packagesError}</div>}
          {packages && packages.length === 0 && <div className="state-line empty">No plugin packages available. Plugin installation is unsupported in this milestone.</div>}
          {packages && packages.length > 0 && <div className="catalog-list compact">
            {packages.map(pkg => (
              <div className="catalog-row" key={pkg.packageId}>
                <div className="catalog-row-main"><b>{pkg.name}</b><small className="mono">{pkg.packageId}</small></div>
                <div className="catalog-badges">
                  <Shared.Badge tone="muted">{pkg.source}</Shared.Badge>
                  {pkg.version && <span className="tag mono">{pkg.version}</span>}
                  <Shared.Badge tone={pkg.status === "available" ? "good" : "warn"}>{pkg.status}</Shared.Badge>
                </div>
              </div>
            ))}
          </div>}
        </div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Package sources</h2><p>Plugin package sources</p></div><Shared.Badge tone={sources && sources.length > 0 ? "good" : "muted"}>{sources?.length ?? 0}</Shared.Badge></div>
        <div className="panel-body">
          {sourcesState === "loading" && !sources && <div className="state-line">Loading package sources...</div>}
          {sourcesError && <div className="state-line error">{sourcesError}</div>}
          {sources && sources.length === 0 && <div className="state-line empty">No package sources reported by the Product API.</div>}
          {sources && sources.length > 0 && <div className="catalog-list compact">
            {sources.map(source => (
              <div className="catalog-row" key={source.sourceId}>
                <div className="catalog-row-main"><b>{source.name}</b><small className="mono">{source.sourceId}</small></div>
                <div className="catalog-badges">
                  <Shared.Badge tone="muted">{source.type}</Shared.Badge>
                  <Shared.Badge tone={source.status === "available" ? "good" : "warn"}>{source.status}</Shared.Badge>
                </div>
              </div>
            ))}
          </div>}
        </div>
      </section>
    </div>
    <section className="panel">
      <div className="panel-head"><div><h2>Plugin installations</h2><p>Installed plugins on this workspace</p></div><Shared.Badge tone={plugins && plugins.length > 0 ? "good" : "muted"}>{plugins?.length ?? 0}</Shared.Badge></div>
      <div className="panel-body">
        {pluginsState === "loading" && !plugins && <div className="state-line">Loading plugin installations...</div>}
        {pluginsError && <div className="state-line error">{pluginsError}</div>}
        {plugins && plugins.length === 0 && <div className="state-line empty">No plugin installations. Install and remove actions are unsupported in this milestone.</div>}
        {plugins && plugins.length > 0 && <div className="catalog-list compact">
          {plugins.map(plugin => (
            <div className="catalog-row" key={plugin.pluginId}>
              <div className="catalog-row-main"><b>{plugin.name}</b><small className="mono">{plugin.pluginId} · {plugin.packageId}</small></div>
              <div className="catalog-badges">
                {plugin.installed && <Shared.Badge tone="good">installed</Shared.Badge>}
                {plugin.failureState !== "none" && <Shared.Badge tone="warn">{plugin.failureState}</Shared.Badge>}
                <Shared.Badge tone={plugin.compatibility === "compatible" ? "good" : "warn"}>{plugin.compatibility}</Shared.Badge>
                {plugin.dependencies.length > 0 && <Shared.Badge tone="warn">{plugin.dependencies.length} deps</Shared.Badge>}
              </div>
            </div>
          ))}
        </div>}
      </div>
    </section>
  </>;
}

export function ToolDetail() {
  const { toolId } = Router.useParams();
  if (!toolId) return <Router.Navigate to="/plugins" replace />;
  return <ToolDetailSurface key={toolId} toolId={toolId} />;
}

function ToolDetailSurface({ toolId }: { toolId: string }) {
  const { data: tool, loadState, loadError, stale, refresh } = Shared.useOperationalSummary<Api.ToolSummary>(
    () => Api.productApi.getToolDetail(toolId),
    "Unable to load tool from Product API",
    () => false,
  );
  if (loadState === "loading" && !tool) return <><Router.Link className="back" to="/plugins">← Tools & Plugins</Router.Link><Shared.CatalogLoading message="Loading tool..." /></>;
  if (loadState === "error" && !tool) return <><Router.Link className="back" to="/plugins">← Tools & Plugins</Router.Link><Shared.CatalogError message={loadError ?? "Tool not found"} /></>;
  if (!tool) return <div className="empty-state">Tool not found</div>;
  return <>
    <Router.Link className="back" to="/plugins">← Tools & Plugins</Router.Link>
    {loadError && <div className="error-banner" role="alert">{loadError}</div>}
    {stale && <div className="stale-banner" role="status">Showing a stale tool snapshot. Refresh to recover live state.</div>}
    {loadState === "refreshing" && <div className="refresh-banner" role="status">Refreshing tool...</div>}
    <header className="detail-head">
      <div className="detail-id">
        <div>
          <div className="title-status"><h1>{tool.name}</h1>{tool.assigned && <Shared.Badge tone="good">assigned</Shared.Badge>}</div>
          <p className="mono">{tool.toolId}</p>
        </div>
      </div>
      <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
    </header>
    <div className="guardrail-banner" role="note"><span>Inspection mode</span><span>Sandbox only</span><span>Read-only</span><span>Composition governed by Product API</span></div>
    <div className="detail-grid">
      <section className="panel">
        <div className="panel-head"><div><h2>Tool</h2><p>Catalog entry from the Product API</p></div></div>
        <dl className="config-list">
          <div><dt>Tool ID</dt><dd className="mono">{tool.toolId}</dd></div>
          <div><dt>Name</dt><dd>{tool.name}</dd></div>
          <div><dt>Description</dt><dd>{tool.description}</dd></div>
          <div><dt>Assigned</dt><dd>{tool.assigned ? "Yes" : "No"}</dd></div>
          <div><dt>Availability</dt><dd><Shared.Status status={tool.availability} /></dd></div>
          <div><dt>Used by agents</dt><dd>{tool.usageCount}</dd></div>
        </dl>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Tool capabilities</h2><p>Capabilities provided by this tool</p></div><Shared.Badge tone={tool.capabilities.length > 0 ? "good" : "muted"}>{tool.capabilities.length}</Shared.Badge></div>
        <div className="panel-body"><Shared.IdList label="Capabilities" ids={tool.capabilities} /></div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Requirements</h2><p>Prerequisites reported by the Product API</p></div><Shared.Badge tone={tool.requirements.length > 0 ? "warn" : "good"}>{tool.requirements.length}</Shared.Badge></div>
        <div className="panel-body"><Shared.IdList label="Requirements" ids={tool.requirements} /></div>
      </section>
      <Shared.UnsupportedActionsPanel actions={tool.availableActions} note="Tool assignment and unassignment" />
    </div>
  </>;
}

export function PluginDetail() {
  const { pluginId } = Router.useParams();
  if (!pluginId) return <Router.Navigate to="/plugins" replace />;
  return <PluginDetailSurface key={pluginId} pluginId={pluginId} />;
}

function PluginDetailSurface({ pluginId }: { pluginId: string }) {
  const { data: plugin, loadState, loadError, stale, refresh } = Shared.useOperationalSummary<Api.PluginSummary>(
    () => Api.productApi.getPluginDetail(pluginId),
    "Unable to load plugin from Product API",
    () => false,
  );
  if (loadState === "loading" && !plugin) return <><Router.Link className="back" to="/plugins">← Tools & Plugins</Router.Link><Shared.CatalogLoading message="Loading plugin..." /></>;
  if (loadState === "error" && !plugin) return <><Router.Link className="back" to="/plugins">← Tools & Plugins</Router.Link><Shared.CatalogError message={loadError ?? "Plugin not found"} /></>;
  if (!plugin) return <div className="empty-state">Plugin not found</div>;
  return <>
    <Router.Link className="back" to="/plugins">← Tools & Plugins</Router.Link>
    {loadError && <div className="error-banner" role="alert">{loadError}</div>}
    {stale && <div className="stale-banner" role="status">Showing a stale plugin snapshot. Refresh to recover live state.</div>}
    {loadState === "refreshing" && <div className="refresh-banner" role="status">Refreshing plugin...</div>}
    <header className="detail-head">
      <div className="detail-id">
        <div>
          <div className="title-status"><h1>{plugin.name}</h1>{plugin.installed && <Shared.Badge tone="good">installed</Shared.Badge>}</div>
          <p className="mono">{plugin.pluginId}</p>
        </div>
      </div>
      <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
    </header>
    <div className="guardrail-banner" role="note"><span>Inspection mode</span><span>Sandbox only</span><span>Read-only</span><span>Composition governed by Product API</span></div>
    <div className="detail-grid">
      <section className="panel">
        <div className="panel-head"><div><h2>Plugin</h2><p>Catalog entry from the Product API</p></div></div>
        <dl className="config-list">
          <div><dt>Plugin ID</dt><dd className="mono">{plugin.pluginId}</dd></div>
          <div><dt>Package</dt><dd className="mono">{plugin.packageId}</dd></div>
          <div><dt>Name</dt><dd>{plugin.name}</dd></div>
          <div><dt>Source</dt><dd>{plugin.source}</dd></div>
          <div><dt>Installed</dt><dd>{plugin.installed ? "Yes" : "No"}</dd></div>
          <div><dt>Compatibility</dt><dd><Shared.Status status={plugin.compatibility} /></dd></div>
          <div><dt>Failure state</dt><dd>{plugin.failureState}</dd></div>
        </dl>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Dependencies</h2><p>Plugin dependency truth from the Product API</p></div><Shared.Badge tone={plugin.dependencies.length > 0 ? "warn" : "good"}>{plugin.dependencies.length}</Shared.Badge></div>
        <div className="panel-body"><Shared.IdList label="Dependencies" ids={plugin.dependencies} /></div>
      </section>
      <Shared.UnsupportedActionsPanel actions={plugin.availableActions} note="Plugin installation and removal" />
    </div>
  </>;
}

export function EngineCatalog() {
  const { data: engines, loadState, loadError, stale, refresh } = Shared.useOperationalSummary<Api.EngineSummary[]>(
    () => Api.productApi.listEngines(),
    "Unable to load engines from Product API",
    () => false,
  );
  const { data: providers, loadState: providersState, loadError: providersError } = Shared.useOperationalSummary<Api.ProviderSummary[]>(
    () => Api.productApi.listProviders(),
    "Unable to load providers from Product API",
    () => false,
  );
  const { data: models, loadState: modelsState, loadError: modelsError } = Shared.useOperationalSummary<Api.ModelSummary[]>(
    () => Api.productApi.listModels(),
    "Unable to load models from Product API",
    () => false,
  );

  return <>
    <header className="domain-header">
      <div><p className="eyebrow">MODELS, ENGINES & PROVIDERS</p><h1>Engines, Providers & Models</h1><p>Composition registries from the Product API. Credential requirements link to the governed write-only Secret references surface.</p></div>
      <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadError ? "Retry" : loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
    </header>
    <div className="guardrail-banner" role="note"><span>Inspection mode</span><span>Sandbox only</span><span>Read-only</span><span>Composition governed by Product API</span></div>
    {stale && <div className="stale-banner" role="status">Showing a stale snapshot. Refresh to recover live state.</div>}
    {loadState === "refreshing" && <div className="refresh-banner" role="status">Refreshing engine registries...</div>}
    {loadError && <div className="error-banner" role="alert">{loadError}</div>}
    <section className="panel">
      <div className="panel-head"><div><h2>Engine registry</h2><p>Available execution engines</p></div><Shared.Badge tone={engines && engines.length > 0 ? "good" : "muted"}>{engines?.length ?? 0}</Shared.Badge></div>
      <div className="panel-body">
        {loadState === "loading" && !engines && <div className="state-line">Loading engines...</div>}
        {loadState === "error" && !engines && <div className="state-line error">Unable to load engines.</div>}
        {engines && engines.length === 0 && <div className="state-line empty">No engines reported by the Product API.</div>}
        {engines && engines.length > 0 && <div className="catalog-list compact">
          {engines.map(engine => (
            <Router.Link className="catalog-row" to={`/engines/${engine.id}`} key={engine.id}>
              <div className="catalog-row-main"><b>{engine.name}</b><small className="mono">{engine.id}</small><Shared.CapabilityBadges capabilities={engine.capabilities} /></div>
              <div className="catalog-badges">
                <Shared.Badge tone={engine.availability === "ready" ? "good" : engine.availability === "degraded" ? "warn" : "muted"}>{engine.availability}</Shared.Badge>
                <Shared.Badge tone={engine.compatibility === "compatible" ? "good" : "warn"}>{engine.compatibility}</Shared.Badge>
                <span className="catalog-count">{engine.deploymentModes.join(", ")}</span>
              </div>
            </Router.Link>
          ))}
        </div>}
      </div>
    </section>
    <div className="dashboard-grid composition-detail-grid">
      <section className="panel">
        <div className="panel-head"><div><h2>Provider registry</h2><p>Model providers and credential requirements</p></div><Shared.Badge tone={providers && providers.length > 0 ? "good" : "muted"}>{providers?.length ?? 0}</Shared.Badge></div>
        <div className="panel-body">
          {providersState === "loading" && !providers && <div className="state-line">Loading providers...</div>}
          {providersError && <div className="state-line error">{providersError}</div>}
          {providers && providers.length === 0 && <div className="state-line empty">No providers reported by the Product API.</div>}
          {providers && providers.length > 0 && <div className="catalog-list compact">
            {providers.map(provider => (
              <Router.Link className="catalog-row" to={`/providers/${provider.id}`} key={provider.id}>
                <div className="catalog-row-main"><b>{provider.name}</b><small className="mono">{provider.id}</small></div>
                <div className="catalog-badges">
                  <Shared.Badge tone={provider.availability === "available" ? "good" : provider.availability === "pending" ? "warn" : "muted"}>{provider.availability}</Shared.Badge>
                  {provider.credentialRequired && <Shared.Badge tone="warn">credential required</Shared.Badge>}
                  <Shared.Badge tone={provider.compatibility === "compatible" ? "good" : "warn"}>{provider.compatibility}</Shared.Badge>
                </div>
              </Router.Link>
            ))}
          </div>}
        </div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Model catalog</h2><p>Models available for composition</p></div><Shared.Badge tone={models && models.length > 0 ? "good" : "muted"}>{models?.length ?? 0}</Shared.Badge></div>
        <div className="panel-body">
          {modelsState === "loading" && !models && <div className="state-line">Loading models...</div>}
          {modelsError && <div className="state-line error">{modelsError}</div>}
          {models && models.length === 0 && <div className="state-line empty">No models reported by the Product API.</div>}
          {models && models.length > 0 && <div className="catalog-list compact">
            {models.map(model => (
              <div className="catalog-row" key={model.id}>
                <div className="catalog-row-main"><b>{model.name}</b><small className="mono">{model.id}</small><Shared.CapabilityBadges capabilities={model.capabilities} /></div>
                <div className="catalog-badges">
                  <Shared.Badge tone={model.availability === "available" ? "good" : model.availability === "preview" ? "warn" : "muted"}>{model.availability}</Shared.Badge>
                  {model.credentialRequired && <Shared.Badge tone="warn">credential required</Shared.Badge>}
                  <Shared.Badge tone={model.compatibility === "compatible" ? "good" : "warn"}>{model.compatibility}</Shared.Badge>
                </div>
              </div>
            ))}
          </div>}
        </div>
      </section>
    </div>
    <section className="panel">
      <div className="panel-head"><div><h2>Selection actions</h2><p>Engine / Provider / Model selection for AgentComposition</p></div><Shared.Badge tone="muted">unsupported</Shared.Badge></div>
      <p className="panel-note">Selecting an engine, provider or model for an AgentComposition is governed by the Product API and is not supported in this milestone. Compatibility shown here never implies deploy planning — deployment planning belongs to Operational Execution.</p>
    </section>
  </>;
}

export function EngineDetail() {
  const { engineId } = Router.useParams();
  if (!engineId) return <Router.Navigate to="/engines" replace />;
  return <EngineDetailSurface key={engineId} engineId={engineId} />;
}

function EngineDetailSurface({ engineId }: { engineId: string }) {
  const { data: engine, loadState, loadError, stale, refresh } = Shared.useOperationalSummary<Api.EngineSummary>(
    () => Api.productApi.getEngineDetail(engineId),
    "Unable to load engine from Product API",
    () => false,
  );
  if (loadState === "loading" && !engine) return <><Router.Link className="back" to="/engines">← Engines</Router.Link><Shared.CatalogLoading message="Loading engine..." /></>;
  if (loadState === "error" && !engine) return <><Router.Link className="back" to="/engines">← Engines</Router.Link><Shared.CatalogError message={loadError ?? "Engine not found"} /></>;
  if (!engine) return <div className="empty-state">Engine not found</div>;
  return <>
    <Router.Link className="back" to="/engines">← Engines</Router.Link>
    {loadError && <div className="error-banner" role="alert">{loadError}</div>}
    {stale && <div className="stale-banner" role="status">Showing a stale engine snapshot. Refresh to recover live state.</div>}
    {loadState === "refreshing" && <div className="refresh-banner" role="status">Refreshing engine...</div>}
    <header className="detail-head">
      <div className="detail-id">
        <div>
          <div className="title-status"><h1>{engine.name}</h1><Shared.Status status={engine.availability} /></div>
          <p className="mono">{engine.id} · {engine.type}</p>
        </div>
      </div>
      <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
    </header>
    <div className="guardrail-banner" role="note"><span>Inspection mode</span><span>Sandbox only</span><span>Read-only</span><span>Composition governed by Product API</span></div>
    <div className="detail-grid">
      <section className="panel">
        <div className="panel-head"><div><h2>Engine</h2><p>Registry entry from the Product API</p></div></div>
        <dl className="config-list">
          <div><dt>Engine ID</dt><dd className="mono">{engine.id}</dd></div>
          <div><dt>Name</dt><dd>{engine.name}</dd></div>
          <div><dt>Type</dt><dd>{engine.type}</dd></div>
          <div><dt>Availability</dt><dd><Shared.Status status={engine.availability} /></dd></div>
          <div><dt>Compatibility</dt><dd><Shared.Status status={engine.compatibility} /></dd></div>
          <div><dt>Credential required</dt><dd>No</dd></div>
          <div><dt>Deployment modes</dt><dd>{engine.deploymentModes.join(", ")}</dd></div>
          <div><dt>Used by agents</dt><dd>{engine.usageCount}</dd></div>
        </dl>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Engine capabilities</h2><p>Capabilities provided by this engine</p></div><Shared.Badge tone={engine.capabilities.length > 0 ? "good" : "muted"}>{engine.capabilities.length}</Shared.Badge></div>
        <div className="panel-body"><Shared.IdList label="Capabilities" ids={engine.capabilities} /></div>
      </section>
      <Shared.UnsupportedActionsPanel actions={engine.availableActions} note="Engine selection for AgentComposition" />
    </div>
  </>;
}

export function ProviderDetail() {
  const { providerId } = Router.useParams();
  if (!providerId) return <Router.Navigate to="/engines" replace />;
  return <ProviderDetailSurface key={providerId} providerId={providerId} />;
}

function ProviderDetailSurface({ providerId }: { providerId: string }) {
  const { data: provider, loadState, loadError, stale, refresh } = Shared.useOperationalSummary<Api.ProviderSummary>(
    () => Api.productApi.getProviderDetail(providerId),
    "Unable to load provider from Product API",
    () => false,
  );
  if (loadState === "loading" && !provider) return <><Router.Link className="back" to="/engines">← Engines</Router.Link><Shared.CatalogLoading message="Loading provider..." /></>;
  if (loadState === "error" && !provider) return <><Router.Link className="back" to="/engines">← Engines</Router.Link><Shared.CatalogError message={loadError ?? "Provider not found"} /></>;
  if (!provider) return <div className="empty-state">Provider not found</div>;
  return <>
    <Router.Link className="back" to="/engines">← Engines</Router.Link>
    {loadError && <div className="error-banner" role="alert">{loadError}</div>}
    {stale && <div className="stale-banner" role="status">Showing a stale provider snapshot. Refresh to recover live state.</div>}
    {loadState === "refreshing" && <div className="refresh-banner" role="status">Refreshing provider...</div>}
    <header className="detail-head">
      <div className="detail-id">
        <div>
          <div className="title-status"><h1>{provider.name}</h1><Shared.Status status={provider.availability} /></div>
          <p className="mono">{provider.id} · {provider.type.join(", ")}</p>
        </div>
      </div>
      <button className="secondary" disabled={loadState === "loading" || loadState === "refreshing"} onClick={refresh}>{loadState === "refreshing" ? "Refreshing" : "Refresh"}</button>
    </header>
    <div className="guardrail-banner" role="note"><span>Inspection mode</span><span>Sandbox only</span><span>Read-only</span><span>Composition governed by Product API</span></div>
    <div className="detail-grid">
      <section className="panel">
        <div className="panel-head"><div><h2>Provider</h2><p>Registry entry from the Product API</p></div></div>
        <dl className="config-list">
          <div><dt>Provider ID</dt><dd className="mono">{provider.id}</dd></div>
          <div><dt>Name</dt><dd>{provider.name}</dd></div>
          <div><dt>Type</dt><dd>{provider.type.join(", ")}</dd></div>
          <div><dt>Availability</dt><dd><Shared.Status status={provider.availability} /></dd></div>
          <div><dt>Credential required</dt><dd>{provider.credentialRequired ? "Yes — visible requirement only; credentials are never exposed" : "No"}</dd></div>
          <div><dt>Compatibility</dt><dd><Shared.Status status={provider.compatibility} /></dd></div>
          <div><dt>Used by agents</dt><dd>{provider.usageCount}</dd></div>
        </dl>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Provider capabilities</h2><p>Capabilities provided by this provider</p></div><Shared.Badge tone={provider.capabilities.length > 0 ? "good" : "muted"}>{provider.capabilities.length}</Shared.Badge></div>
        <div className="panel-body"><Shared.IdList label="Capabilities" ids={provider.capabilities} /></div>
      </section>
      <Shared.UnsupportedActionsPanel actions={provider.availableActions} note="Provider selection for AgentComposition" />
    </div>
  </>;
}
