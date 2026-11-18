# Port Sombra: Neon Tide

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/memelljk/port-sombra/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/memelljk/port-sombra/reward.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Port Sombra is a rain-beaten smuggler port that never quite dries out. You are
**Marco Venn**, a runner with fast hands and slow luck, working the docks for
fixer **Sable Ivers** — who keeps her booth at Ferry Point, her books in a hut
in Smuggler's Cove, and her opinions to herself until they cost somebody
money. Between the two of them sits a whole night city: container cranes,
cannery stalls, terrace towers, a ferry that will not wait, and a breakwater
lighthouse that has watched better criminals than you drown their engines.

## What is in the port

- **16 story missions** in one chained campaign — crate runs, a timed ferry
  dash, the theft of the cobalt Serpentine S, dock fights, a 60-second cache
  hold, tithe collections, a stolen police interceptor, crane-top gunmen,
  the Black Ledger carried under three stars, a breakwater checkpoint run,
  an armored salt truck, a harbor checkpoint race, a night sail in the
  patrol boat, a Terraces blackout, and a five-star vault escape — plus
  repeatable smuggling runs and checkpoint races that keep paying.
- **6 districts**: Neon Quay, Container Yards, Cannery Row, The Terraces,
  Ferry Point and Smuggler's Cove, generated from seed 11 with exactly
  **252 buildings** and **816 streetlights**.
- **8 shops** with working menus: Harrow Arms, Sable's Garage, Thread & Tide,
  Bao Nine, Gull Pawn, St. Sombra Clinic, Marina Chandlery and Tidepool Ink.
- **4 safehouses** that save the game, heal you and shed a wanted star.
- **6 radio stations** of pure WebAudio synthesis — Bassline FM, Neon Wave,
  Rain FM, Harbor Talk, Container Static and Ferry Tones.
- **A drivable harbor boat**: board the patrol boat at Ferry Point pier,
  work the throttle and rudder, and mind the wake. Five more boats ride at
  anchor around the harbor.
- **A dynamic weather cycle** — clear skies roll into squalls, squalls into
  fog banks — driving the rain, the fog and the glow of every neon sign,
  with the current weather always on the HUD.
- 54 ambient vehicles (parked, traffic and police), 44 pedestrians who
  stroll, flee and can be robbed at gunpoint, traffic that brakes and flees,
  police interceptors that chase and ram, foot officers at high wanted
  levels, a BUSTED meter, and WASTED/BUSTED respawns at St. Sombra Clinic.

## Controls

| Input | Action |
| --- | --- |
| WASD / arrows | Move, drive, sail |
| Mouse (drag) | Orbit camera |
| Mouse click | Fire pistol (on foot) |
| Right mouse | Aim |
| E | Talk, enter/steal car, board boat, use shop or safehouse |
| F | Melee |
| Space | Handbrake / drift |
| R | Radio station (in a car) · Reload (on foot) |
| P | Full city map |
| M | Mute |
| Esc | Pause |

Progress autosaves to localStorage at safehouses, shops and job ends;
Continue picks the run back up from the title screen.

## Running it

`node serve.ts` serves `game/` locally; open the page it prints and play.
`MAKEFUN_OUTPUT_DIR=out node main.ts` writes the hand-in (game, screenshots
and dossier.json) for the make.fun gta6-01 bounty. No build step, no network
requests: three.js r128 is vendored under `game/vendor/`, and every sound is
synthesized live with WebAudio.
