# Iteració 4 — Automatització amb personal (cambrers i cuiners)

**Data:** 2026-08-29
**Autors:** Jordi i Xavi
**Estat:** Implementat.

## Resum

El cor "idle": es contracta personal que fa la feina sol. Dos rols, dos eixos cadascun
(**quantitat** i **habilitat/velocitat**), tot des de la botiga amb cost creixent
(`economy.js`). Comences amb 0 de cada i pots seguir fent-ho tot **a mà** en paral·lel.

## Rols

- **Cambrer** 🧑‍💼 — cada `waiterActionTime` fa una acció: prioritza **entregar un plat llest**
  a una taula que el vol; si no, **envia un tíquet** (taula→cuina). Diversos cambrers actuen
  en paral·lel (cadascun amb el seu `cooldown`).
- **Cuiner** 🧑‍🍳 — quan està lliure, ocupa una **BBQ lliure** i cou el **plat que més falta**
  (`cookNeeded`). Queda ocupat el temps de cocció. Cocció simultània = min(cuiners lliures,
  BBQ lliures).

## Habilitats (velocitat)

- `waiterSkill`: `waiterActionTime = CONFIG.waiter.actionTime * decay^waiterSkill`.
- `cookSkill`: `effectiveCookTime(dish) = DISHES[dish].cookTime * decay^cookSkill`. Afecta
  **tota** la cocció (manual i automàtica) — és eficiència de cuina. `decay = 0.85` (−15%/nivell).

## Model

- Estat nou: `waiters: [{cooldown}]`, `cooks: [{cooldown}]`, `waiterSkill`, `cookSkill`.
- Les BBQ guarden ara `{ dish, remaining, total }` per pintar bé la barra amb el temps efectiu.
- Automatització dins de `tick` (ordre): arribada → cambrers actuen → avança cocció → cuiners
  inicien cocció → menjar/pagament. La granularitat de 200 ms fa que l'ordre exacte no importi.
- Un treballador ocupat descompta `cooldown`; un d'ociós actua i el reinicia (sense descomptar
  el mateix tick), de manera que cuiner i BBQ acaben alhora.

## Botiga i costos

`buyTable`, `buyBbq`, `hireWaiter`, `hireCook`, `upgradeWaiterSkill`, `upgradeCookSkill`.
Costos base (provisionals, per pujar més endavant): cambrer 60 €/×1,6, cuiner 120 €/×1,7,
vel. cambrer 80 €/×1,8, vel. cuiner 100 €/×1,8. Temps d'acció cambrer 1,2 s.

## Persistència

Es desa: diners, i els **comptes** de taules/BBQ/cambrers/cuiners i els nivells d'habilitat.
Els `cooldown` es reinicien a 0 en carregar; el servei en curs comença net.

## Fora d'abast (properes)

- Personal visible movent-se (2D/drag); drag-and-drop real; més plats/carns i tipus de rol
  (sommelier, caixer); guanys offline (ara ja tindria sentit amb l'automatització); format de
  números grans; actualització parcial del DOM.
