# Idle BBQ Restaurant — Document de disseny

**Data:** 2026-08-29
**Autors:** Jordi i Xavi
**Estat:** Disseny del primer prototip (vertical slice) aprovat conceptualment; pendent de revisió del document.

---

## 1. Visió

Un **idle BBQ restaurant** 2D que es juga al **navegador**. Comences clicant per servir
clients, contractes personal que automatitza la feina, i vas fent créixer el teu restaurant.
El joc segueix generant diners fins i tot quan no s'està jugant (**guanys offline**).

El segell propi (què el fa un joc de BBQ i no un restaurant genèric) es basa en tres pilars:

- **Carns i talls** — desbloqueges carns i talls millors (costelles, brisket, etc.) que donen
  més diners i atrauen més clients.
- **Productors locals** — fas tractes amb ramaders/productors per aconseguir millor matèria
  primera (qualitat, fresc, exclusivitat). Una cadena de subministrament.
- **Ambient i sala** — decoració, música, terrassa, fum... millorar l'ambient fa que els
  clients paguin més i vinguin més sovint.
- **Personal i les seves habilitats** — no només contractes personal, sinó que en **millores
  les habilitats**: la tècnica de cuina dels **cuiners**, i les capacitats dels **cambrers**,
  **sommelier**, **caixer**, etc. Cada rol té el seu efecte (rapidesa de servei, qualitat,
  propines, ingressos per venda de vins, eficiència de cobrament...).

A llarg termini el joc barreja **clicker + automatització** amb **gestió/tycoon** (col·locar
graelles, taules i personal en un espai 2D).

### Fora d'abast (per ara, idees per al futur)

- **Minijoc del "punt de la carn"** (controlar temps/foc perquè la carn quedi al punt). Aparcat
  com a possible afegit futur.
- **Graella de col·locació 2D (tycoon)** completa. Vindrà quan el bucle base funcioni.
- Sistemes complets i profunds dels tres pilars. S'afegiran **un a un** després del prototip.

---

## 2. Objectius del projecte

- **Divertir-nos i aprendre junts** fent el joc.
- Tenir alguna cosa **jugable ràpid** i **iterar** sovint.
- Prioritzem un primer prototip petit i satisfactori per sobre de l'ambició inicial.

**No-objectius:** no busquem (encara) un joc complet i polit per publicar, ni validar una
única mecànica aïllada. L'important és el procés i tenir base sòlida per créixer.

---

## 3. Enfocament escollit: Vertical slice del bucle idle (opció A)

Construïm primer el **cor que enganxa** en una sola pantalla senzilla, i després hi afegim
els tres pilars del BBQ un a un. Així tenim un joc jugable de seguida i cada afegit posterior
es nota com un pas endavant.

---

## 4. Disseny del primer prototip

### 4.1 Bucle de joc

```
venen clients  →  serveixes (clic)  →  guanyes diners
      ↑                                      │
      └──────── compres millores  ←──────────┘
                (carns millors, personal que automatitza, capacitat)
```

1. Els **clients arriben** amb el temps.
2. El jugador **clica per servir** un client i **guanya diners** per cada client servit.
3. Gasta diners en **millores**:
   - **Carns millors** (2–3 al prototip): augmenten els diners per client servit.
   - **Contractar personal** (cuiner/cambrer): **automatitza** el servei → ingressos passius
     per segon, sense clicar.
   - **Capacitat**: més clients alhora / arriben més ràpid.
4. **Guanys offline**: en tornar, es calcula el temps passat i es mostra un avís de "mentre
   no hi eres has guanyat X".

### 4.2 Economia (simple i ajustable)

- Cada millora té un **cost base** que **escala** cada cop que la compres (creixement
  exponencial suau, p. ex. ×1.15 per nivell).
- Els ingressos passius = suma de la producció del personal contractat (diners/segon).
- Els valors concrets es defineixen en **dades** (una taula/config), per poder-los ajustar
  fàcilment sense tocar la lògica.

### 4.3 Guanys offline

- En guardar, s'anota la **marca de temps** (timestamp).
- En carregar, es calcula `temps_transcorregut × ingressos_passius` i s'afegeix al saldo,
  mostrant un resum a l'entrar. (Es pot posar un límit màxim d'hores acumulables més endavant.)

### 4.4 Persistència

- L'estat es desa a **localStorage** del navegador (partida local, sense servidor).

---

## 5. Tecnologia

- **HTML + CSS + JavaScript pur** (sense framework al principi). La UI del prototip és
  bàsicament números i botons, així que no cal res més pesat. Ràpid d'iterar i ideal per
  aprendre.
- **Bucle de joc** amb `requestAnimationFrame` (o interval) per acumular ingressos passius.
- **Desat** a `localStorage`; càlcul offline basat en timestamp.
- Quan arribi el tycoon 2D amb sprites i animacions, es valorarà una llibreria de canvas
  (p. ex. PixiJS o Phaser).

---

## 6. Arquitectura (unitats amb responsabilitat única)

Cada unitat fa una cosa clara i es pot entendre i provar per separat:

- **Estat del joc (model)** — les dades de la partida (diners, nivells de millores, personal,
  timestamp). No sap res de la UI.
- **Definicions/dades** — taula de millores i personal (cost base, escala, efecte). Fàcil
  d'editar per equilibrar el joc.
- **Motor / tick** — avança el temps, acumula ingressos passius, aplica els efectes.
- **Desat i offline** — desa/carrega a localStorage i calcula els guanys offline.
- **UI (render)** — pinta l'estat a la pantalla (saldo, botons de millora) i escolta els clics.

L'objectiu és poder canviar l'interior d'una unitat sense trencar les altres.

---

## 7. Full de ruta (després del prototip)

Un cop el bucle base "faci gustet", afegim els pilars un a un, cadascun com una millora
notòria:

1. **Carns i talls** — arbre de progressió de carns/talls més ampli.
2. **Productors locals** — cadena de subministrament d'ingredients i qualitat.
3. **Ambient i sala** — multiplicadors per decoració/experiència.
4. **Personal i habilitats** — diferents rols (cuiner, cambrer, sommelier, caixer...) que es
   contracten i **pugen d'habilitat**; cada rol amb el seu efecte propi.
5. **Tycoon 2D** — col·locació de graelles, taules i personal en un espai 2D.
6. **(Opcional) Minijoc del punt de la carn.**

> Nota: al **prototip** ja hi ha "contractar personal" com a font d'ingressos passius. El
> sistema ric de **rols i pujar-los d'habilitat** és l'evolució natural d'aquesta peça i
> s'hi construeix a sobre.

---

## 8. Decisions preses (registre)

| Tema | Decisió |
|------|---------|
| Plataforma | Navegador web (HTML/JS) |
| Objectiu | Divertir-nos i aprendre; iterar ràpid sobre un prototip petit |
| Estil de joc | Clicker + automatització barrejat amb gestió/tycoon (visió llarg termini) |
| Segell BBQ | Carns i talls, productors locals, ambient/sala |
| Personal i habilitats | Rols (cuiner, cambrer, sommelier, caixer...) que es contracten i pugen d'habilitat; cada rol amb efecte propi |
| Punt de la carn | Aparcat per al futur |
| Guanys offline | Sí |
| Ordre de construcció | Opció A: bucle idle primer, després pilars un a un |
