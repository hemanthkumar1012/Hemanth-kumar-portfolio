# Projects Data

Projects are defined in `projects.json` at the repository root.

Each entry contains:
- `num` — display index
- `title`
- `status`
- `desc` — array of bullet points
- `stack` — tech string
- `links` — Live / GitHub URLs

When adding a new project:
1. Append a new object to the JSON array
2. Keep descriptions concise (3–4 lines max)
3. Prefer live demo links when available
4. Update the visual cards in `portfolio-v2.html` if the art / filter categories need expansion
