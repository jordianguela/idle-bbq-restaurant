# Iteració 2 — Servei de taula espacial (sala ↔ cuina)

**Data:** 2026-08-29
**Autors:** Jordi i Xavi
**Estat:** Disseny aprovat. Substitueix el bucle bàsic de la iteració 1.

---

## 1. Resum

Substituïm el botó genèric "Serveix un client" per un **bucle de servei de taula**
espacial: **sala a l'esquerra, cuina a la dreta**. Els clients arriben sols, demanen plats,
i el jugador porta la comanda a la cuina, cuina el plat correcte i l'entrega. Quan tot el
grup té el menjar, mengen, paguen i marxen.

La interacció d'aquesta iteració és **per clic**. El drag-and-drop es farà en una iteració
posterior **sobre les mateixes accions** (la lògica queda desacoblada de la UI). L'objectiu
és que un dia un **cambrer** faci els clics de moure tíquets/plats i un **cuiner** faci la
selecció i cocció automàticament.

---

## 2. Plats

Dos plats per començar, amb preu i temps de cocció diferents:

| Plat | Emoji | Preu | Cocció |
|------|-------|------|--------|
| Bistec | 🥩 | 10 € | 2,5 s |
| Costelles | 🍖 | 16 € | 3,5 s |

---

## 3. Flux del bucle

1. **Arribada** — quan la taula és lliure, cada ~2 s arriba un **grup** d'1, 2 o 4 comensals
   (el 2 i el 4 són habituals; l'1 és rar). Salta un **avís visual** ("🔔 Taula de N!").
2. **Comanda** — cada comensal decideix un plat (bistec o costelles) a l'arribar. Surt **un
   tíquet per taula** amb la comanda.
3. **Portar el tíquet** — **clic al tíquet** → la comanda passa a la cuina (queda visible a
   la cuina). Fins que el tíquet no és a la cuina, no es pot cuinar res d'aquesta taula.
4. **Cuinar** — la cuina té **1 BBQ** (només un plat alhora). **Clic a la BBQ lliure** →
   menú amb els plats → se'n **selecciona un**. Barra de progrés que s'omple durant el temps
   de cocció. Si es cuina un plat que **no fa falta**, es cuina igualment però **no en surt
   cap plat útil** → només s'ha perdut temps (versió indulgent, sense enfadar clients).
5. **Entregar** — en acabar la cocció apareix un **plat llest** a la cuina. **Clic al plat**
   → va a un comensal que havia demanat aquell plat (passa a "servit").
6. **Menjar i pagar** — **només quan TOTS els comensals estan servits** arrenca el
   temporitzador de menjar (~4 s). En acabar, el grup **paga** (suma dels preus dels seus
   plats), els diners se sumen, i la **taula queda lliure**. Torna a començar.

---

## 4. Aforament i escala inicial

- **1 taula** de capacitat **4**. Només un grup a la vegada.
- **1 BBQ** (cuina petita, un plat alhora).

Ampliar taules i BBQs (i automatitzar amb personal) queda per a iteracions futures.

---

## 5. Estat del joc

```
state = {
  money,                 // diners acumulats
  spawnTimer,            // segons fins a la propera arribada (compta quan la taula és lliure)
  table:                 // null = lliure
    | null
    | {
        diners: [ { dish, status } ],   // dish: 'bistec'|'costelles'; status: 'waiting'|'served'
        ticketLocation,                 // 'table' | 'kitchen'
        eatingTimer,                    // null fins que tots servits; llavors segons restants
      },
  bbq:                   // null = lliure
    | null
    | { dish, remaining },              // remaining: segons de cocció que falten
  readyPlates: [ dish ],                // plats cuinats pendents d'entregar
  lastSeen,
}
```

---

## 6. Accions (pures, testejables)

- `tick(state, dt, rng) → { state, events }` — avança el temps: fa arribar grups (quan
  toca), avança la cocció de la BBQ (i genera plat o el malgasta), arrenca el menjar quan
  tots estan servits, avança el menjar i **cobra** quan s'acaba. Retorna `events` (llista de
  `{ type: 'arrival', size }` i `{ type: 'payment', amount }`) perquè la UI mostri avisos.
- `sendTicket(state) → state` — mou el tíquet de 'table' a 'kitchen'.
- `startCooking(state, dish) → state` — si la BBQ és lliure i el tíquet és a la cuina, comença
  a coure `dish`.
- `deliverPlate(state, dish) → state` — si hi ha un plat llest de `dish` i un comensal
  "waiting" que el vol, l'entrega (comensal → 'served', treu un plat).

L'**aleatorietat** (mida del grup i plat de cada comensal) s'injecta com a `rng` (una funció
que retorna un número a `[0, 1)`) per poder testejar de forma **determinista**.

### Regles derivades

- **Coure genera plat només si fa falta**: en completar-se la cocció, es crea un plat llest
  només si el nombre de comensals "waiting" que volen aquell plat supera els plats ja llestos
  d'aquell tipus. Si no, el temps s'ha perdut. Això evita acumular plats sobrants.
- **El menjar arrenca només amb tot el grup servit** (regla explícita del disseny).

---

## 7. UI

- **Layout de dues columnes**: sala (esquerra) i cuina (dreta).
- Sala: la taula amb els comensals (plat que volen + estat: esperant / menjant), i el
  **tíquet** clicable quan és a la taula.
- Cuina: la **comanda** (recompte de plats pendents), la **BBQ** (clicable si lliure; mostra
  la barra de progrés si cou), i els **plats llestos** clicables per entregar.
- **Avisos** visuals per arribades i pagaments (a partir dels `events` del `tick`).
- La UI crida les accions pures; l'arrossegar futur cridarà les mateixes accions.

---

## 8. Persistència

- Es desa **només els diners** a `localStorage`. El servei en curs (taula, cuina, plats) **no
  es persisteix**: en recarregar, es comença amb la sala buida i els diners guardats.
- **Guanys offline desactivats** en aquesta iteració (encara no hi ha ingressos passius;
  tornaran amb l'automatització de personal).

---

## 9. Valors inicials (afinables)

| Paràmetre | Valor |
|-----------|-------|
| Bistec | 10 € · cocció 2,5 s |
| Costelles | 16 € · cocció 3,5 s |
| Temps de menjar | 4 s |
| Interval d'arribada | 2 s (quan la taula és lliure) |
| Mides de grup (pes) | 1 (pes 1), 2 (pes 3), 4 (pes 3) |
| Aforament | 1 taula de 4 · 1 BBQ |

---

## 10. Fora d'abast (properes iteracions)

- Drag-and-drop real (tíquets i plats).
- Automatització amb **cambrers** (mouen tíquets/plats) i **cuiners** (seleccionen i cuinen).
- Més taules i més BBQs; millores comprables amb els diners.
- Paciència dels clients / pressió de temps.
- Guanys offline (amb automatització).
