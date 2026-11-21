# Dashboard font licenses

These faces are self-hosted so the dashboard can set a strict Content-Security-Policy
with `font-src 'self'` and a self-hosted install does not call third parties.

All three are licensed under the [SIL Open Font License 1.1](https://openfontlicense.org)
(OFL), with no Reserved Font Names. This was verified against each font's own license file and, for
Obel Mono, the `name` table inside the font file and the foundry's license page.

| Font                            | Version                                                    | Source                                                                     | Copyright                           | License text in `dist`     |
| ------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------- | -------------------------- |
| Inter Variable                  | `@fontsource-variable/inter` 5.3.0 (Google Fonts v20)      | https://github.com/rsms/inter via Fontsource                               | 2016 The Inter Project Authors      | `fonts/Inter-OFL.txt`      |
| Newsreader Variable             | `@fontsource-variable/newsreader` 5.3.0 (Google Fonts v26) | https://github.com/productiontype/Newsreader via Fontsource                | 2020 The Newsreader Project Authors | `fonts/Newsreader-OFL.txt` |
| Obel Mono (`ObelMono-VF.woff2`) | 1.004                                                      | https://typographic.systems (license: https://typographic.systems/license) | 2026 The Obel Mono Project Authors  | `fonts/ObelMono-OFL.txt`   |

## Shipping the license with the fonts

The OFL requires the license text to travel with redistributed fonts. The build bundles
the fonts as hashed files in `dist/assets/`, and `vite.config.ts` copies each license
into `dist/fonts/`:

- the Inter and Newsreader texts come from the `LICENSE` file each Fontsource package
  ships, so they follow package upgrades;
- the Obel Mono text comes from `OFL.txt` beside the font file in this folder.

The reference `deploy/Caddyfile` serves `/fonts/*` without the SPA fallback, so a
missing file is a 404 rather than `index.html`.

When adding or upgrading a font, update this table and the `FONT_LICENSES` map in
`vite.config.ts`.
