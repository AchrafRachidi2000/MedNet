# MedNet Workflow Inspector

Local, read-only inspection of the supplied UC1 workflow. No API credentials are required. No workflow code is executed and no MedNet services are called.

## Start

Requires Node.js 22 or later. Install the pinned local layout dependency once.

```powershell
cd C:\Users\Achraf\Desktop\mednet\inspector
npm.cmd ci --omit=dev
npm.cmd start
```

Open http://127.0.0.1:4317. Stop with Ctrl+C. The server listens only on the loopback interface. Set the `PORT` environment variable before starting to use a different port.

## Inspect

- **Compact controls:** the logo and separate branding row are removed. Desktop uses one control row plus phase tabs; Map key opens the legend and snapshot context over the canvas. Search results appear only while searching. Go to start / Fit phase sits beside the zoom controls. Phones retain their compact control drawer and swipeable phase tabs.
- **Dark workspace:** charcoal canvas, dark reading panels and dialogs, richer phase backgrounds and brighter node accents, and high-contrast text/path highlights across desktop and phone layouts. Checks use numbered actions (`1-`, `2-`, …), with nested bullets for supporting details; the member/payer extraction step lists the seven fact categories individually. Multi-sentence input/output explanations are separated into readable bullets. Original prompts, schemas and workflow code remain unchanged.
- **Scenario setup omitted:** TEST-00 (scenario harness) is excluded from the entire technical viewer, including phase views, search and business-to-technical links. Its process connector bridges the two original edges and retains their source IDs; data mode omits mappings involving that node without inventing replacement field mappings. The original source export is unchanged.
- **Cross-phase navigation:** arriving from another phase highlights the connecting path and its endpoint cards in green. “From [phase]” names the navigation context. Following an arrow preserves that exact connection; connected-step and inspector links preserve the originating step when known; direct phase tabs highlight all declared connections between those phases. The latest transition replaces the previous highlight. Clear it with the indicator's close button; Entire flow, switching map audience or connection mode also clears it. This is navigation context, not an execution trace.
- **Phones and landscape:** compact controls leave the map in focus. Swipe the phase tabs; drag with one finger and pinch with two to zoom. The sliders button opens search, map type, connection type and terminology. Rotating sideways reveals a wider canvas while retaining the same map center and zoom. Details use a tall portrait reader and a right-side landscape panel, with Expand and Close always available. The app remains local-only; mobile-friendly layout does not expose confidential data over the network.
- **Workflow map (the only workspace):** the default Business map explains 28 business activities and decisions along 42 paths. Technical map shows 88 visible nodes and 111 process connections. The unlimited canvas pans freely in every direction, including beyond the workflow. Drag or scroll to pan; Shift + scroll pans horizontally; Ctrl/Command + wheel zooms around the pointer. With the canvas focused, arrow keys pan and Home fits the workflow. The minimap stays anchored to the diagram and remains a way back from empty space. The minimap, fullscreen button and Fit all provide orientation. Search highlights matching steps, including connected-phase cards, and marks the current result distinctly. Previous/Next cycle through results with a 1/N counter, wrapping at each end without changing zoom. New queries restart at 1/N; no results show 0/0. `/` focuses search.
- **Separate phase workflows:** each of the nine phase tabs opens a focused diagram containing that phase's steps and immediate connections to other phases. Dashed phase-link cards show the actual connected step's title and description, whether it is previous/next, and a color-coded label for its phase. Technical links also show the node ID. Clicking a phase-link card opens its connected phase. Entire flow restores the complete map. Phase selection works in both business and technical views.
- **Visual language:** labeled, color-coded phase backgrounds match the tabs. Two-line descriptions below card titles explain each step. Technical cards retain node types, input/output counts and missing-internals markers. Selecting a node highlights immediate connections without changing the zoom or moving the map.
- **Node inspector:** a narrower 560 px, nearly full-height reading overlay extends upward over the map controls. Drag its left edge to adjust the width (420–1000 px, constrained to the screen); your choice is remembered locally. The resize handle also supports Left/Right arrow keys, Home/End and double-click to reset. Small screens use the available width. Expand offers a larger reader while preserving the reading position. Escape closes it. All 28 business steps explain concrete incoming information, checks/actions, outputs, route decisions and limitations. All 88 visible technical nodes use one explanation page with actions, external-service purpose and exchanged information, plus exact declared input/output fields. Original prompts, logic, settings and evidence remain in expandable sections on the same page.
- **Connection-first layout:** no stage columns or neighborhood mode. Connected steps are positioned by graph topology; branches separate and converge at their actual joins. Long sequences use compact alternating runs with nearby turns, instead of one horizontal strip or long return arrows. Small workflows remain direct. Branches and joins are compacted within each run, while every real connection remains visible. Background colors do not control placement. Paths route around cards, with conditions printed on branches; unlabeled process arrows mean Continue. Crossings are not junctions.
- **Map connections:** clicking an arrow opens and pans to its destination without changing zoom; Enter or Space also activates a focused arrow. Click a route label to inspect its condition and links to both endpoints. Dashed connections lead to the shared exit. Technical Data mappings mode bundles same-source/same-target field mappings into grouped connections; every individual mapping remains inspectable. Entire flow preserves all 88 visible nodes in either technical connection mode.
- **Fields within nodes:** open a field in the node inspector to follow explicit producer/consumer mappings, including alternatives and parent-object mappings.
- **Map help:** an on-demand explanation of the visual language, navigation and source limitations. Original business documents remain linked there; contextual source findings remain in each node's Source evidence section.

