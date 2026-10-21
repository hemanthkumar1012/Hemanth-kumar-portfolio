# Performance Guidelines

## Goals
- First Contentful Paint < 1.5s on mid-tier mobile
- Lighthouse Performance score ≥ 90

## Practices used
- No external JS frameworks
- System + Google Fonts with `display=swap` and preconnect
- CSS-only animations where possible
- IntersectionObserver instead of scroll listeners for reveals
- Optimized images (WebP preferred)
- Minimal third-party requests

## Future ideas
- Inline critical CSS
- Prefetch key project demo links
- Service worker for offline shell (optional)
