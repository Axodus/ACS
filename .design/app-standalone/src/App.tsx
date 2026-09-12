import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft } from "@phosphor-icons/react";
import * as Api from "./api/product-api";
import { AccountControl } from "./auth/AccountControl";
import { CredentialsPage, ExecutionDetailPage, ExecutionsPage, OperationsStatusPage, WorkerDetailPage, WorkersPage } from "./OperationalUx";
import * as Shared from "./shared";
import { Readiness, CustomerDashboard } from "./domains/dashboard/Dashboard";
import { AgentInventory, AgentCreate, AgentEdit, AgentConfigurationView, AgentValidateView, AgentRunsView, AgentRevisionsView, AgentEvidenceView, AgentUsageCostView, AgentAdvancedView, AgentDetail, OperationalExecution } from "./domains/agents/Agents";
import { WorkforceCreateUnavailable, WorkforceDetail, WorkforceInventory, WorkforceMembers, WorkforceOperations, WorkforceRevisions, WorkforceRuns } from "./domains/workforces/Workforces";
import { AgentCompositionView, CompositionOverview, RoleCatalog, RoleDetail, ProfileCatalog, ProfileDetail, CapabilityCatalog, CapabilityDetail, SkillCatalog, SkillDetail, ToolsPluginsCatalog, ToolDetail, PluginDetail, EngineCatalog, EngineDetail, ProviderDetail } from "./domains/composition/Composition";
import { GenericView, Runtime, Logs, EvidenceView, AuditView } from "./domains/runtime/Runtime";
import { EconomicsView, PaymentRailsBoundaryView, PricingInvoiceBoundaryView, BillingBoundaryView, TenantBillingBoundaryView, SettlementReconciliationBoundaryView, FinancialAuditBoundaryView, BillingUxAcceptanceView } from "./domains/economics/Economics";
import { AdministrationOverview, GovernanceView, OperationalReliabilityView, Settings } from "./domains/administration/Administration";
import "./operational.css";

