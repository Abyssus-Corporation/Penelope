# Canvas editing + #20 NITs + domains: preview 2 (feat/web-canvas-editing, uncommitted)

All edges are orthogonal (90° steps, 8px rounded corners) and routed around cards (route.ts). Domains are UI-only mocks (localStorage schema v2). Views: 320 = 320×720 @2x; 768 = 768×1024; 1280 = 1280×800; zoom200 = 1280×800 at 200% (640×400 CSS @2x). Light and dark; reduced motion on. Dev server (mock data) except 16 (production build). Re-shot in full after the domain work.

## 01-context-menu-add
Right-click (long-press on touch) on the background opens Add a service; the card lands at that point

| | 320 | 768 | 1280 | zoom200 |
|---|---|---|---|---|
| light | [01-context-menu-add-light-320.png](01-context-menu-add-light-320.png) | [01-context-menu-add-light-768.png](01-context-menu-add-light-768.png) | [01-context-menu-add-light-1280.png](01-context-menu-add-light-1280.png) | [01-context-menu-add-light-zoom200.png](01-context-menu-add-light-zoom200.png) |
| dark | [01-context-menu-add-dark-320.png](01-context-menu-add-dark-320.png) | [01-context-menu-add-dark-768.png](01-context-menu-add-dark-768.png) | [01-context-menu-add-dark-1280.png](01-context-menu-add-dark-1280.png) | [01-context-menu-add-dark-zoom200.png](01-context-menu-add-dark-zoom200.png) |

## 02-add-validation-error
Toolbar Add ▸ Service: Service tab, after submit (taken name + invalid source), errors linked to fields, focus on the first invalid field; scrolls inside at zoom 200

| | 320 | 768 | 1280 | zoom200 |
|---|---|---|---|---|
| light | [02-add-validation-error-light-320.png](02-add-validation-error-light-320.png) | [02-add-validation-error-light-768.png](02-add-validation-error-light-768.png) | [02-add-validation-error-light-1280.png](02-add-validation-error-light-1280.png) | [02-add-validation-error-light-zoom200.png](02-add-validation-error-light-zoom200.png) |
| dark | [02-add-validation-error-dark-320.png](02-add-validation-error-dark-320.png) | [02-add-validation-error-dark-768.png](02-add-validation-error-dark-768.png) | [02-add-validation-error-dark-1280.png](02-add-validation-error-dark-1280.png) | [02-add-validation-error-dark-zoom200.png](02-add-validation-error-dark-zoom200.png) |

## 03-drag-linking
Dragging a link from web's dot onto redis: the preview line is routed orthogonally around api like a finished edge (valid target ringed; remove buttons hidden while dragging)

| | 320 | 768 | 1280 | zoom200 |
|---|---|---|---|---|
| light | [03-drag-linking-light-320.png](03-drag-linking-light-320.png) | [03-drag-linking-light-768.png](03-drag-linking-light-768.png) | [03-drag-linking-light-1280.png](03-drag-linking-light-1280.png) | [03-drag-linking-light-zoom200.png](03-drag-linking-light-zoom200.png) |
| dark | [03-drag-linking-dark-320.png](03-drag-linking-dark-320.png) | [03-drag-linking-dark-768.png](03-drag-linking-dark-768.png) | [03-drag-linking-dark-1280.png](03-drag-linking-dark-1280.png) | [03-drag-linking-dark-zoom200.png](03-drag-linking-dark-zoom200.png) |

## 04-edge-selected
Selected link with its remove button (Delete/Backspace also removes); 320 zoomed out to bring the link in

| | 320 | 768 | 1280 | zoom200 |
|---|---|---|---|---|
| light | [04-edge-selected-light-320.png](04-edge-selected-light-320.png) | [04-edge-selected-light-768.png](04-edge-selected-light-768.png) | [04-edge-selected-light-1280.png](04-edge-selected-light-1280.png) | [04-edge-selected-light-zoom200.png](04-edge-selected-light-zoom200.png) |
| dark | [04-edge-selected-dark-320.png](04-edge-selected-dark-320.png) | [04-edge-selected-dark-768.png](04-edge-selected-dark-768.png) | [04-edge-selected-dark-1280.png](04-edge-selected-dark-1280.png) | [04-edge-selected-dark-zoom200.png](04-edge-selected-dark-zoom200.png) |

