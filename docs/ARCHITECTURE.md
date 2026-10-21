# Architecture

## Overview

Static site deployed on GitHub Pages.

```
index.html          → entry (redirects / SEO)
portfolio-v2.html   → main advanced single-page experience
projects.json       → structured project data
assets/             → images & media
docs/               → design, a11y, performance notes
```

## Rendering

- All layout & interaction in one HTML file for zero-build simplicity
- Optional future: load `projects.json` dynamically for easier updates
- CSS custom properties drive the design tokens
- Vanilla JS modules for filters, tilt, scroll progress, active nav

## Deployment

GitHub Actions / Pages workflow deploys the `main` branch root.
