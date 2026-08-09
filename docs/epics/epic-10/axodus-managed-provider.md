# EPIC-10 S09 — Axodus Managed Model Provider

S09 implements the first concrete ModelProvider: Axodus Managed.

## Position in the architecture

Agent
→ ACS
→ Axodus Managed ModelProvider
→ Axodus gateway abstraction
→ upstream model infrastructure

The provider remains a control-plane abstraction. It does not assume a production gateway endpoint and it does not expose upstream credentials.

## Implemented S09 contracts

- AxodusManagedModelProvider
- AxodusModelGateway
- StaticAxodusModelGateway

The static gateway is a deterministic DEV/test implementation. It proves the managed-provider contract without inventing a production service.

## Managed credential ownership

Managed routing uses a managed connection type when a connection is represented. This is not a user BYOK credential.

The provider remains stable even if Axodus later changes upstream routing.

## Current behavior

- provider id: axodus
- provider type: managed/private
- supported connection type: managed
- model identities remain Axodus-facing, such as axodus/managed-default

S09 still does not implement billing, live gateway infrastructure, or upstream provider calls.
