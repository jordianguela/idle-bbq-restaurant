# Iteració 3 — Ampliar el local (taules i BBQ)

**Data:** 2026-08-29
**Autors:** Jordi i Xavi
**Estat:** Implementat.

## Resum

Dona sentit als diners: es poden **comprar més taules i més BBQ** des d'una botiga, amb
**cost creixent** (reaprofita `economy.js`). El joc passa de 1 taula / 1 BBQ a diverses.

## Canvis de model

- `state.table` → `state.tables[]` (cada posició: `null` = buida o una taula ocupada).
- `state.bbq` → `state.bbqs[]` (cada posició: `null` = lliure o `{ dish, remaining }`).
- `readyPlates` continua sent una **bossa comuna** de la cuina.
- Inici: `tables:[null]`, `bbqs:[null]`.

## Comportament

- **Arribades**: quan el `spawnTimer` s'esgota, s'omple la **primera taula lliure**; si no n'hi
  ha cap, s'espera al següent interval.
- **Cuinar**: `startCooking(bbqIndex, dish)` en qualsevol BBQ lliure (amb algun tíquet a la
  cuina). Diverses BBQ cuinen alhora. En acabar, es crea plat només si encara fa falta
  (`kitchenWaitingCount > platesCount`), si no, temps perdut.
- **Entrega (tries la taula)**: `deliverPlate(tableIndex, dish)`. A la UI: clic a un plat
  llest per "agafar-lo", després clic a la taula destí (que ha de tenir un comensal que
  esperava aquell plat). Mapeja directament al futur drag-and-drop.
- **Menjar i pagar**: per taula, igual que abans (menja només amb tot el grup servit).

## Botiga

- `buyTable(state)` / `buyBbq(state)`: resten el cost i afegeixen una posició.
- Costos: `tableCost = upgradeCost(100, 1.6, tables.length-1)`,
  `bbqCost = upgradeCost(80, 1.6, bbqs.length-1)`.

## Persistència

- Es desa **diners + nombre de taules + nombre de BBQ**. En recarregar es mantenen les
  compres; el servei en curs comença net.

## Fora d'abast (properes)

- Drag-and-drop real; automatització amb cambrers/cuiners; més plats/carns; paciència;
  guanys offline; format de números grans; actualització parcial del DOM (rendiment).
