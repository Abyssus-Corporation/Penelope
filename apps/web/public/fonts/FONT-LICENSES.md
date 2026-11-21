# Dashboard font licenses

These files are vendored so the dashboard can set a strict Content-Security-Policy
with `font-src 'self'` and so a self-hosted install does not call third parties.

- **Inter Variable** is loaded from `@fontsource-variable/inter` (SIL Open Font
  License 1.1). See that package for the full license text.
- **Sentient** (Light 300, Regular 400) is an [Indian Type Foundry](https://www.indiantypefoundry.com/)
  family, self-hosted from [Fontshare](https://www.fontshare.com/fonts/sentient)
  under the [Fontshare/IFF license](https://www.fontshare.com/licenses/iff).
- **Obel Mono** (`ObelMono-VF.woff2`) was already in this tree and remains the
  monospace face.