## 05-after-auto-arrange
northwind after piling two cards up + Auto-arrange: layered, nothing overlaps; every link orthogonal with rounded corners, billing→pg routed around api (NIT)

| | 320 | 768 | 1280 | zoom200 |
|---|---|---|---|---|
| light | [05-after-auto-arrange-light-320.png](05-after-auto-arrange-light-320.png) | [05-after-auto-arrange-light-768.png](05-after-auto-arrange-light-768.png) | [05-after-auto-arrange-light-1280.png](05-after-auto-arrange-light-1280.png) | [05-after-auto-arrange-light-zoom200.png](05-after-auto-arrange-light-zoom200.png) |
| dark | [05-after-auto-arrange-dark-320.png](05-after-auto-arrange-dark-320.png) | [05-after-auto-arrange-dark-768.png](05-after-auto-arrange-dark-768.png) | [05-after-auto-arrange-dark-1280.png](05-after-auto-arrange-dark-1280.png) | [05-after-auto-arrange-dark-zoom200.png](05-after-auto-arrange-dark-zoom200.png) |

## 06-connections-section
Keyboard path: sheet Settings tab → Connections (Connect to + Add, Connects to / Used by / Domains with remove buttons); opened by deep link ?node=api (old ?service= links are rewritten to ?node=)

| | 320 | 768 | 1280 | zoom200 |
|---|---|---|---|---|
| light | [06-connections-section-light-320.png](06-connections-section-light-320.png) | [06-connections-section-light-768.png](06-connections-section-light-768.png) | [06-connections-section-light-1280.png](06-connections-section-light-1280.png) | [06-connections-section-light-zoom200.png](06-connections-section-light-zoom200.png) |
| dark | [06-connections-section-dark-320.png](06-connections-section-dark-320.png) | [06-connections-section-dark-768.png](06-connections-section-dark-768.png) | [06-connections-section-dark-1280.png](06-connections-section-dark-1280.png) | [06-connections-section-dark-zoom200.png](06-connections-section-dark-zoom200.png) |

## 07-controls-clear-of-cards
NIT: zoom controls are a column in a card-free left gutter at every width (fleet, 35 services)

| | 320 | 768 | 1280 | zoom200 |
|---|---|---|---|---|
| light | [07-controls-clear-of-cards-light-320.png](07-controls-clear-of-cards-light-320.png) | [07-controls-clear-of-cards-light-768.png](07-controls-clear-of-cards-light-768.png) | [07-controls-clear-of-cards-light-1280.png](07-controls-clear-of-cards-light-1280.png) | [07-controls-clear-of-cards-light-zoom200.png](07-controls-clear-of-cards-light-zoom200.png) |
| dark | [07-controls-clear-of-cards-dark-320.png](07-controls-clear-of-cards-dark-320.png) | [07-controls-clear-of-cards-dark-768.png](07-controls-clear-of-cards-dark-768.png) | [07-controls-clear-of-cards-dark-1280.png](07-controls-clear-of-cards-dark-1280.png) | [07-controls-clear-of-cards-dark-zoom200.png](07-controls-clear-of-cards-dark-zoom200.png) |

## 08-big-graph-70
NIT: fleet-xl (70 services) frames the first column readably (zoom ≥0.5 wide, ≥0.75 narrow; 'Center on the first services')

| | 320 | 768 | 1280 | zoom200 |
|---|---|---|---|---|
| light | [08-big-graph-70-light-320.png](08-big-graph-70-light-320.png) | [08-big-graph-70-light-768.png](08-big-graph-70-light-768.png) | [08-big-graph-70-light-1280.png](08-big-graph-70-light-1280.png) | [08-big-graph-70-light-zoom200.png](08-big-graph-70-light-zoom200.png) |
| dark | [08-big-graph-70-dark-320.png](08-big-graph-70-dark-320.png) | [08-big-graph-70-dark-768.png](08-big-graph-70-dark-768.png) | [08-big-graph-70-dark-1280.png](08-big-graph-70-dark-1280.png) | [08-big-graph-70-dark-zoom200.png](08-big-graph-70-dark-zoom200.png) |

## 09-domain-generate-dialog
Add ▸ Domain, Generate: `<service>-<6 hex>.penelope.local`, editable subdomain (RFC 1123 label, follows the target until edited), target service required; verified + HTTPS at once

