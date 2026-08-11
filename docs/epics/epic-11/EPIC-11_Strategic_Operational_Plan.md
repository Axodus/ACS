# EPIC-11 Strategic & Operational Plan
## ACS Agent Operations & Management Surface

## 1. Mission

Construir a primeira superfície operacional do **Control Plane do ACS**, transformando as capacidades já existentes da **Product API** em fluxos completos de operação, observação e governança, sem reimplementar os domínios consolidados da EPIC-10.

A EPIC-11 não deve ser tratada como UI de Agents. Ela deve ser tratada como a primeira camada de operação real do ACS sobre:

```text
Frontend
  ↓
Product API
  ↓
Control Plane
  ↓
Workers / Runtime / Execution Target
  ↓
OpenClaw
```

## 2. Princípio organizador

```text
Fluxo > Módulo > Tela
```

A decomposição da EPIC-11 deve partir de capacidades operacionais completas, e não de telas isoladas.

A interface é consequência dos fluxos.  
O fluxo operacional é o contrato principal.

## 3. Execution Principles — AEES

O planejamento segue o padrão **AEES — ACS Engineering Execution Standard**:

- organizar trabalho por capacidades operacionais;
- decompor macro-fases em milestones e backlog conceitual de requests;
- priorizar fluxos end-to-end antes de funcionalidades isoladas;
- preservar independência entre backend, Product API e superfície operacional;
- manter arquitetura, contratos e granularidade em aberto até o refinamento da sprint;
- permitir fatiamento futuro sem quebrar coerência arquitetural;
- validar cada incremento por comportamento observável;
- encerrar cada sprint com validation gate e commit dedicado;
- manter mudanças externas isoladas do escopo da sprint.

---

# 4. Macro-fases finais recomendadas

## Fase 1 — Operational Awareness

**Objetivo:** o usuário entende o estado atual do ACS antes de executar qualquer operação.

Essa fase estabelece a superfície base de navegação, leitura e diagnóstico inicial.

### Capacidades entregues

- visão geral do sistema;
- health global;
- readiness global;
- blockers;
- warnings;
- evidence summary;
- estado de agentes;
- estado de workers;
- estado de runtimes;
- estado de deployments;
- estado econômico resumido;
- navegação principal;
- padrão de loading, empty e error states para leitura.

### Escopo

- somente observação;
- nenhuma operação mutável;
- nenhuma criação, deploy ou alteração de recurso.

### Requests conceituais agrupados

#### OA-01 — System Shell & Navigation

Equivale parcialmente a S01.

- App shell operacional
- Navegação principal
- Seções do Control Plane
- Estado global
- Environment context
- Product API connectivity
- Layout base
- Empty/loading/error shell states

#### OA-02 — System Dashboard

Equivale parcialmente a S01.

- System overview
- ACS health
- Active Agents
- Active Deployments
- Active Runtimes
- Available Workers
- Recent Execution Runs
- Critical blockers
- Operational warnings

#### OA-03 — Readiness & Health Overview

Equivale a S02.

- DEV readiness
- Distributed Runtime readiness
- Production readiness
- Readiness blockers
- Readiness evidence
- Component health
- Infrastructure health
- Product API health
- Runtime connectivity
- Readiness refresh

### Entidades utilizadas

- Product API
- Runtime
- Deployment
- ExecutionRun
- Worker
- Policy
- Eligibility
- Economic Contract
- Readiness report
- Evidence

### APIs consumidas

- health/readiness endpoints;
- system overview endpoints;
- deployment/runtime/worker summary endpoints;
- execution summary endpoints;
- economic summary endpoint, se já existir;
- Product API status endpoint.

### Operações habilitadas

- visualizar;
- filtrar;
- navegar;
- atualizar estado;
- inspecionar blockers.

### Dependências

Essa fase depende apenas da Product API expor estado básico legível.

### Critério estratégico de sucesso

O usuário consegue abrir o ACS e responder:

- o sistema está saudável?
- o ambiente está pronto para desenvolvimento?
- existe blocker crítico?
- quais agentes, deployments, runtimes e workers estão ativos?
- há algum sinal operacional que exige atenção?

---

## Fase 2 — Agent Lifecycle

**Objetivo:** o usuário localiza, compreende e administra um Agent como entidade operacional.

Essa fase transforma os domínios AgentDefinition, AgentRevision e AgentComposition em uma experiência administrável.

### Capacidades entregues

- inventário de agentes;
- detalhe do agente;
- criação;
- edição;
- revisão;
- duplicação;
- arquivamento;
- restauração;
- remoção protegida;
- ligação entre Agent e composição;
- ligação entre Agent e runtime/deployment;
- ligação entre Agent e estado econômico;
- audit summary do Agent.

### Requests conceituais agrupados

#### AL-01 — Agent Inventory

Equivale a S03.

- List Agents
- Search Agents
- Filter Agents
- Sort Agents
- Agent status
- Agent environment
- Agent runtime state
- Agent deployment state
- Archive state
- Empty / loading / error states

#### AL-02 — Agent Detail & Operational Summary

Funde partes de S04, S07 e S08.

- AgentDefinition
- AgentRevision
- AgentComposition
- Identity
- Current revision
- Role
- Profile
- Capabilities
- Skills
- Tools
- Runtime
- Deployment
- Economic state
- Audit summary
- Readiness summary
- Lifecycle summary

#### AL-03 — Agent Create & Initial Composition

Equivale a S05.

- Create Agent
- Identity definition
- Initial revision
- Initial composition
- Runtime target
- Engine selection
- Role selection
- Profile selection
- Initial capability validation
- Creation validation

#### AL-04 — Agent Edit & Draft Changes

