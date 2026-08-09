# EPIC-10 S10 — BYOK Provider Integration

S10 implements the first BYOK path with a provider-specific adapter.

## Implemented pieces

- RegistryBackedCredentialProvider
- ProviderHttpTransport
- FetchProviderHttpTransport
- ProviderAuthenticationError
- ProviderRateLimitError
- ProviderUnavailableError
- OpenAiByokModelProvider

## Architecture

CredentialConnection
→ RegistryBackedCredentialProvider
→ SecretStore
→ OpenAiByokModelProvider
→ ProviderHttpTransport
→ provider API

Raw API keys remain inside SecretStore. The provider adapter only receives a short-lived lease plus a secret reference and resolves the secret at the transport boundary.

## Current provider slice

The first concrete provider is OpenAI BYOK.

The adapter uses:

- bearer authorization
- model discovery through the provider models surface
- provider-specific error mapping
- configurable model catalog metadata

This is enough to prove the BYOK control-plane architecture without requiring paid live test traffic.

## Important boundaries

S10 does not implement:

- billing or Neurons settlement
- Anthropic or Gemini adapters
- OAuth login
- frontend credential management
- automatic discovery of local credentials

If a future live integration test is added, it must use an explicitly configured credential connection. It must never auto-import arbitrary local API keys.