export default function App() {
  const [palette, setPalette] = useState(false);
  const [dark, setDark] = useState(true);
  const [mobile, setMobile] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem("acs.sidebar.collapsed") === "true";
    } catch {
      return false;
    }
  });
  const navigate = useNavigate();
  const location = useLocation();
  const [connectivity, setConnectivity] = useState<Shared.ConnectivityState>({ status: "loading", health: null, error: null });

  async function checkProductApi() {
    setConnectivity({ status: "loading", health: null, error: null });
    try {
      const health = await Api.productApi.health();
      setConnectivity({ status: "ready", health, error: null });
    } catch (error) {
      setConnectivity({
        status: "error",
        health: null,
        error: error instanceof Error ? error.message : "Product API is unavailable",
      });
    }
  }

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette(v => !v);
      }
      if (e.key === "Escape") {
        setPalette(false);
        setMobile(false);
      }
    };
    addEventListener("keydown", fn);
    return () => removeEventListener("keydown", fn);
  }, []);

  useEffect(() => {
    setMobile(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobile ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobile]);

  useEffect(() => {
    try {
      window.localStorage.setItem("acs.sidebar.collapsed", String(sidebarCollapsed));
    } catch {
      // Sidebar preference is optional; session-only behavior remains valid.
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    void checkProductApi();
  }, []);

  const view = Shared.viewOfPath(location.pathname);

  const domain = Shared.domainByPath(location.pathname);
  const domainDef = Shared.domainDefs.find(item => item.id === domain)!;
  const entityMatch = location.pathname.match(/^\/(agents|workforces|roles|profiles|capabilities|skills|plugins|tools|engines|providers|executions|workers)\/([^/]+)(?:\/|$)/);
  const entityLabel = location.pathname === "/agents/new"
    ? "Create agent"
    : location.pathname.includes("/edit")
      ? "Edit agent"
      : entityMatch
        ? entityMatch[1].replace(/s$/, "") + ": " + entityMatch[2]
        : undefined;
  const title = entityLabel ?? view ?? domain;
  const isDomainRoot = location.pathname === domainDef.to;

  return (
    <div className={`${dark ? "app dark" : "app light"} ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <div className="brand"><img src="/assets/Axodus_logo.svg" alt="ACS" /><div className="brand-copy"><b>ACS</b><small>CONTROL PLANE</small></div><button className="sidebar-toggle" type="button" aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!sidebarCollapsed} onClick={() => setSidebarCollapsed(value => !value)}>{sidebarCollapsed ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}</button><button className="mobile-close" type="button" aria-label="Close navigation" onClick={() => setMobile(false)}>×</button></div>
        <div className="workspace-switch" aria-live="polite"><span className="workspace-icon">⌘</span><div><b>{Api.productApiConfig.environment} environment</b><small>{Api.productApiConfig.tenantId} · server-resolved session</small></div></div>
        <Shared.SidebarNavigation pathname={location.pathname} activeDomain={domain} onNavigate={() => setMobile(false)} collapsed={sidebarCollapsed} />
      </aside>
      {mobile && <button type="button" className="mobile-drawer-overlay" aria-label="Close navigation overlay" onClick={() => setMobile(false)} />}
      <main className="main">
        <header className="topbar">
          <button className="menu" type="button" aria-label="Open navigation" onClick={() => setMobile(true)}>☰</button>
          <nav className="crumb" aria-label="Breadcrumb"><Link to="/">ACS</Link><i>/</i><Link to={domainDef.to}>{domain}</Link>{!isDomainRoot && <><i>/</i><b>{title}</b></>}</nav>
          <div className="top-actions"><Shared.Status status={connectivity.status === "ready" ? "Product API connected" : connectivity.status === "loading" ? "Checking Product API" : "Product API unavailable"} /><AccountControl dark={dark} /><button className="command" type="button" onClick={() => setPalette(true)}>⌕ <span>Search ACS...</span><kbd>⌘ K</kbd></button><button className="icon-btn" type="button" aria-label="Toggle theme" onClick={() => setDark(!dark)}>{dark ? "☼" : "◐"}</button></div>
        </header>
        {connectivity.status === "loading" && <div className="global-state loading-state" role="status">Connecting to Product API boundary...</div>}
        {connectivity.status === "error" && <div className="global-state error-state" role="alert"><span>Product API unavailable: {connectivity.error}</span><button className="secondary" onClick={() => void checkProductApi()}>Retry</button></div>}
        <div className="content">
          <Shared.EntityContextNav pathname={location.pathname} />
          <Routes>
            <Route path="/" element={<CustomerDashboard />} />
            <Route path="/administration" element={<AdministrationOverview />} />
            <Route path="/operational-execution" element={<OperationalExecution />} />
            <Route path="/executions" element={<ExecutionsPage />} />
            <Route path="/executions/:jobId" element={<ExecutionDetailPage />} />
            <Route path="/workers" element={<WorkersPage />} />
            <Route path="/workers/:workerId" element={<WorkerDetailPage />} />
            <Route path="/operations" element={<OperationsStatusPage />} />
            <Route path="/operations/overview" element={<OperationsStatusPage />} />
            <Route path="/readiness" element={<Readiness />} />
            <Route path="/agents" element={<AgentInventory />} />
            <Route path="/agents/new" element={<AgentCreate />} />
            <Route path="/agents/:agentId/edit" element={<AgentEdit />} />
            <Route path="/credentials" element={<CredentialsPage />} />
            <Route path="/agents/:agentId/composition" element={<AgentCompositionView />} />
            <Route path="/agents/:agentId/configuration" element={<AgentConfigurationView />} />
            <Route path="/agents/:agentId/validate" element={<AgentValidateView />} />
            <Route path="/agents/:agentId/runs" element={<AgentRunsView />} />
            <Route path="/agents/:agentId/revisions" element={<AgentRevisionsView />} />
            <Route path="/agents/:agentId/evidence" element={<AgentEvidenceView />} />
            <Route
              path="/agents/:agentId/usage-cost"
              element={<AgentUsageCostView />}
            />
            <Route path="/agents/:agentId/advanced" element={<AgentAdvancedView />} />
            <Route path="/agents/:agentId" element={<AgentDetail />} />
            <Route path="/workforces" element={<WorkforceInventory />} />
            <Route path="/workforces/new" element={<WorkforceCreateUnavailable />} />
            <Route path="/workforces/:workforceId/members" element={<WorkforceMembers />} />
            <Route path="/workforces/:workforceId/revisions/:revision" element={<WorkforceRevisions />} />
            <Route path="/workforces/:workforceId/revisions" element={<WorkforceRevisions />} />
            <Route path="/workforces/:workforceId/runs" element={<WorkforceRuns />} />
            <Route path="/workforces/:workforceId/operations" element={<WorkforceOperations />} />
            <Route path="/workforces/:workforceId" element={<WorkforceDetail />} />
            <Route path="/composition" element={<CompositionOverview />} />
            <Route path="/roles" element={<RoleCatalog />} />
            <Route path="/roles/:roleId" element={<RoleDetail />} />
            <Route path="/profiles" element={<ProfileCatalog />} />
            <Route path="/profiles/:profileId" element={<ProfileDetail />} />
            <Route path="/capabilities" element={<CapabilityCatalog />} />
            <Route path="/capabilities/:capabilityId" element={<CapabilityDetail />} />
            <Route path="/skills" element={<SkillCatalog />} />
            <Route path="/skills/:skillId" element={<SkillDetail />} />
            <Route path="/plugins" element={<ToolsPluginsCatalog />} />
            <Route path="/tools/:toolId" element={<ToolDetail />} />
            <Route path="/plugins/:pluginId" element={<PluginDetail />} />
            <Route path="/engines" element={<EngineCatalog />} />
            <Route path="/engines/:engineId" element={<EngineDetail />} />
            <Route path="/providers/:providerId" element={<ProviderDetail />} />
            <Route path="/memory" element={<GenericView view="Memory" />} />
            <Route path="/runtime" element={<Runtime />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/operational-evidence" element={<EvidenceView />} />
            <Route path="/audit" element={<AuditView />} />
            <Route path="/economics" element={<EconomicsView />} />
            <Route path="/system/billing-boundary" element={<BillingBoundaryView />} />
            <Route path="/system/payment-rails-boundary" element={<PaymentRailsBoundaryView />} />
            <Route path="/system/pricing-invoice-boundary" element={<PricingInvoiceBoundaryView />} />
            <Route path="/system/tenant-billing-boundary" element={<TenantBillingBoundaryView />} />
            <Route path="/system/settlement-reconciliation" element={<SettlementReconciliationBoundaryView />} />
            <Route path="/system/financial-audit" element={<FinancialAuditBoundaryView />} />
            <Route path="/system/billing-acceptance" element={<BillingUxAcceptanceView />} />
            <Route path="/system" element={<GovernanceView />} />
            <Route path="/system/operational-reliability" element={<OperationalReliabilityView />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <footer><span className="mono">{Api.productApiConfig.environment}</span><span>ACS Control Plane</span></footer>
      </main>
      {palette && <div className="palette-wrap" onClick={() => setPalette(false)}><div className="palette" onClick={e => e.stopPropagation()}><label>⌕<input autoFocus placeholder="Search ACS or run a command..." /></label><p>QUICK ACTIONS</p><button onClick={() => { setPalette(false); navigate("/agents/new"); }}><span>＋</span><div><b>Create agent</b><small>Open the governed Agent create form</small></div><kbd>↵</kbd></button></div></div>}
    </div>
  );
}