Equivale a S06.

- Edit AgentDefinition
- Edit Identity
- Edit metadata
- Edit composition
- Runtime configuration
- Target configuration
- Change validation
- Unsaved changes
- Draft state

#### AL-05 — Agent Revision & Lifecycle Actions

Funde S07 e S08.

- Create revision
- Revision history
- Revision comparison
- Active revision
- Adopt revision
- Restore revision
- Duplicate Agent
- Archive Agent
- Restore Agent
- Delete Agent
- Dependency validation
- Protected Agent rules
- Lifecycle history
- Destructive confirmation

### Entidades utilizadas

- AgentDefinition
- AgentRevision
- AgentComposition
- Role
- Profile
- Skill
- Tool
- Runtime
- Deployment
- ExecutionRun
- Economic Contract
- Audit

### APIs consumidas

- Agent CRUD;
- Agent revision endpoints;
- Agent composition endpoints;
- Agent lifecycle endpoints;
- Agent readiness summary;
- Agent deployment/runtime summary;
- audit summary endpoint.

### Operações habilitadas

- listar;
- buscar;
- filtrar;
- criar;
- editar;
- versionar;
- duplicar;
- arquivar;
- restaurar;
- deletar com proteção;
- inspecionar estado operacional.

### Dependências

Depende de:

- Fase 1 para shell, navegação e padrões de estado;
- Product API de Agent CRUD e composição;
- contratos de lifecycle já existentes.

### Critério estratégico de sucesso

O usuário consegue administrar um Agent sem usar CLI para operações normais de catálogo e lifecycle.

---

## Fase 3 — Composition Surface

**Objetivo:** o usuário consegue montar corretamente um Agent a partir dos domínios de composição disponíveis.

Essa fase deve evitar que Roles, Profiles, Skills, Tools, Plugins, Engines e Providers virem ilhas independentes. Todos devem ser tratados como partes do mesmo sistema de composição.

### Capacidades entregues

- catálogo de Roles;
- catálogo de Profiles;
- Capability Registry visível;
- capabilities efetivas;
- Skills disponíveis e instaladas;
- Tools atribuíveis;
- Plugins e packages;
- Models, engines e providers;
- compatibilidade entre componentes;
- requisitos e conflitos;
- origem das capabilities;
- uso por Agents;
- adoção de revisões.

### Requests conceituais agrupados

#### CS-01 — Role & Profile Composition

Funde S09 e S10.

- Role catalog
- Role detail
- Create Role
- Edit Role
- Role revisions
- Role capabilities
- Capability inheritance
- Role adoption
- Role usage
- Profile catalog
- Profile detail
- Create Profile
- Edit Profile
- Profile revisions
- OpenClaw-compatible profile
- Legacy profile visibility
- Identity
- Soul
- User
- Memory
- Heartbeat
- Profile adoption

#### CS-02 — Capability Model

Equivale a S11.

- Capability Registry
- Available capabilities
- Effective capabilities
- Capability source
- Capability inheritance
- Capability requirements
- Missing capabilities
- Capability conflicts
- Capability usage

#### CS-03 — Skills Management

Equivale a S12.

- Skill catalog
- Installed Skills
- Skill detail
- Install Skill
- Remove Skill
- Assign Skill
- Unassign Skill
- Skill requirements
- Skill compatibility
- Skill usage

#### CS-04 — Tools & Plugins Management

Equivale a S13.

- Tool catalog
- Tool assignment
- Tool capabilities
- Plugin packages
- Package sources
- Plugin installation
- Plugin removal
- Plugin dependencies
- Plugin compatibility
- Plugin status
- Plugin failures

#### CS-05 — Models, Engines & Providers

Equivale a S14.

- Engine Registry
- Provider Registry
- Available engines
- Available models
- Provider capabilities
- Engine capabilities
- Model selection
- Provider selection
- Engine selection
- Compatibility visibility

### Entidades utilizadas

- Role
- Profile
- Capability
- Skill
- Tool
- PluginPackage
- PluginInstallation
- PackageSource
- Engine
- Provider
- Model
- AgentComposition
- AgentRevision

### APIs consumidas

- Role registry;
- Profile registry;
- Capability registry;
- Skill registry;
- Tool registry;
- Plugin/package endpoints;
- Engine registry;
- Provider registry;
- Model/provider compatibility endpoints;
- Agent composition endpoints.

### Operações habilitadas

- visualizar catálogos;
- criar/editar Role e Profile se suportado;
- instalar/remover Skill;
- atribuir/remover Skill;
- atribuir/remover Tool;
- instalar/remover Plugin;
- selecionar engine/provider/model;
- validar compatibilidade.

### Dependências

Depende de:

- Fase 2 para contexto de Agent;
- Capability Registry e contratos de composição;
- Product API de Skills/Tools/Plugins/Providers/Engines.

### Critério estratégico de sucesso

O usuário consegue entender por que um Agent possui determinadas capabilities, quais dependências estão faltando e quais componentes são compatíveis com sua composição.

---

## Fase 4 — Operational Execution

**Objetivo:** transformar composição em execução governada.

Essa é a fase central da EPIC-11. Ela conecta credenciais, readiness, deployment, runtime, execution runs e workers em um fluxo operacional único.

### Fluxo principal

```text
Credentials
  ↓
Connections
  ↓
Readiness
  ↓
Deployment Plan
  ↓
Deploy
  ↓
Runtime
  ↓
Execution
  ↓
Worker
  ↓
Operation
```

### Capacidades entregues

