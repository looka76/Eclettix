# Parma dal dopoguerra a oggi — prova 9:16 (10 s)

## Fonti di ogni immagine

| File | Cosa | Fonte e licenza |
| --- | --- | --- |
| `assets/paper.jpg` | Texture di carta | Generata da Claude (rumore procedurale, Python/NumPy). Nessun diritto di terzi. |
| `assets/ruins-1945.png` | Edifici bombardati, retino tipografico | Illustrazione generata da Claude (SVG disegnato a codice + retino in Python, sorgente in `src/ruins.svg`). **Non è una foto d'archivio** e non ritrae un luogo preciso. |
| `assets/parma-oggi.png` | Battistero, Duomo e campanile di Parma | Illustrazione generata da Claude (SVG disegnato a codice, sorgente in `src/landmarks.svg`). Stilizzata, non è una foto. |
| Mappa (`compositions/mappa.html`) | Italia, province dell'Emilia-Romagna, fiume Po | Natural Earth 1:10m (admin 0, admin 1, fiumi), **pubblico dominio** — naturalearthdata.com |
| Titolo di giornale | Testata «Edizione straordinaria» | Testo scritto per il video; nessuna testata reale imitata. |

Le foto d'archivio da Wikimedia Commons non sono state usate: la rete dell'ambiente cloud blocca
`commons.wikimedia.org` e `upload.wikimedia.org`. Quando i domini sono consentiti, si possono
sostituire `ruins-1945.png` e `parma-oggi.png` con foto di pubblico dominio (ritagliate con
`rembg` e bordo bianco) senza toccare le animazioni.

## Struttura

- `giornale` (0–3,4 s): ritaglio di giornale, sottolineatura rossa che si disegna su «libera», rovine ritagliate, «1945» cerchiato.
- `mappa` (3,4–6,7 s): zoom Italia → Emilia-Romagna → Parma (viewBox SVG, tratti a spessore costante), Po, cerchio rosso, cartellino PARMA.
- `oggi` (6,7–10 s): titolo «Parma dal dopoguerra a oggi», sottolineatura su «a oggi», Battistero e Duomo ritagliati.

## Revisione (cosa ho visto e corretto)

1. «1945» rosso sopra il retino delle rovine: illeggibile (contrasto 1,98:1) → spostato sulla carta accanto alla foto.
2. Zoom della mappa con `scale` CSS: bordi spessi 15 px a fine zoom → zoom sul `viewBox`, spessori costanti.
3. Etichetta «Italia, 1945» rimasta a zoom finito → cambia in «Emilia-Romagna» a metà zoom.
4. Crediti mappa sovrapposti alla Sicilia → spostati in basso.
5. Vuoto tra titolo e illustrazione nella scena finale → illustrazione alzata e ingrandita.
6. «Ottant'anni dopo» impreciso nel 2026 → «1945 → oggi».

`check`: 0 errori, 0 avvisi (solo un'info sulla spinta del giornale, voluta).
Fotogrammi decodificati dall'MP4 controllati a 0 / 0,6 / 1,3 / 2,5 / 3,25 / 3,6 / 4,6 / 5,6 / 6,6 / 7,1 / 8 / 9,95 s.

## Limiti

- Nessun audio (non richiesto).
- Il primo terzo della scena 1 ha la metà bassa vuota fino a 0,8 s.
- Le illustrazioni sono stilizzate: con foto reali il video sarebbe molto più «Vox».
