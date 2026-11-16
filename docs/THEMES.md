# Themes

Neon Raiders can change its look for a topic or a season without changing the gameplay.

## How it works

- `themes/current.json` names the active theme: `{ "theme": "default" }`.
- Each theme is a folder `themes/<id>/` with a `theme.json` and optional images.
- Switching themes only changes `current.json`. Every theme keeps its own URLs, so browsers never mix two themes.
- Preview any theme with `?theme=<id>`, for example `index.html?theme=demo-espacio`.
- If anything fails (missing file, bad JSON, slow network, image over 256 px), the game keeps the built-in neon look.

## Components

Every component has a fixed hit box. Images are scaled into it, so a theme never changes difficulty.

| Key | Component | Hit box (px) | Frames |
|---|---|---|---|
| `ship` | Player ship | 20×16 | 1 |
| `enemyA` | Enemy, top two rows | 18×14 | 1–8 (2 per second) |
| `enemyB` | Enemy, middle rows | 18×14 | 1–8 |
| `enemyC` | Enemy, bottom rows | 18×14 | 1–8 |
| `bomb` | Enemy bomb | 4×8 | 1 |
| `explosion` | Hit explosion | 24×24 | 1–8 over 0.35 s |

Draw images at 2× to 4× the hit box with a transparent background. PNG, WebP or SVG, at most 256 px per side.
Keep a whole theme under 300 KB.

## theme.json

```json
{
  "id": "2026-11-17-cohete",
  "name": "Rocket launch",
  "texts":   { "title": "Neon Raiders", "subtitle": "Theme: rocket launch" },
  "palette": { "ship": "#00f0ff", "enemyA": "#ff00c8", "enemyB": "#a040ff", "enemyC": "#00ff9c",
               "bomb": "#ffdc3c", "rocket": "#ffffff", "hud": "#ffffff", "explosion": "#ff8c3c" },
  "sprites": { "ship": "ship.png", "enemyA": ["a1.png", "a2.png"], "bomb": "bomb.png",
               "explosion": ["e1.png", "e2.png", "e3.png", "e4.png"] },
  "credits": "Who made each asset and under which license."
}
```

Every field is optional. A component without a sprite is drawn with its palette colour in the built-in neon style.
Title: up to 40 characters. Subtitle: up to 60. Credits: up to 300.

## Content rules

Themes are public and the game is about shooting enemies, so:

- No real people: no politicians, celebrities, private persons or victims.
- No tragedies as enemies: no wars, disasters, crimes or illness.
- No brands, logos or trademarked characters.
- No copied images. News photos and pictures from social networks belong to their authors.
  Use them only as inspiration and create new assets, or use assets with a clear free license (CC0, MIT) and credit them.
- A theme's topic is a short anonymous description. It never includes who suggested it, names, phone numbers,
  quotes or links to private conversations.
