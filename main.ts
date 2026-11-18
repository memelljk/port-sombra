// Port Sombra: Neon Tide — hand-in program for make.fun bounty gta6-01.
// Copies the static game/ and screenshots/ folders to the output directory
// and writes dossier.json with the vendored make.fun library, exactly as
// the gate expects. Node 22, standard library only, deterministic bytes.
//
// The game this hands in — PORT SOMBRA: NEON TIDE, a 3D open-world crime
// game set in a storm-lashed smuggler port at night:
//   16 story missions in one campaign chain, plus checkpoint races and
//   repeatable smuggling runs; 8 interactable shops; 4 safehouses;
//   6 radio stations (WebAudio synth); 6 districts (Neon Quay, Container
//   Yards, Cannery Row, The Terraces, Ferry Point, Smuggler's Cove);
//   252 buildings and 816 streetlights from the seeded (seed 11) layout;
//   54 ambient vehicles (parked, traffic and police) and 44 pedestrians;
//   6 boats including the drivable patrol boat at Ferry Point pier;
//   a dynamic weather cycle (clear / squall / fog bank) driving rain,
//   fog and sign glow; wanted 0-5 stars, police interceptors and foot
//   officers, BUSTED/WASTED respawn, localStorage save and Continue.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
