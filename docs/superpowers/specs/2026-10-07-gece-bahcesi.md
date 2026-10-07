# Gece Bahçesi — approved implementation brief
User approved the Gece Bahçesi preview and requested all improvements, green tests, Firebase free-plan compatibility, and no APK work.
Preserve all 21 routes, score IDs, saved drawings, offline support, preferences and existing game rules except confirmed defects.
Design: midnight navy surfaces, lavender primary, mint and peach illustrations, editorial serif display type; responsive desktop header and mobile navigation; original game covers, shared game chrome, drawing/story cohesion. No promotional animation during play.
Fix Tetris hold permission/spawn collisions and Snake departing-tail collisions with deterministic logic tests. Extract Runner canvas rendering from React without changing physics.
Firebase: keep anonymous Auth + direct Firestore on Spark; clarify unused Functions as optional Blaze-only infrastructure; validate ownership/schema/cadence via emulator, avoid billing upgrades. Live deploy only tested rules and only once CLI identity/project is verified.
Dependencies: update supported patch/minor versions, address audit chains with compatible overrides or a justified major migration, no APK build. Preserve browser support intentionally.
Validation: lint, tsc, unit suite, production-like test build, complete desktop/mobile/browser responsive e2e, Firestore emulator, security audit, and visual inspection of actual application at 320/768/1440.