- gestão operacional de credentials;
- vínculo entre credential e provider;
- saúde de conexões;
- readiness por Agent;
- deployment planning;
- deploy;
- activate/deactivate;
- stop/restart/redeploy/rollback/undeploy;
- runtime inventory;
- runtime control;
- execution runs;
- worker inventory;
- worker operations;
- reconciliação de estado;
- drift detection;
- falhas e recovery.

### Requests conceituais agrupados

#### OE-01 — Credentials & Provider Connections

Funde S15 e S16 com fronteira clara.

- Credential catalog
- Credential status
- Credential provider
- Create Credential
- Update Credential
- Remove Credential
- Secret reference
- Credential metadata
- Credential usage
- Credential validation
- Provider connections
- Connection health
- Authentication state
- Provider availability
- Credential association
- Connection validation
- Connection errors
- Connection refresh
- Rotation state

### Fronteira interna

**Credential** é o artefato de autorização/segredo/referência.  
**Connection** é o vínculo operacional testável entre provider, credential e ambiente.  
**Health** é o estado observável dessa conexão.

Essa separação deve ser mantida no planejamento.

#### OE-02 — Agent Readiness & Deployment Planning

Funde S17 e S18.

- Composition readiness
- Policy eligibility
- Sandbox readiness
- Target readiness
- Credential readiness
- Capability readiness
- Skill readiness
- Tool readiness
- Economic readiness
- Blocking findings
- Warnings
- Evidence
- Recheck
- ExecutionPlan
- Target selection
- Worker requirements
- Engine requirements
- Credential requirements
- Economic quote
- Policy evaluation
- Eligibility
- Sandbox constraints
- Deployment preview

#### OE-03 — Deploy & Deployment Operations

Funde S19 e S20.

- Deploy
- Deployment state
- Deployment progress
- Deployment result
- Deployment errors
- Active revision
- Execution target
- Assigned Worker
- Runtime creation
- Deployment audit
- Activate
- Deactivate
- Stop
- Restart
- Redeploy
- Rollback
- Undeploy
- Deployment history
- Deployment comparison
- Operation eligibility

#### OE-04 — Runtime & Execution Runs

Funde S21, S22 e S23.

- Runtime instances
- Runtime status
- Runtime Agent
- Runtime Worker
- Runtime Target
- Runtime Engine
- Runtime health
- Runtime age
- Runtime activity
- Runtime isolation
- Start Runtime
- Stop Runtime
- Restart Runtime
- Runtime command progress
- Runtime command result
- Unsupported operation
- Runtime failure state
- Runtime reconciliation
- Runtime drift
- ExecutionRun inventory
- ExecutionRun detail
- Run status
- Start time
- End time
- Runtime
- Agent revision
- Worker
- Target
- Execution result
- Failure reason
- Execution history

#### OE-05 — Worker Operations

Funde S24 e S25.

- Worker Registry
- Worker status
- Worker health
- Worker capabilities
- Worker capacity
- Worker availability
- Worker environment
- Worker workloads
- Worker target support
- Worker isolation state
- Register Worker
- Enable Worker
- Disable Worker
- Drain Worker
- Worker readiness
- Worker workload limits
- Worker tenant isolation
- Worker workload isolation
- Worker failure state
- Worker reconciliation

### Entidades utilizadas

- Credential
- Provider
- Connection
- AgentComposition
- Policy
- Eligibility
- Sandbox
- ExecutionPlan
- Deployment
- Runtime
- ExecutionRun
- Worker
- Engine
- Target
- Economic Contract
- Audit
- Evidence

### APIs consumidas

- credential endpoints;
- provider connection endpoints;
- readiness endpoints;
- execution plan endpoints;
- deployment endpoints;
- runtime endpoints;
- execution run endpoints;
- worker endpoints;
- policy eligibility endpoints;
- economic quote/reservation endpoint, se aplicável ao planning.

### Operações habilitadas

- validar credential;
- testar connection;
- avaliar readiness;
- gerar deployment plan;
- executar deploy;
- ativar/desativar deployment;
- redeploy;
- rollback;
- undeploy;
- controlar runtime;
- consultar execution runs;
- administrar worker quando permitido;
- reconciliar estado operacional.

### Dependências

Depende de:

- Fase 1 para estado global;
- Fase 2 para Agent;
- Fase 3 para composição;
- Credential/Provider/Product API;
- readiness e execution plan funcionais.

### Critério estratégico de sucesso

O usuário consegue sair de um Agent composto e chegar a um runtime executável, com readiness, deployment plan, deploy, execução e worker observáveis pela superfície operacional.

---

## Fase 5 — Operational Evidence & Economics

**Objetivo:** permitir que o usuário entenda exatamente o que aconteceu, por que aconteceu, quanto custou, quais evidências existem e quais decisões foram tomadas pelo Control Plane.

Economics deve ser tratado como **Economics / Economic Evidence** até que o refinamento decida se ele permanece como fluxo próprio ou subcamada de evidência operacional.

### Capacidades entregues

- logs;
- eventos;
- audit trail;
- diagnostics;
- readiness evidence;
- deployment evidence;
- runtime evidence;
- worker evidence;
- economic evidence;
- quote;
- reservation;
- metering;
- settlement;
- receipts;
- failure evidence;
- troubleshooting operacional.

### Requests conceituais agrupados

#### EV-01 — Logs & Events

Equivale a S29.

- Agent logs
- Runtime logs
- Worker logs
- Deployment logs
- Execution logs
- System events
- Filtering
- Search
- Error context
- Log correlation

#### EV-02 — Audit Trail

Equivale a S30.

- Audit trail
- Agent changes
- Revision changes
- Deployment operations
- Runtime operations
- Credential operations
- Worker operations
- Economic operations
- Actor
- Timestamp
- Audit filtering

#### EV-03 — Diagnostics & Evidence

