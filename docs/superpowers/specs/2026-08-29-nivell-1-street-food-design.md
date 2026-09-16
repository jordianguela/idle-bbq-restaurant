# Nivell 1 — Street Food (sistema de nivells)

**Data:** 2026-08-29
**Autors:** Jordi i Xavi
**Estat:** Implementat.

## Canvi de direcció

El joc passa a ser una **progressió de restaurants** (3 nivells previstos). Cada nivell és un
restaurant amb la seva mecànica; l'objectiu de cada nivell és guanyar prous diners per obrir
el següent.

L'automatització (cambrers/cuiners) feia el joc massa automàtic; **s'aparca** però **no
s'esborra**: el codi de taules + personal es conserva a `src/restaurant2/` per reutilitzar-lo
als nivells 2 i 3.

## Estructura de fitxers

- `src/economy.js` — compartit (cost creixent).
- `src/restaurant1/` — Nivell 1 (Street Food): `definitions.js`, `state.js`, `engine.js`,
  `save.js`, `ui.js`.
- `src/restaurant2/` — codi de taules/personal preservat (base per als nivells 2-3), amb el
  seu propi `index.html`/`styles.css`. Dorment (no carregat).
- `src/main.js`, `index.html`, `styles.css` (arrel) — carreguen el restaurant actiu (nivell 1).

## Nivell 1: Street Food

- **Objectiu:** 10.000 € per desbloquejar el nivell 2. Barra d'objectiu sempre visible; en
  arribar-hi surt un cartell "Nivell 2 (properament)" i es pot seguir jugant.
- **Plats:** 🍔 Hamburguesa (12 € / 2 s) i 🌭 Frankfurt (8 € / 1,5 s).
- **Clients:** grups d'1 o 2 que **entren per la porta caminant** i fan **cua** (màxim 3).
  Sense paciència.
- **Cuina:** de 1 a **3 BBQ** (comences amb 1, en compres més fins a 3; cost 150 € ×2). Tot
  **manual**: cliques la BBQ i tries el plat correcte (equivocar-te perd temps). Barra de
  progrés.
- **Servir:** arrossegues el plat llest del taulell fins a un grup que el vulgui (els grups que
  el volen es remarquen mentre l'arrossegues). Quan el grup té tot el
  menjar **paga a l'instant**, es queda **3 s** menjant i llavors se'n va caminant per la
  porta; el seu lloc de la cua no s'allibera fins que marxa.
- **Sense** taules, cambrers, cuiners.

## Model / accions (pures)

Estat: `{ level, money, spawnTimer, nextGroupId, queue:[{id,diners:[{dish,status,look}],leaveTimer}], bbqs:[null|{dish,remaining,total}], readyPlates:[], lastSeen }`.
Accions: `startCooking(bbqIndex, dish)`, `deliverPlate(groupIndex, dish)` (cobra i arrenca el
`leaveTimer` si queda tot servit), `buyBbq()` (topat a `maxBbqs`), `tick(dt, rng)` (arribades,
cocció i marxa dels grups que han acabat).
L'`id` i el `look` són identitat, no lògica: deixen que l'escena sàpiga qui és qui per animar-ho.
`goalReached(state)` = `money >= CONFIG.goal`.

## Persistència

Clau nova `idle-bbq-lvl1`: es desa diners + nombre de BBQ (topat a 3). El progrés antic del
prototip queda al marge (clau diferent).

## Fora d'abast (properes)

- Nivells 2 i 3 (reaprofitant `restaurant2/`): taules, temps de menjar, i possiblement el
  personal com a millora d'aquell nivell.
- Transició real en obrir el nivell 2 (carregar el restaurant 2, arrossegar el capital…).
- Més plats; format de números grans; clicar les BBQ a l'escena per cuinar.