| | 320 | 768 | 1280 | zoom200 |
|---|---|---|---|---|
| light | [09-domain-generate-dialog-light-320.png](09-domain-generate-dialog-light-320.png) | [09-domain-generate-dialog-light-768.png](09-domain-generate-dialog-light-768.png) | [09-domain-generate-dialog-light-1280.png](09-domain-generate-dialog-light-1280.png) | [09-domain-generate-dialog-light-zoom200.png](09-domain-generate-dialog-light-zoom200.png) |
| dark | [09-domain-generate-dialog-dark-320.png](09-domain-generate-dialog-dark-320.png) | [09-domain-generate-dialog-dark-768.png](09-domain-generate-dialog-dark-768.png) | [09-domain-generate-dialog-dark-1280.png](09-domain-generate-dialog-dark-1280.png) | [09-domain-generate-dialog-dark-zoom200.png](09-domain-generate-dialog-dark-zoom200.png) |

## 10-domain-custom-dns
Add ▸ Domain, Custom: `café.acme.dev` typed, shown as saved punycode `xn--caf-dma.acme.dev`; target optional; live DNS helper (CNAME for a subdomain) with copy buttons, one just copied (check icon, aria-live "Copied …")

| | 320 | 768 | 1280 | zoom200 |
|---|---|---|---|---|
| light | [10-domain-custom-dns-light-320.png](10-domain-custom-dns-light-320.png) | [10-domain-custom-dns-light-768.png](10-domain-custom-dns-light-768.png) | [10-domain-custom-dns-light-1280.png](10-domain-custom-dns-light-1280.png) | [10-domain-custom-dns-light-zoom200.png](10-domain-custom-dns-light-zoom200.png) |
| dark | [10-domain-custom-dns-dark-320.png](10-domain-custom-dns-dark-320.png) | [10-domain-custom-dns-dark-768.png](10-domain-custom-dns-dark-768.png) | [10-domain-custom-dns-dark-1280.png](10-domain-custom-dns-dark-1280.png) | [10-domain-custom-dns-dark-zoom200.png](10-domain-custom-dns-dark-zoom200.png) |

## 11-domain-badges
Canvas with domains in the leftmost column: generated + custom, **Pending DNS** (dashed, hollow dot) vs **Verified** (success dot); four linked (three → web, one → api, orthogonal routes), one unlinked at the bottom

| | 320 | 768 | 1280 | zoom200 |
|---|---|---|---|---|
| light | [11-domain-badges-light-320.png](11-domain-badges-light-320.png) | [11-domain-badges-light-768.png](11-domain-badges-light-768.png) | [11-domain-badges-light-1280.png](11-domain-badges-light-1280.png) | [11-domain-badges-light-zoom200.png](11-domain-badges-light-zoom200.png) |
| dark | [11-domain-badges-dark-320.png](11-domain-badges-dark-320.png) | [11-domain-badges-dark-768.png](11-domain-badges-dark-768.png) | [11-domain-badges-dark-1280.png](11-domain-badges-dark-1280.png) | [11-domain-badges-dark-zoom200.png](11-domain-badges-dark-zoom200.png) |

## 12-domain-sheet-pending
Domain sheet (`?node=app.acme.dev`): target select, port (1–65535, Save), HTTPS **Issuing**, DNS records (CNAME) with copy, status badge, Check again

| | 320 | 768 | 1280 | zoom200 |
|---|---|---|---|---|
| light | [12-domain-sheet-pending-light-320.png](12-domain-sheet-pending-light-320.png) | [12-domain-sheet-pending-light-768.png](12-domain-sheet-pending-light-768.png) | [12-domain-sheet-pending-light-1280.png](12-domain-sheet-pending-light-1280.png) | [12-domain-sheet-pending-light-zoom200.png](12-domain-sheet-pending-light-zoom200.png) |
| dark | [12-domain-sheet-pending-dark-320.png](12-domain-sheet-pending-dark-320.png) | [12-domain-sheet-pending-dark-768.png](12-domain-sheet-pending-dark-768.png) | [12-domain-sheet-pending-dark-1280.png](12-domain-sheet-pending-dark-1280.png) | [12-domain-sheet-pending-dark-zoom200.png](12-domain-sheet-pending-dark-zoom200.png) |