Equivale a S31.

- Diagnostic reports
- Readiness evidence
- Failure diagnostics
- Runtime evidence
- Worker evidence
- Deployment evidence
- Policy findings
- Isolation findings
- Economic findings
- Operational troubleshooting

#### EV-04 — Economic Overview

Equivale a S26.

- Economic state
- $Neurons balance context
- Agent consumption
- Runtime consumption
- Execution consumption
- Cost history
- Provider costs
- Target costs
- Economic warnings
- Spending visibility

#### EV-05 — Quote & Reservation

Equivale a S27.

- Quote
- Reservation
- Reservation status
- Economic eligibility
- Estimated execution cost
- Reserved amount
- Expiration
- Reservation failures
- Policy limits
- Economic readiness

#### EV-06 — Metering & Settlement

Equivale a S28.

- Metering
- Usage records
- Settlement
- Receipts
- Execution costs
- Provider costs
- Settlement status
- Settlement failures
- Economic audit
- Historical consumption

### Entidades utilizadas

- ExecutionRun
- Runtime
- Deployment
- Worker
- AgentRevision
- Audit
- Event
- Log
- Evidence
- Policy finding
- Economic Contract
- Quote
- Reservation
- Metering
- Settlement
- Receipt

### APIs consumidas

- logs/events endpoints;
- audit endpoints;
- diagnostics endpoints;
- evidence endpoints;
- economic overview;
- quote;
- reserve;
- metering;
- settlement;
- receipts.

### Operações habilitadas

- consultar logs;
- filtrar eventos;
- auditar operações;
- diagnosticar falhas;
- visualizar evidências;
- consultar consumo;
- emitir/visualizar quote;
- acompanhar reservation;
- consultar settlement;
- consultar receipts.

### Dependências

Depende de:

- Fase 4 para gerar execução real;
- audit/evidence/event contracts;
- economic contract exposto pela Product API.

### Critério estratégico de sucesso

O usuário consegue reconstruir a história operacional de uma execução: o que foi planejado, o que foi autorizado, onde rodou, quem executou, quanto custou, quais evidências foram geradas e quais falhas ocorreram.

---

## Fase 6 — Control Plane Hardening

**Objetivo:** fechar a plataforma operacional, consolidar consistência de uso, governança sistêmica e aceitação final.

Essa fase deve permanecer aberta a corte. Partes de Administration, tenants avançados e production readiness podem migrar para EPIC posterior.

### Capacidades entregues

- policies visíveis;
- configuração operacional;
- administração básica;
- tenant/isolation visibility;
- UX consistency;
- estados transacionais;
- long-running operations;
- retry/recovery;
- stale state handling;
- regressões;
- E2E completo;
- acceptance gate.

### Requests conceituais agrupados

#### CP-01 — Policies & Governance

Equivale a S32.

- Policy catalog
- Policy detail
- Policy status
- Policy scope
- Eligibility rules
- Sandbox policies
- Runtime policies
- Economic policies
- Policy findings
- Policy usage

#### CP-02 — Tenants & Isolation

Equivale a S33.

- Tenant inventory
- Tenant detail
- Tenant Agents
- Tenant Workers
- Tenant Deployments
- Tenant Runtimes
- Tenant credentials
- Isolation state
- Workload boundaries
- Tenant diagnostics

**Candidato forte a EPIC posterior**, caso multi-tenancy avançada ainda não seja essencial na primeira superfície operacional.

#### CP-03 — ACS Configuration

Equivale a S34.

- Environment configuration
- Runtime settings
- Engine settings
- Worker settings
- Deployment defaults
- Economic defaults
- Governance defaults
- Feature availability
- System metadata
- Configuration diagnostics

**Candidato parcial a EPIC posterior**, principalmente configurações mutáveis sensíveis.

#### CP-04 — Operational Error Handling

Equivale a S35.

- Product API errors
- Validation errors
- Governance failures
- Runtime failures
- Worker failures
- Credential failures
- Economic failures
- Partial failures
- Retry
- Recovery
- Stale state
- State reconciliation

#### CP-05 — UX State & Operational Consistency

Equivale a S36.

- Loading states
- Empty states
- Error states
- Pending operations
- Long-running operations
- Polling / refresh
- State consistency
- Optimistic state boundaries
- Navigation consistency
- Action availability

#### CP-06 — Full Agent Lifecycle E2E

Equivale a S37.

- Create
- Compose
- Configure
- Credential
- Readiness
- Quote
- Reserve
- Deploy
- Activate
- Execute
- Observe
- Modify
- Revision
- Redeploy
- Stop
- Undeploy
- Archive / Delete
- Audit
- Settlement

#### CP-07 — Distributed Operations E2E

Equivale a S38.

- Multiple Workers
- Multiple Agents
- Multiple Runtimes
- Target allocation
- Workload isolation
- Tenant isolation
- Worker failure
- Runtime recovery
- Deployment reconciliation
- Concurrent executions

#### CP-08 — EPIC-11 Acceptance

Equivale a S39.

- Product API regression
- Control Plane regression
- Worker regression
- Runtime regression
- Governance regression
- Economic regression
- OpenClaw integration regression
- UI lifecycle regression
- CLI-independent workflow
- DEV readiness validation
- Distributed runtime validation
- EPIC acceptance gate

### Entidades utilizadas

- Policy
- Eligibility
- Sandbox
- Tenant
- Worker
- Runtime
- Deployment
- Agent
- Credential
- Economic Contract
- Configuration
- Audit
- Evidence

### APIs consumidas

- policy endpoints;
- tenant/isolation endpoints, se disponíveis;
- configuration endpoints;
- error model;
- lifecycle endpoints;
- E2E validation endpoints ou test harness;
- readiness endpoints.

