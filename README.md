# Scrakk Studio extensions

The **official, first-party extensions** for [Scrakk Studio](https://scrakk.art):
the ones the project itself maintains, next to the built-ins that ship inside the
app (themes, file icons, the terminal panel, the language pack).

This is the installable side: everything here is a **SEF package** (`.sef`) that
you can install from Settings → Extensions, or from the app's store.

## What is here

| Extension | What it adds | Install |
|---|---|---|
| [`halloween-themes`](halloween-themes/) | 12 colour themes (9 dark / 3 light), five with their own typeface. Includes **Canvas Blueprint**'s sibling set: Blood Cult, Sewer Rot, 8-Bit Abyss, Neon Monotone, Glitch Riot… | `halloween-themes.sef` |
| [`canvas`](canvas/) | A drawing board: a panel with a real `<canvas>` you draw on with the mouse, three palette commands, a theme of its own, and an **AI tool** (`canvas_draw`) so the assistant can draw on the same board | `canvas.sef` |

## Layout

```text
extensions/
├── halloween-themes/          # one folder per extension
│   ├── manifest.json          #   the id here is the folder name AND the install id
│   └── themes/*.json          #   data (themes, icons, grammars, …)
├── canvas/
│   ├── manifest.json
│   ├── panels/ runtime/ icons/ themes/
│   └── …
└── .github/workflows/         # validate on push, release on tag
```

Only the **source** lives here. `dist/modules.js` (the compiled UI bundle) and the
`.sef` are build artifacts: the release workflow makes them, and `.gitignore`
keeps them out of the tree.

## Releases

Versioning is **per extension**. A tag names the extension and its version:

```sh
git tag halloween-themes@1.3.0
git push origin halloween-themes@1.3.0
```

The [release workflow](.github/workflows/release.yml) then:

1. installs the SEF CLI (`@scrakk-official/cli`),
2. compiles the folder (`sef build <id>` → `dist/modules.js`),
3. packs it (`sef pack <id>` → `<id>.sef`),
4. publishes a GitHub Release whose asset is exactly **`<id>.sef`**.

The app's store resolves an extension by its repository plus the asset name, so
keeping one repository with one release per extension is what makes independent
versions possible here.

## Authoring

```sh
npm install -g https://github.com/Scrakk-Team/sef-builder/releases/latest/download/cli.tgz
sef validate halloween-themes
sef build halloween-themes && sef pack halloween-themes
```

The guides live in the app repository under `docs/extensions/` (manifest,
contributes, panels, themes, tools, store…) and are published at
[docs.scrakk.art](https://docs.scrakk.art).

## License

Apache-2.0 — see the app's `LICENSE`.
