# GPBC Footer Redesign Spec
Date: 2026-02-20
Status: Ready for Product + Engineering handoff

## 1) Product Goals
- Create one trustworthy, modern, mobile-first footer system across all public pages.
- Improve conversion paths to first actions (visit, watch, prayer).
- Improve wayfinding, trust signals, and accessibility consistency.

## 2) Information Architecture (Footer IA)

### A. CTA Band (Top of Footer)
Primary intent: first-action conversion
- Plan a Visit
- Watch Online
- Prayer Request

### B. Main Footer Columns (4 max)
1. Church Identity
- Logo
- Church name
- One-line mission statement

2. Visit
- Address
- Get Directions (Google Maps)
- Service times

3. Connect
- Phone
- Primary/secondary email
- Social icons (YouTube default required)

4. Resources
- Sermons
- Events
- Give
- Ministries

### C. Bottom Bar
- Dynamic copyright
- Privacy
- Terms
- Optional powered-by line

## 3) Content Strategy
- Keep copy short and confidence-building.
- Prioritize church-first actions over deep sitemap links.
- Keep legal links persistent but compact.
- Social in icon-first format with explicit accessible labels.

## 4) Component Model
Single rendered component: `SiteFooter` (runtime-rendered)
- Source: `platform-runtime.js` (`buildSiteFooterHtml` + `initSiteFooter`)
- Config source: `config/site-footer.config.json`

Config sections:
- `church`
- `visit`
- `connect`
- `cta.links`
- `resources`
- `social`
- `legal`
- `poweredBy`

## 5) Visual System Tokens
Implemented in `css/site-footer.css`
- Typography scale
: CTA title `~1.15–1.45rem`; column titles `1rem`; metadata `~0.82–0.93rem`
- Spacing rhythm
: 4/8/12/16-based spacing with compact cards and clear section separation
- Icon system
: Inline optimized SVG; social targets `44x44`
- Color direction
: Navy/blue base with gold accent for trust/action emphasis
- Interaction
: Visible focus rings, hover lift, and reduced-motion support

## 6) Responsive Rules (Mobile-First)
- Base mobile: single-column stacked CTA + stacked columns.
- >=680px: CTA buttons become 3-column row; footer columns become 2-column grid.
- >=1080px: CTA splits into text/actions; footer columns become 4-column grid.
- All interactive controls meet `min-height: 44px`.

## 7) Accessibility Requirements
- Semantic landmark: `<footer role="contentinfo" id="page-footer">`.
- Structured headings for each column and CTA section.
- Social links require explicit `aria-label` values.
- External links open in new tab with `rel="noopener noreferrer"`.
- Keyboard-visible focus styles for all footer actions.
- Skip-to-footer support via runtime-injected `Skip to footer` link.
- Reduced-motion compliance for footer transitions.

## 8) Behavioral Requirements
- Footer renders on all full-document public routes from shared runtime.
- If route has existing footer markup, runtime replaces it with shared component.
- If route has no footer, runtime appends shared component.
- Admin/CMS route can be excluded from auto-footer policy.

## 9) QA / Acceptance Criteria
- Shared footer appears on every public route.
- Footer content is driven by one config file.
- All footer config links validate (CI link-check pass).
- Social links are labeled and keyboard accessible.
- Mobile layout remains readable, tappable, and aligned.

## 10) Non-Goals
- No redesign of unrelated header/body sections.
- No third-party social widgets.
- No page-specific footer variants.