### Operações habilitadas

- visualizar políticas;
- inspecionar isolamento;
- consultar configuração;
- testar recovery;
- executar regressão;
- validar E2E;
- validar acceptance da EPIC.

### Dependências

Depende de:

- todas as fases anteriores;
- maturidade suficiente da Product API;
- decisão sobre escopo de Administration e Tenants.

### Critério estratégico de sucesso

O ACS passa a ter uma superfície operacional consistente, recuperável, testável e validada por fluxo completo, não apenas por telas isoladas.

---

# 5. Dependency Graph

## Grafo macro

```text
Operational Awareness
        │
        ▼
Agent Lifecycle
        │
        ▼
Composition Surface
        │
        ▼
Operational Execution
        │
        ├──────────────┐
        ▼              ▼
Operational Evidence   Economics / Economic Evidence
        │              │
        └──────┬───────┘
               ▼
Control Plane Hardening
```

## Leitura do grafo

### Operational Awareness bloqueia tudo

Sem dashboard, health, readiness e navegação base, as demais fases ficam sem contexto operacional.

### Agent Lifecycle bloqueia Composition Surface

A composição precisa de um Agent ou de um contexto de AgentRevision/AgentComposition para ser operacionalmente útil.

### Composition Surface bloqueia Operational Execution

Deploy sem composição validável cria risco de expor operações que o usuário ainda não consegue preparar corretamente.

### Operational Execution gera insumos para Evidence

Logs, audit, diagnostics, settlement e evidence dependem de ações reais: readiness, deploy, runtime, execution e worker operations.

### Economics pode ser paralelo parcial

Economics pode começar em paralelo com Evidence se houver Product API suficiente para quote/reservation/metering/settlement. Porém, sua integração completa depende do fluxo de execução.

### Control Plane Hardening depende de fluxo real

Hardening sem fluxo operacional concreto vira polimento prematuro. Deve consolidar comportamento observado ao longo das fases anteriores.

---

# 6. Ordem de execução recomendada

## Ordem principal

1. Operational Awareness
2. Agent Lifecycle
3. Composition Surface
4. Credentials & Connections
5. Readiness & Deployment Planning
6. Deploy & Deployment Operations
7. Runtime / Execution / Worker Operations
8. Operational Evidence
9. Economics / Economic Evidence
10. Governance / Administration mínimo
11. Hardening e Acceptance

## Ordem operacional detalhada

### Primeiro corte: navegação e estado

- System shell
- Dashboard
- Health
- Readiness
- Blockers
- Evidence summary

### Segundo corte: Agent como entidade operacional

- Agent inventory
- Agent detail
- Agent create/edit
- Agent revision/lifecycle

### Terceiro corte: composição

- Role/Profile
- Capabilities
- Skills
- Tools/Plugins
- Engines/Providers/Models

### Quarto corte: pré-execução

- Credentials
- Provider connections
- Readiness
- ExecutionPlan
- Deployment preview

### Quinto corte: execução

- Deploy
- Activate/deactivate
- Runtime
- ExecutionRun
- Worker assignment
- Worker state

### Sexto corte: evidência

- Logs
- Events
- Audit
- Diagnostics
- Readiness evidence
- Runtime/deployment evidence

### Sétimo corte: economia

- Economic overview
- Quote
- Reservation
- Metering
- Settlement
- Receipts

### Oitavo corte: governança e hardening

- Policies
- Configuration
- Tenant/isolation visibility
- Error handling
- State consistency
- E2E
- Acceptance

---

# 7. Backlog conceitual revisado

A numeração abaixo substitui a leitura rígida S01–S39 por agrupamentos de fluxo. Os S01–S39 continuam rastreáveis, mas não são contrato final.

## Milestone A — Operational Awareness

### OA-01 — System Shell & Navigation

Origem: S01

### OA-02 — System Dashboard

Origem: S01

### OA-03 — Readiness & Health Overview

Origem: S02

---

## Milestone B — Agent Lifecycle

### AL-01 — Agent Inventory

Origem: S03

### AL-02 — Agent Detail & Operational Summary

Origem: S04 + partes de S07/S08

### AL-03 — Agent Create & Initial Composition

Origem: S05

### AL-04 — Agent Edit & Draft Changes

Origem: S06

### AL-05 — Agent Revision & Lifecycle Actions

Origem: S07 + S08

---

## Milestone C — Composition Surface

### CS-01 — Role & Profile Composition

Origem: S09 + S10

### CS-02 — Capability Model

Origem: S11

### CS-03 — Skills Management

Origem: S12

### CS-04 — Tools & Plugins Management

Origem: S13

### CS-05 — Engines/Providers/Models

Origem: S14

---

## Milestone D — Operational Execution

### OE-01 — Credentials & Connections

Origem: S15 + S16

### OE-02 — Readiness & Deployment Planning

Origem: S17 + S18

### OE-03 — Deploy & Deployment Operations

Origem: S19 + S20

### OE-04 — Runtime & Execution Runs

Origem: S21 + S22 + S23

### OE-05 — Worker Operations

Origem: S24 + S25

---

## Milestone E — Operational Evidence & Economics

### EV-01 — Logs & Events

Origem: S29

### EV-02 — Audit Trail

Origem: S30

### EV-03 — Diagnostics & Evidence

Origem: S31

### EV-04 — Economic Overview

Origem: S26

### EV-05 — Quote & Reservation

Origem: S27

### EV-06 — Metering & Settlement

Origem: S28

---

## Milestone F — Control Plane Hardening

### CP-01 — Policies & Governance

Origem: S32

### CP-02 — Tenants & Isolation

