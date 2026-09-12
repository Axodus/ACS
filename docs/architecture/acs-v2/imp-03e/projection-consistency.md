# Projection consistency and rebuild

No new projection storage was introduced. Reads are transactionally backed by the canonical PostgreSQL tables. The read layer is disposable by construction: rebuilding requires no projection data or external provider because the API reads canonical state directly.