## 13-domain-sheet-verified
Domain sheet after Check again on apex `acme.com.br` (multi-part suffix heuristic): **Verified**, HTTPS **Active**, A `192.0.2.10` + AAAA `2001:db8::10` at `@`

| | 320 | 768 | 1280 | zoom200 |
|---|---|---|---|---|
| light | [13-domain-sheet-verified-light-320.png](13-domain-sheet-verified-light-320.png) | [13-domain-sheet-verified-light-768.png](13-domain-sheet-verified-light-768.png) | [13-domain-sheet-verified-light-1280.png](13-domain-sheet-verified-light-1280.png) | [13-domain-sheet-verified-light-zoom200.png](13-domain-sheet-verified-light-zoom200.png) |
| dark | [13-domain-sheet-verified-dark-320.png](13-domain-sheet-verified-dark-320.png) | [13-domain-sheet-verified-dark-768.png](13-domain-sheet-verified-dark-768.png) | [13-domain-sheet-verified-dark-1280.png](13-domain-sheet-verified-dark-1280.png) | [13-domain-sheet-verified-dark-zoom200.png](13-domain-sheet-verified-dark-zoom200.png) |

## 14-domain-chain
Linked chain domain → web → api → postgres, routed with no card crossings (wide views zoomed out to fit; 320 at its 0.5 floor shows the head of the chain)

| | 320 | 768 | 1280 | zoom200 |
|---|---|---|---|---|
| light | [14-domain-chain-light-320.png](14-domain-chain-light-320.png) | [14-domain-chain-light-768.png](14-domain-chain-light-768.png) | [14-domain-chain-light-1280.png](14-domain-chain-light-1280.png) | [14-domain-chain-light-zoom200.png](14-domain-chain-light-zoom200.png) |
| dark | [14-domain-chain-dark-320.png](14-domain-chain-dark-320.png) | [14-domain-chain-dark-768.png](14-domain-chain-dark-768.png) | [14-domain-chain-dark-1280.png](14-domain-chain-dark-1280.png) | [14-domain-chain-dark-zoom200.png](14-domain-chain-dark-zoom200.png) |

## 15-list-with-domains
List view: services, then a Domains section (badges, HTTPS, target); each row opens the same sheet

| | 320 | 768 | 1280 | zoom200 |
|---|---|---|---|---|
| light | [15-list-with-domains-light-320.png](15-list-with-domains-light-320.png) | [15-list-with-domains-light-768.png](15-list-with-domains-light-768.png) | [15-list-with-domains-light-1280.png](15-list-with-domains-light-1280.png) | [15-list-with-domains-light-zoom200.png](15-list-with-domains-light-zoom200.png) |
| dark | [15-list-with-domains-dark-320.png](15-list-with-domains-dark-320.png) | [15-list-with-domains-dark-768.png](15-list-with-domains-dark-768.png) | [15-list-with-domains-dark-1280.png](15-list-with-domains-dark-1280.png) | [15-list-with-domains-dark-zoom200.png](15-list-with-domains-dark-zoom200.png) |

## 16-dashboard-prod-unavailable
NIT: production build Dashboard with no API: unavailable state, no mock projects (prod preview; was 09 in the previous round)

| | 320 | 1280 |
|---|---|---|
| light | [16-dashboard-prod-unavailable-light-320.png](16-dashboard-prod-unavailable-light-320.png) | [16-dashboard-prod-unavailable-light-1280.png](16-dashboard-prod-unavailable-light-1280.png) |
| dark | [16-dashboard-prod-unavailable-dark-320.png](16-dashboard-prod-unavailable-dark-320.png) | [16-dashboard-prod-unavailable-dark-1280.png](16-dashboard-prod-unavailable-dark-1280.png) |

Inspected by eye this round: 02 light 768 (after the tab-padding fix), 09 light 1280 + dark zoom200, 10 light 1280 + dark 320, 11 light 1280 + dark zoom200, 12 light 320 + dark 768, 13 dark 1280, 14 light 1280 + dark 768/zoom200 + light 320, 15 dark 320 + light 1280.

Hostname wrap fix (Sabine domains pixel BLOCKER): 11 and 14 re-shot at every size, both themes. Hostnames now wrap only after a dot (`shop-3f9a1c.` / `penelope.local`), never inside a label. Checked by eye: 11 light 1280 + dark 320, 14 light 1280 + dark zoom200.