Origem: S33

### CP-03 — ACS Configuration

Origem: S34

### CP-04 — Operational Error Handling

Origem: S35

### CP-05 — UX State & Consistency

Origem: S36

### CP-06 — Full Agent Lifecycle E2E

Origem: S37

### CP-07 — Distributed Operations E2E

Origem: S38

### CP-08 — EPIC-11 Acceptance

Origem: S39

---

# 8. Dependências críticas entre grupos

## OA → AL

Agent Lifecycle depende de:

- shell de navegação;
- Product API connectivity;
- padrões de estado;
- dashboard base para retorno contextual.

## AL → CS

Composition Surface depende de:

- Agent identity;
- AgentRevision;
- AgentComposition;
- contexto de edição/draft.

## CS → OE

Operational Execution depende de:

- composição válida;
- Role/Profile resolvidos;
- capabilities efetivas;
- Skills/Tools/Plugins compatíveis;
- engine/provider/model selecionáveis.

## OE-01 → OE-02

Readiness depende de:

- credentials;
- provider connections;
- connection health;
- target/provider availability.

## OE-02 → OE-03

Deploy depende de:

- readiness;
- eligibility;
- sandbox validation;
- economic readiness ou quote;
- deployment plan.

## OE-03 → OE-04

Runtime depende de:

- deployment criado;
- target selecionado;
- worker atribuído;
- runtime instance criada ou reconciliável.

## OE-04 → OE-05

Worker operations dependem parcialmente de runtime/execution para workload visibility, mas inventory de workers pode começar antes.

## OE → EV

Operational Evidence depende de:

- deploys;
- runtime operations;
- execution runs;
- failures reais;
- audit events.

## OE/EV → Economics

Economics depende de:

- quote/reservation antes do deploy;
- metering/settlement após execution;
- audit para rastreabilidade.

## EV/Economics → CP

Hardening depende de:

- fluxos reais;
- erros reais;
- estados long-running reais;
- regressões sobre comportamento observável.

---

# 9. Tópicos candidatos a EPIC posterior

## Fortes candidatos a EPIC-12

### 1. Multi-tenancy avançada

- Tenant administration completa
- Tenant policies mutáveis
- Tenant billing isolado
- Tenant credential vault avançado
- Tenant workload governance avançada

Motivo: depende de maturidade maior de auth, permissioning e production readiness.

### 2. Production Administration

- administração produtiva sensível;
- RBAC avançado;
- permissões por ação;
- gestão de usuários;
- secrets reais;
- compliance/auditoria avançada.

Motivo: a EPIC-10 declarou Production Ready = NO.

### 3. Advanced Worker Fleet Management

- auto-scaling;
- capacity planning;
- scheduling avançado;
- worker pools;
- worker placement strategy;
- drain policies avançadas.

Motivo: pode extrapolar a primeira superfície operacional.

### 4. Advanced Observability

- traces distribuídos completos;
- dashboards customizáveis;
- alerting;
- incident management;
- SLO/SLA;
- retention policies;
- correlation avançada.

Motivo: a primeira versão precisa diagnosticar, não necessariamente ser uma plataforma completa de observabilidade.

### 5. Advanced Economic Operations

- billing completo;
- invoices;
- planos;
- pricing configurável;
- cost forecasting avançado;
- budgets por tenant;
- settlement financeiro externo.

Motivo: EPIC-11 deve expor o contrato econômico operacional, não virar produto financeiro completo.

---

# 10. Hardening contínuo

Alguns tópicos não deveriam ser tratados como uma sprint única isolada, mas como preocupação recorrente ao longo de toda a EPIC.

## Hardening contínuo por fase

### Error handling

Deve começar em OA e evoluir até CP.

- Product API errors
- validation errors
- operation failures
- stale state
- retry
- recovery

### UX state consistency

Deve existir desde o primeiro fluxo.

- loading
- empty
- error
- pending
- disabled action
- long-running operation
- refresh state

### Audit awareness

Deve começar leve em Agent Lifecycle e ficar completo em Evidence.

### Readiness visibility

Deve aparecer desde Operational Awareness e se aprofundar em Operational Execution.

### Economic visibility

Deve aparecer como summary cedo, mas operações econômicas completas podem vir depois.

### Regression

Deve crescer progressivamente, não apenas no final.

---

# 11. Validações técnicas prévias

Antes de detalhar as sprints, há pontos que exigem validação técnica.

## VT-01 — Product API Coverage

Validar quais endpoints já existem para:

- dashboard;
- readiness global;
- Agent CRUD;
- Agent revisions;
- Agent composition;
- roles;
- profiles;
- capabilities;
- skills;
- tools;
- plugins;
- providers;
- engines;
- credentials;
- deployments;
- runtimes;
- execution runs;
- workers;
- economics;
- logs;
- audit;
- diagnostics;
- policies.

Resultado esperado:

- mapa endpoint → fase;
- gaps por fase;
- endpoints read-only vs mutating;
- endpoints mock/sandbox vs reais.

## VT-02 — Error Model

Validar se a Product API já possui modelo consistente para:

- validation errors;
- readiness blockers;
- governance failures;
- economic failures;
- runtime failures;
- worker failures;
- credential failures;
- partial failures;
- long-running operations.

Resultado esperado:

- contrato de erro mínimo para UI;
- campos obrigatórios;
- mapping para UX.

## VT-03 — Operation State Model

Validar como ações long-running serão representadas.

- deploy;
- redeploy;
- runtime start/stop;
- worker drain;
- credential validation;
- readiness recheck;
- quote/reserve;
- settlement.

Resultado esperado:

- operation id;
- status;
- progress;
- result;
- error;
- retryability;
- audit correlation.

