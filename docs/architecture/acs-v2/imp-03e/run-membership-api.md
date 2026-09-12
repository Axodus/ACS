# Run membership API

`GET /api/v1/runs/:id/workforce` returns the Run, admitted Workforce revision, current head as a separate value, and the immutable membership snapshot. `GET /api/v1/runs/:id/membership` returns the snapshot members. Legacy Runs without Workforce binding return a null Workforce view.
