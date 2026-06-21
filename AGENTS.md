# STEMSketch Author rules (enterprise studio)

Build contributions in layer order: ontology → ops → golden → views/figures → templates (ScenarioSpec).

- Use **ScenarioSpec** in `templates/*.yaml`, not JavaScript DSL.
- Validate with **StemSketch: Validate Pack** (calls Author Services).
- Sign bundles locally; verify via Author Services.

See platform `docs/author-enduser-boundary.md` for persona boundaries.