## VT-04 — Readiness Contract

Validar estrutura dos readiness reports.

- DEV readiness;
- Distributed Runtime readiness;
- Production readiness;
- Agent readiness;
- Deployment readiness;
- Economic readiness;
- Credential readiness;
- Sandbox readiness;
- Policy eligibility.

Resultado esperado:

- formato único para findings;
- severity;
- blocker/warning/info;
- evidence;
- remediation;
- affected entity.

## VT-05 — Evidence / Audit Correlation

Validar como correlacionar:

- Agent;
- AgentRevision;
- Deployment;
- Runtime;
- Worker;
- ExecutionRun;
- Economic reservation;
- Settlement;
- Audit event;
- Logs.

Resultado esperado:

- correlation id;
- entity references;
- timeline mínimo;
- evidence links.

## VT-06 — Frontend Runtime Strategy

Validar se a UI será:

- SPA;
- React/Vite;
- Next;
- Vinext/Cloudflare;
- integrada ao app existente;
- deployada via Cloudflare Pages/Workers.

Resultado esperado:

- target correto;
- build strategy;
- environment config;
- API base URL;
- auth placeholder ou strategy futura.

## VT-07 — Security / Secrets Boundary

Validar como credentials serão expostas.

A UI não deve exibir segredo bruto.

Resultado esperado:

- secret reference display;
- credential metadata;
- redaction rules;
- create/update flow;
- validation flow;
- audit flow.

## VT-08 — Economics Boundary

Validar se Economics será:

- fase própria;
- subcamada de Operational Evidence;
- parte de Readiness/Deployment;
- híbrido.

Resultado esperado:

- decisão de fronteira;
- quote/reserve antes da execução;
- meter/settle depois da execução;
- evidence/audit integration.

---

# 12. Riscos de sobreposição entre domínios

## Risco 1 — Agent Detail virar dashboard paralelo

Agent Detail pode tentar mostrar tudo: composition, runtime, economics, audit, logs e readiness.

Mitigação:

- Agent Detail deve mostrar resumo e links contextuais.
- A operação profunda pertence aos fluxos dedicados.

## Risco 2 — Composition Studio virar múltiplos domínios desconectados

Roles, Profiles, Skills, Tools, Plugins, Providers e Engines podem virar páginas isoladas.

Mitigação:

- tratar tudo como composição;
- mostrar impacto sobre AgentComposition;
- sempre conectar capabilities, requirements e compatibility.

## Risco 3 — Credentials e Connections se misturarem

Credential é segredo/referência.  
Connection é estado operacional testável.

Mitigação:

- separar claramente create/update credential de validate/test connection;
- health pertence a connection, não ao secret.

## Risco 4 — Deployment, Runtime, ExecutionRun e Worker se confundirem

Deployment não é Runtime.  
Runtime não é ExecutionRun.  
Worker não é ExecutionTarget.  
ExecutionRun não é Agent.

Mitigação:

- manter timeline operacional;
- cada entidade com identidade própria;
- views relacionais, não fusão conceitual.

## Risco 5 — Economics virar financeiro cedo demais

O contrato econômico pode ser confundido com billing completo.

Mitigação:

- EPIC-11 deve expor quote, reserve, meter, settle e receipts operacionais;
- billing, invoices, plans e budgets avançados podem ir para EPIC posterior.

## Risco 6 — Observability virar produto paralelo

Logs, audit e diagnostics podem crescer demais.

Mitigação:

- evidência deve apoiar troubleshooting operacional;
- observability avançada fica fora da primeira versão.

## Risco 7 — Administration expandir a EPIC sem controle

Tenants, policies, configuration, permissions e production admin podem explodir escopo.

Mitigação:

- manter Administration mínimo;
- priorizar visibilidade;
- mutações sensíveis só após readiness técnica;
- mover production admin para EPIC posterior se necessário.

## Risco 8 — Reimplementar backend na UI

A UI pode começar a resolver lógica que pertence ao Control Plane.

Mitigação:

- Product API é boundary;
- UI consome estado, não recalcula verdade;
- readiness, eligibility, economics e governance vêm da API.

---

# 13. EPIC Boundary Review

## Pertence claramente à EPIC-11

- Operational dashboard
- Health/readiness visibility
- Agent inventory/detail/create/edit
- Agent revision/lifecycle surface
- Composition visibility and management
- Skills/tools/plugins assignment
- Provider/engine/model selection visibility
- Credential and connection operational surface
- Agent readiness
- Deployment planning
- Deploy/redeploy/undeploy operations
- Runtime visibility/control
- ExecutionRun visibility
- Worker visibility/basic operations
- Logs/events/audit/diagnostics básicos
- Economic operational visibility
- Quote/reserve/meter/settle visibility if Product API supports it
- Error/loading/empty/pending states
- E2E lifecycle validation

## Pode pertencer à EPIC-11, mas precisa de validação

- Credential creation/update flows
- Provider connection validation
- Worker registration
- Worker drain
- Rollback
- Runtime restart
- Economic reservation mutation
- Settlement operations
- Policy visibility
- Configuration visibility
- Tenant/isolation visibility

## Provavelmente pertence à EPIC-12 ou posterior

- Production-grade authentication
- RBAC avançado
- Tenant management completo
- Secrets management avançado
- Billing completo
- Custom dashboards
- Alerting/SLO
- Worker autoscaling
- Fleet scheduling avançado
- Compliance reporting avançado
- Production administration console

## Hardening contínuo

- error model;
- UX state consistency;
- operation state handling;
- stale state reconciliation;
- partial failure recovery;
- audit correlation;
- regression suite;
- E2E validation.

## Depende de readiness posterior da EPIC-10