Links preserve the audience, phase, selected node and open evidence section in the URL fragment. Old directory, field-explorer and source-page links resolve to the map. The terminology guide explains domain abbreviations.

## Data and limitations

The server reads `../mednetstructure.json` on startup. Restart it after replacing the source export. Original sources are never modified. The JSON's SHA-256 fingerprint identifies the snapshot; generated timestamps are not source-version dates.

The original source export includes 89 nodes, 112 connections, 16 AI nodes, 355 top-level inputs and 314 top-level outputs. Nested schema fields are additional declarations, not unique business concepts. Six sub-workflow calls refer to four external definitions; their internal nodes and prompts are not included in the supplied export.

Technical cards, connected-phase cards and inspector headings use the exact node names from the current export (including their prefixes, punctuation and casing). Plain-English descriptions remain below the titles, and the former explanatory titles remain searchable and appear beneath the inspector heading. The business map keeps its separate non-technical step names.

Editorial summaries live separately in `lib/annotations.mjs`. Exported prompts, code, routes and schemas remain separate evidence. A summary is not a guarantee of production behavior. Conflicting prompt sections and stale-looking mappings are preserved and called out rather than silently repaired. Field lineage follows declared mappings; it does not execute code or infer all transformations. No live runtime values, actual populated prompts, claim replay or final payment decisions are represented.

## Confidentiality

This is an internal local source viewer, **not a public-hosting build**. The catalogue withholds all schema defaults and unreviewed configured values, and redacts configured credential values from process text. Reviewed reference/control configuration (such as document matrices and the EOP catalogue) remains inspectable. Original prompts and code may contain internal claim examples; the source documents and downloaded catalogue must remain confidential. There is no claim of complete personal-data anonymization.

The server exposes only an explicit asset/document allowlist, rejects non-local Host headers and cross-origin requests, uses a restrictive content policy, and permits only GET/HEAD. Do not change the bind address or publish this folder without a separate data-redaction and access-control review.

## Verify

```powershell
npm.cmd test
```

Tests cover graph and field counts, node annotation coverage, routing metadata, prompt preservation, nested schemas, alternative mappings, missing sub-workflows and credential withholding.

Browser tests are optional development dependencies. To install and run them:

```powershell
npm.cmd install
npx.cmd playwright install chromium
npm.cmd run test:browser
```

Browser tests cover map-only navigation, exact prompt text, field tracing, graph modes, source limitations, deep links, mobile overflow, keyboard interactions and automated accessibility. Geometry tests check every route endpoint, orthogonality, node collisions, field-mapping coverage, and independence from editorial stage assignments.

The browser remains dependency-free. The server computes geometry locally using pinned elkjs 0.11.0, then validates and repairs invalid routes with an obstacle-aware Manhattan router. Only positions, dimensions and connections enter layout computation; no workflow code runs and no network service receives project data. See the [ELK documentation](https://github.com/kieler/elkjs).

## Files

- `server.mjs`: loopback-only server; builds the catalogue without executing imported code.
- `lib/catalog.mjs`: source normalization, nested schema parsing, mapping checks and redaction.
- `lib/annotations.mjs`: editorial stage labels, node explanations, terminology and source findings.
- `lib/layout.mjs` and `lib/route-repair.mjs`: connection-driven geometry and validated obstacle-aware paths.
- `lib/business.mjs`: source-linked business activities and projected routes.
- `lib/business-details.mjs`: evidence-based business explanations for all 28 steps.
- `lib/node-details.mjs`: technical node actions and external-service exchanges for all 89 nodes.
- `lib/phases.mjs`: focused phase diagrams and connected-phase boundaries.
- `lib/clusters.mjs`: labeled phase backgrounds that do not change node positions.
- `public/`: dependency-free browser application.
- `test/`: Node's built-in test suite.

The standalone project README is implementation documentation. The PDF and DOCX source files remain in the parent directory.
