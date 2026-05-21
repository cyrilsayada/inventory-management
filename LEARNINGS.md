# LEARNINGS.md

Running log of bugs hit, root causes, and the rule that prevents recurrence. **Read this before starting work.** **Append a new entry every time a bug is fixed or a non-obvious behavior is discovered.**

## How to use

- **Before coding:** scan the table of contents and any entry touching files you'll modify.
- **After fixing a bug:** add an entry below. Be specific — file paths, line numbers, the exact mistake, and a one-line rule.
- **No vague entries.** "Be careful with dates" is useless. "Calling `.getMonth()` on `new Date(undefined)` returns `NaN` — validate `date.getTime()` first" is useful.
- **One bug, one entry.** If a single mistake caused multiple symptoms, that's still one entry.

## Entry template

```
### YYYY-MM-DD — <short title>
**Symptom:** what you observed
**Root cause:** the actual mistake (file:line if known)
**Fix:** what changed
**Rule:** one-line prevention for next time
**Tags:** #area #file #symptom
```

## Table of contents

<!-- Update when adding entries -->

- 2026-05-21 — GitHub PR-create URL defaults base to UPSTREAM on a fork, not to the fork itself
- 2026-05-21 — Stale Vite dev server didn't pick up new Tailwind/PostCSS config — UI rendered unstyled
- 2026-05-21 — Restocking Place Order double-submitted on a single programmatic click

---

## Entries

_Append new entries here, newest first._

### 2026-05-21 — GitHub PR-create URL defaults base to UPSTREAM on a fork, not to the fork itself

**Symptom:** After pushing `feat/<branch>` to `origin` (cyrilsayada/inventory-management — a fork of beck-source/inventory-management), I opened the PR-create page via `https://github.com/cyrilsayada/inventory-management/pull/new/feat/<branch>`. GitHub auto-redirected to a PR-compose page with **base = beck-source/inventory-management:main**, not cyrilsayada:main. The user clicked through without noticing the base and ended up with a PR opened against the workshop's upstream (#99 on beck-source) instead of their own fork. They closed it and were angry I had pushed to "the main app."
**Root cause:** When you visit `/pull/new/<branch>` on a fork, GitHub's default base is the _parent_ repo (upstream), not the fork itself. This is GitHub's intentional default — it assumes contributors to a fork want to send their work back upstream. For a workshop where the user owns the fork and `main` _is_ the fork's `main`, this default is wrong and silently misleading.
**Fix:** Always construct the PR-create URL with the fork explicitly named as the base, using the `compare` route:
`https://github.com/<owner>/<repo>/compare/main...<branch>?expand=1`
where `<owner>` is the fork owner (cyrilsayada), not the upstream owner. The `compare` route locks the base to that repo. The `pull/new` shortcut does NOT.
**Rule:** **Never use `/pull/new/<branch>` for PR-create URLs on a fork. Always use `/compare/<base-branch>...<head-branch>?expand=1` with the fork's owner in the URL.** When opening any PR via GitHub MCP, set both `owner` (the fork) AND `base` (the fork's branch, usually `main`) explicitly — never rely on defaults. If the user has a fork remote pattern (`origin` = fork, `upstream` = parent), the PR ALWAYS targets `origin`, never `upstream`, unless explicitly directed.
**Tags:** #github #pr #fork-workflow #url-defaults

### 2026-05-21 — Stale Vite dev server didn't pick up new Tailwind/PostCSS config — UI rendered unstyled

**Symptom:** After installing Tailwind v3 (`tailwindcss`, `postcss`, `autoprefixer`) and adding `postcss.config.js` + `tailwind.config.js` + `src/index.css`, the app at `http://localhost:3000` rendered with no utility classes applied (sidebar stacked as plain inline links, no navy background, no flex layout). Meanwhile a second Vite instance spawned later at `:3002` rendered correctly.
**Root cause:** The `npm run dev` process that bound `:3000` was started BEFORE `postcss.config.js` existed. Vite reads `postcss.config.js` ONCE at startup. HMR reloads Vue files and even updates `tailwind.config.js` content paths, but it does NOT re-bootstrap the PostCSS plugin chain. Adding a brand-new build-pipeline plugin (Tailwind, Autoprefixer, anything in `postcss.config.js`) requires a full Vite restart. Worse, the second `npm run dev` invocation didn't kill the first — it failed to bind `:3000` and silently fell through to `:3002`, leaving two instances with the user landing on the broken one by default.
**Fix:** Killed every Vite process listening on `:3000`–`:3003` (`Get-NetTCPConnection -LocalPort … | Stop-Process`), then ran `npm run dev` fresh from `client/`. Vite re-read `postcss.config.js`, Tailwind generated utilities, `:3000` rendered the Sia design correctly.
**Rule:** **When adding ANY build-pipeline dependency (Tailwind, PostCSS plugins, new Vite plugins, env-var-driven imports), kill the dev server and restart it. HMR is for source files, not for config.** And before `npm run dev`, ALWAYS check what's already on the target ports — Vite will silently spawn on a different port if the canonical one is busy, splitting your session across two instances.
**Tags:** #frontend #vite #tailwind #postcss #dev-server #port-binding
**Symptom:** Smoke-testing the new Restocking tab via Playwright `.click()`, a single Place Order click produced two identical orders (ORD-2025-0251 and ORD-2025-0252) in the Submitted Orders section.
**Root cause:** `placeOrder()` in `client/src/views/Restocking.vue` (line ~196) toggled `submitting.value = true` and the template bound `:disabled="!canPlaceOrder || submitting"`, BUT HTML `disabled` is only enforced for user-driven pointer events. Programmatic `element.click()` (and some double-tap / stale-event sequences) call the bound `@click` handler directly, bypassing the disabled check. The async `await api.submitOrder(...)` left a microtask window during which a second invocation entered the function before `submitting` finished propagating to the DOM.
**Fix:** Added `if (submitting.value) return` as the FIRST line of `placeOrder()` in `Restocking.vue`. This is a re-entry guard at the function level, idempotent regardless of how the handler is triggered.
**Rule:** **Any async submit handler bound to a button MUST start with an in-flight re-entry guard at the function level — not just `:disabled` on the button.** `:disabled` is UX, the guard is correctness.
**Tags:** #frontend #vue #async #idempotency #Restocking.vue