- Production readiness;
- autenticação final;
- persistência produtiva;
- secrets produtivos;
- observabilidade distribuída completa;
- permissioning avançado;
- multi-tenancy produtiva.

---

# 14. Primeiro corte provável para execução

A primeira implementação real da EPIC-11 deve começar pequena e fundacional.

## Milestone A — Operational Awareness

### Sprint A01 — System Shell & Product API Connectivity

Requests:

- App shell operacional
- Navegação principal
- Product API connectivity check
- Environment context
- Global loading state
- Global error state
- Base layout
- Route structure para macro-fases
- Placeholder control plane sections

Objetivo:

> Abrir a superfície operacional do ACS e confirmar que ela consegue se conectar ao boundary correto: Product API.

### Sprint A02 — System Dashboard

Requests:

- System overview
- Agent summary
- Deployment summary
- Runtime summary
- Worker summary
- ExecutionRun summary
- Critical blockers
- Operational warnings
- Empty/loading/error states por card

Objetivo:

> O usuário consegue ver o estado operacional agregado do ACS.

### Sprint A03 — Global Readiness & Health

Requests:

- DEV readiness
- Distributed Runtime readiness
- Production readiness
- Readiness blockers
- Readiness evidence
- Health indicators
- Component status
- Refresh/recheck
- Product API health
- Runtime connectivity

Objetivo:

> O usuário consegue entender se o ACS está pronto para operar, quais blockers existem e quais evidências sustentam o estado apresentado.

---

# 15. Sequência provável pós-Milestone A

## Milestone B — Agent Lifecycle

### Sprint B01 — Agent Inventory

### Sprint B02 — Agent Detail & Operational Summary

### Sprint B03 — Agent Create/Edit

### Sprint B04 — Agent Revision & Lifecycle Actions

## Milestone C — Composition Surface

### Sprint C01 — Role/Profile Composition

### Sprint C02 — Capability Model

### Sprint C03 — Skills Management

### Sprint C04 — Tools/Plugins Management

### Sprint C05 — Engines/Providers/Models

## Milestone D — Operational Execution

### Sprint D01 — Credentials & Connections

### Sprint D02 — Readiness & Deployment Planning

### Sprint D03 — Deploy & Deployment Operations

### Sprint D04 — Runtime & Execution Runs

### Sprint D05 — Worker Operations

## Milestone E — Operational Evidence & Economics

### Sprint E01 — Logs & Events

### Sprint E02 — Audit Trail

### Sprint E03 — Diagnostics & Evidence

### Sprint E04 — Economic Overview

### Sprint E05 — Quote & Reservation

### Sprint E06 — Metering & Settlement

## Milestone F — Control Plane Hardening

### Sprint F01 — Policies & Governance

### Sprint F02 — Administration Boundary Review

### Sprint F03 — Operational Error Handling

### Sprint F04 — UX State & Consistency

### Sprint F05 — Full Agent Lifecycle E2E

### Sprint F06 — Distributed Operations E2E

### Sprint F07 — EPIC Acceptance

---

# 16. Resultado do planejamento

A EPIC-11 fica reorganizada em:

```text
6 macro-fases
6 milestones operacionais
30 requests/sprints conceituais aproximadas
```

Em vez de:

```text
11 milestones
39 sprints rígidas
```

Essa redução não remove escopo funcional. Ela reduz sobreposição, melhora ordem de dependência e transforma a EPIC em um fluxo operacional executável.

## Resumo da nova estrutura

```text
A. Operational Awareness
B. Agent Lifecycle
C. Composition Surface
D. Operational Execution
E. Operational Evidence & Economics
F. Control Plane Hardening
```

## Leitura estratégica

A EPIC-11 deve entregar progressivamente:

1. entender o sistema;
2. entender e administrar Agents;
3. compor Agents corretamente;
4. preparar execução governada;
5. executar e operar runtimes/workers;
6. observar evidências e economia;
7. endurecer, reconciliar e validar o ciclo completo.

---

# 17. Definition of Done estratégica da EPIC-11

A EPIC-11 pode ser considerada concluída quando:

- o usuário consegue navegar pela superfície operacional do Control Plane;
- o usuário consegue entender health, readiness, blockers e evidence;
- o usuário consegue localizar, criar, editar e administrar Agents;
- o usuário consegue entender e alterar composição de Agents;
- o usuário consegue validar readiness antes do deploy;
- o usuário consegue planejar e executar deploy em ambiente suportado;
- o usuário consegue visualizar runtime, execution runs e workers;
- o usuário consegue entender logs, events, audit e diagnostics básicos;
- o usuário consegue visualizar o contrato econômico operacional;
- o usuário consegue executar um fluxo completo sem depender da CLI para o caminho operacional normal;
- a CLI permanece como ferramenta administrativa/diagnóstica, não como interface obrigatória;
- os fluxos principais possuem estados de loading, empty, error, pending e recovery;
- os fluxos E2E passam em ambiente local/sandbox;
- o readiness final permanece honesto: DEV/Distributed Runtime podem estar prontos, Production Ready só se os blockers reais forem resolvidos.

---

# 18. Conclusão

A EPIC-11 deve ser executada como a primeira materialização do ACS enquanto plataforma operacional.

Ela não deve tentar resolver Production Readiness completa.  
Ela não deve reimplementar o Control Plane.  
Ela não deve virar uma coleção de telas desconectadas.

Ela deve transformar os domínios consolidados da EPIC-10 em uma experiência operacional coerente, governada e observável.

A melhor formulação da EPIC-11 é:

> **EPIC-11 entrega a primeira superfície de operação, composição, execução e evidência do ACS Control Plane sobre a Product API.**
