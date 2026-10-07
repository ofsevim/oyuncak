# Gece Bahçesi Implementation Plan
> For agentic workers: implement inline with superpowers:executing-plans; independent whole-change review at the end.
**Goal:** Apply the approved night garden design, improve games, modernize safe dependencies and prove checks pass.
**Architecture:** Keep the existing router/catalog/PWA/Firebase flow. Share visual tokens and game artwork; pure Tetris/Snake logic and a standalone Runner renderer separate game behavior from presentation.
**Tech Stack:** React, TypeScript, Vite, Tailwind, Firebase, Playwright.
**Spec:** ../specs/2026-10-07-gece-bahcesi.md
## Global Constraints
- Firebase Spark compatible; no billing upgrades or Cloud Functions deployment.
- No APK work. Preserve all 21 game routes, offline access and local data.
- Keyboard, reduced-motion, 44px controls and 320px layouts.
## Review Focus
- Pause/resume and held input must not change gameplay while paused.
- Tetris hold and Snake tail edge cases.
- Saved drawings/favorites must survive reload and theme changes.
- Offline deep routes and tank iframe assets must still load.
- Filters with no matches must offer a clear recovery.
### Task 1: Reproducible tooling and dependencies
- [ ] Update compatible dependencies and security chains, make browser selection/ports reproducible; isolate emulator/tool caches.
- [ ] Run baseline unit/type/lint and audit; document remaining limitations instead of force downgrades.
### Task 2: Game correctness and isolation
Files: games/tetrisLogic.ts, games/snakeLogic.ts, TetrisGame.tsx, SnakeGame.tsx, runner/runnerRenderer.ts, RunnerGame.tsx.
Interfaces: planHoldTransition, collides, planSnakeStep, drawRunnerFrame(ctx, snapshot).
- [ ] Write deterministic regressions for hold, blocked spawn and departing tail; observe red.
- [ ] Implement pure transitions and integrate; verify unit suite green.
- [ ] Extract Runner drawing with frame behavior checks; preserve simulation timing.
### Task 3: Gece Bahçesi visual system
Files: index.css, home/Home.tsx, Navigation.tsx, pages/Index.tsx, games/GamesMenu.tsx, GameControls.tsx, shared GameArtwork and GardenCharacter.
- [ ] Add meaningful e2e expectations for navigation, filtering, preferences and responsive approved hero.
- [ ] Implement navigation, original illustrations, editorial hero, covers and shared chrome; adapt drawing/story.
- [ ] Inspect actual desktop/mobile screens and run routing/data persistence checks.
### Task 4: Firebase free-plan consistency
Files: Firebase config/documentation and rules tests.
- [ ] Verify CLI identity/project; retain direct Firestore schema and document optional server code.
- [ ] Test owner/stranger, invalid scores, cadence and deletion against the emulator.
- [ ] Deploy only tested rules if login is available; do not change billing.
### Task 5: Completion
- [ ] Run lint, typecheck, functions syntax, all unit/e2e/emulator checks, build and audits.
- [ ] Independent code review, address material findings, verify again only as needed.
- [ ] Show the real app preview and report exact counts and any external blockers.
