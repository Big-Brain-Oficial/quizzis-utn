# CLAUDE.md

Sitio estático de cuestionarios de repaso para materias de ISI (UTN FRRe): HTML, CSS y JavaScript
vanilla con ES modules, sin build ni dependencias. Acá están la estructura, el esquema de
`questions.json` y los scripts. Cómo escribir las preguntas está en [`criterios.md`](criterios.md):
leelo antes de tocar un banco de preguntas. [`README.md`](README.md) es para cualquier lector: no le
agregues detalles técnicos.

## Preguntas de la cátedra y de parciales: no se modifican

Es la regla más importante del repo. Cada pregunta tiene el campo `catedra`:

- `"catedra": true`: viene tal cual de un cuestionario, una evaluación formativa o un parcial.
  **No cambies `text`, `opts` ni `correct`**, aunque la respuesta parezca equivocada, la correcta sea la
  opción más larga o haya errores de escritura (en TEPLA se conservan a propósito). Tampoco cambies
  `catedra` a `false` para poder editarla, ni cambies su `type`.
- `"catedra": false`: la armamos nosotros a partir del material. Se puede modificar y tiene que cumplir
  todos los criterios de `criterios.md`.

En una pregunta con `catedra: true`:

- Si creés que la respuesta está mal o que la `note` que la explica no alcanza, no la cambies:
  avisale al usuario con la evidencia (página del apunte, captura del parcial) y esperá que decida.
  Muchas tienen una `correct` deducida y avisada con `note`, porque la cátedra no publicó la clave.
- Los campos que escribimos nosotros (`fb`, `note`, `tip`, el `answer` de las `info`) se cambian solo
  si el usuario lo pide.
- Las referencias (`source`, `origin`, sus `crop` e `img`) se pueden completar o corregir.

Para reforzar un tema que cubre una pregunta de la cátedra, agregá preguntas nuevas con
`"catedra": false` en lugar de modificarla.

## Al agregar o cambiar preguntas

- Todo tiene que salir del material del repo o del que comparte el usuario. No agregues conocimiento
  general ni otras fuentes. Si un parcial pide desarrollar sin opciones, la pregunta queda como `info`
  y no se inventan opciones.
- No cambies los `id` de preguntas ya publicadas: el progreso de los usuarios se guarda en
  `localStorage` por id y se pierde. El código de «Pasar a otro dispositivo» también lleva las
  respuestas por id, y al cargarlo se ignoran las de preguntas que ya no están.
- Los ids nuevos llevan el prefijo de la materia y del parcial (por ejemplo `asi-p2-…`) y son únicos en
  todo el sitio.
- Si cambiás `page`, `confidence` o `crop` de un `source`, o `page` o `crop` de un `origin`, volvé a
  correr `python scripts/render-source-pages.py <materia>/<parcial>` (ver
  [Referencias a la teoría y a los parciales](#referencias-a-la-teoría-y-a-los-parciales)).
- Si agregás una materia, sumala a la lista de materias de `README.md` (los parciales no se listan
  ahí). Si agregás una categoría de la cátedra o de parciales, actualizá la lista de `criterios.md`
  que dice qué categorías llevan `catedra: true`.

## Estructura

```
index.html              # landing: lista las materias de subjects/subjects.json con sus parciales
img/                    # logo de la UTN y favicon en PNG, compartidos por todas las páginas
engine/
  quiz.js               # motor común de un cuestionario (render, puntaje, filtros, progreso)
  subject.js            # página de una materia: lista sus parciales para elegir uno
  quiz.css              # diseño común (claro/oscuro, mobile-first)
subjects/
  subjects.json         # slugs de las materias que muestra la landing
  <slug>/
    index.html          # elegir el parcial: initSubject({ slug: "<slug>" })
    subject.json        # nombre, descripción, color y parciales de la materia
    <parcial>/
      index.html        # initQuiz({ slug: "<slug>", exam: "<parcial>" })
      questions.json
      img/              # figuras del enunciado, opciones que son un dibujo, retroalimentación
      sources/          # PDFs de teoría y de parciales; sus recortes como imagen en pages/
scripts/
  validate.mjs          # valida todos los questions.json
  rank-sources.mjs      # sugiere páginas de la teoría para cada pregunta
  render-source-pages.py # renderiza como imagen las páginas y los recortes de source y origin
  test-open-questions.py # prueba de navegador de las preguntas abiertas
serve.json, vercel.json # cleanUrls + trailingSlash
```

Carpetas propias de algunos parciales: `subjects/asi/2do-parcial/cuestionarios/` (PDFs de los
cuestionarios de estudio), `subjects/redes/2do-parcial/revisiones/` (el PDF de parciales, un archivo por
intento) y `subjects/gis/1er-parcial/slides/` (la página del apunte de cada pregunta, sin los PDFs).

`serve.json` y `vercel.json` activan `cleanUrls` y `trailingSlash`: `/subjects/redes/1er-parcial`
redirige a `/subjects/redes/1er-parcial/`. Sin la barra final no se resuelven los paths relativos de cada
parcial (`questions.json`, `img/…`, `sources/…`), así que cualquier servidor que publique el sitio tiene
que hacer lo mismo.

## Agregar un parcial o una materia

Un parcial puede tener su carpeta, su página y un `questions.json` con `questions` vacío: la materia lo
muestra como «Próximamente».

Parcial nuevo en una materia existente:

1. Creá `subjects/<slug>/<parcial>/` (minúsculas, sin espacios; por ejemplo `integrador`).
2. Copiá `subjects/redes/2do-parcial/index.html` y cambiá el `<title>` y el parcial de `initQuiz`.
3. Escribí `questions.json` con el esquema de abajo. `subject` y `exam` tienen que coincidir con los
   nombres de `subject.json`.
4. Agregá `{ "slug": "<parcial>", "name": "<nombre visible>" }` a `exams` en `subject.json`, en el orden
   en que se tienen que listar.

Materia nueva:

1. Creá `subjects/<slug>/` y copiá `subjects/redes/index.html` y `subjects/redes/subject.json`. En el
   `index.html` cambiá el `<title>` y el slug de `initSubject`; en `subject.json`:

   ```jsonc
   {
     "name": "Sistemas Operativos",          // igual al "subject" de cada questions.json
     "description": "…",                     // opcional, subtítulo en la landing y en la materia
     "accent": "#2F6FD6",                    // color de la tarjeta (#RRGGBB)
     "accentDark": "#5B8FE6",                // opcional, acento en modo oscuro
     "exams": [{ "slug": "1er-parcial", "name": "1er parcial" }]
   }
   ```
2. Creá cada parcial como arriba y agregá el slug a `subjects/subjects.json`.

En los dos casos, corré `node scripts/validate.mjs` hasta que no marque errores.

## Esquema de `questions.json`

```jsonc
{
  "subject": "Redes de Datos",                 // igual a "name" en subject.json
  "exam": "1er parcial",                       // igual al de "exams" en subject.json
  "description": "Banco de preguntas…",        // opcional, subtítulo
  "accent": "#2F6FD6",                         // color de acento (#RRGGBB)
  "accentDark": "#5B8FE6",                     // opcional, acento en modo oscuro
  "emptyFeedback": "La cátedra no incluyó…",   // texto si falta "fb"; null oculta la sección
  "topicFilter": "multi",                      // opcional: "multi" (chips independientes) o
                                               // "pick" ("Todas" + chips que se combinan)
  "openQuestions": true,                       // opcional: presenta las info como preguntas abiertas
  "labels": {                                  // opcional, textos del filtro
    "topics": "Temas", "allTopics": "Todos los temas", "noTopics": "Ninguno", "section": "Sección",
    "feedback": "Explicación de la cátedra"    // título de la explicación ("fb")
  },
  "imageCaption": "Imagen de referencia",      // opcional, título de las imágenes en la revisión
  "about": ["<p>…</p>"],                       // opcional, HTML: "Sobre este banco de preguntas"
  "footer": "…",                               // opcional, HTML: créditos o lista de fuentes
  "topics": {
    "1": { "name": "Modelo de capas", "color": "#E8772E", "striped": true, "note": "…" }
  },
  "questions": [ /* ver abajo */ ]
}
```

- `about` y `footer` se insertan como HTML sin escapar (son contenido del repo, no de los usuarios). Qué
  va en `about` lo dice `criterios.md`.
- `openQuestions: true` ofrece las secciones «Todas las preguntas», «Cuestionario» y «Preguntas
  Abiertas»: en las `info` se escribe un desarrollo y se compara con `answer`, sin corrección ni puntaje.
  Sin la opción, las `info` son tarjetas que solo muestran la respuesta.
- En `topics`, `striped` dibuja la muestra rayada (como los pares de cable T568B) y `note` agrega una
  aclaración visible en los filtros y en cada pregunta.

### Preguntas

| Campo | Tipos | Descripción |
|---|---|---|
| `id` | todos | Único en todo el sitio, con prefijo `<slug>-`. |
| `topic` | todos | Clave de `topics` (número o string). |
| `type` | todos | `single`, `multi`, `tf`, `match` o `info`. |
| `catedra` | todos | `true` si viene tal cual de la cátedra o de un parcial; `false` si la armamos nosotros. |
| `text` | todos | Enunciado. Los `\n` se respetan. |
| `opts` | single, multi, tf | Opciones. En `tf`, `["Verdadero", "Falso"]`. Una opción que es un dibujo es `{ "img": "img/opcion.png", "alt": "…" }`. |
| `correct` | single, multi, tf, match | Índices correctos; en `match`, uno por stem (índice en `choices`). `[]` = sin respuesta confirmada, no se corrige. Una `single` con más de uno acepta cualquiera y necesita `note`. |
| `stems`, `choices` | match | Ítems a emparejar y opciones del desplegable. |
| `answer` | info | Se revela con «Ver respuesta». No suma puntaje. |
| `fb` | opcional | Explicación de la cátedra o nuestra. |
| `tip` | opcional | Comentario breve visible antes de responder («Suele tomarse en el parcial»). |
| `note` | opcional | Aviso al responder (por ejemplo, una respuesta deducida). |
| `section` | opcional | Sub-agrupación («1er parcial 2024»): badge y filtro por sección. |
| `img` | opcional | Imagen que se muestra al corregir, con `imageCaption`. Ruta relativa a la carpeta del parcial. |
| `figure` | opcional | Imagen que forma parte del enunciado: se ve antes de responder. |
| `source` | opcional | Página de la teoría. Ver abajo. |
| `origin` | opcional | Parcial del que salió. Ver abajo. |

Puntaje (cada pregunta vale 1): `single` y `tf`, 1 o 0; `multi`, `max(0, (aciertos − errores) /
correctas)`; `match`, pares correctos / total de pares.

## Referencias a la teoría y a los parciales

`source` cita el apunte:

```jsonc
{ "file": "sources/x.pdf", "page": 12, "confidence": "high", "crop": [[0, 58.5, 100, 66]],
  "img": "sources/pages/x-p12-abc123.webp" }
```

- `page` es la página física del PDF (empieza en 1). «Ver en la teoría» abre `x.pdf#page=12`.
- `confidence`: `high` (la respuesta figura en esa página), `medium` (trata el tema pero no da la
  respuesta completa) o `low`; con `medium` y `low` se muestra una aclaración. Solo las `high` llevan
  imagen.
- Sin `file` (el PDF no está en el repo, como en GIS) se muestra solo la imagen, con `label` como rótulo:
  `{ "label": "Unidad 3, diap. 52", "page": 52, "confidence": "high", "img": "slides/u3-52.webp" }`.
- En un parcial con los PDFs en el repo, una pregunta sin `source` (salvo las `info`) muestra «No figura
  en los apuntes de teoría».

`origin` cita el parcial: `{ "file": "sources/1er parcial.pdf", "page": 14, "label": "1er parcial de
teoría, 25 oct 2021", "crop": [[0, 28, 100, 58]], "img": "…" }`. `file` es el PDF con el nombre con el
que está guardado (el de Drive, si viene de ahí) y `label` el nombre que se muestra. El recorte muestra la
pregunta como aparece en el parcial, con su número y sus opciones. No lleva `confidence`.

`crop` es una lista de recuadros `[x0, y0, x1, y1]` en porcentaje de la página (sin los márgenes
blancos), que se apilan uno debajo del otro. Un quinto valor toma el recuadro de otra página:
`[[0, 80, 100, 100], [0, 0, 100, 12, 5]]` muestra el final de `page` y el principio de la página 5. En
el 2do parcial de ASI, el 2do de Redes y TEPLA, el recorte de `source` es la frase o el diagrama que
responde.

Scripts:

- `node scripts/rank-sources.mjs redes/1er-parcial [id] [--top 5]` sugiere páginas con más términos del
  enunciado y de la respuesta (necesita `pdftotext` de poppler). Son candidatos: la página y la
  confianza las decide una persona. Las asignaciones de Redes 1er parcial están justificadas en
  `subjects/redes/1er-parcial/sources/mapping-report.md`.
- `python scripts/render-source-pages.py <materia>/<parcial> [--only source|origin]` (necesita
  `pip install pymupdf pillow`) escribe `sources/pages/<pdf>-p<N>[-<hash>].webp`, completa `img` en
  `source` y `origin` y borra las imágenes que ya no se usan.

## Al cambiar el motor

`engine/quiz.js`, `engine/subject.js` y `engine/quiz.css` los usan todos los parciales, y no todos
activan lo mismo: TEPLA usa `openQuestions`, Redes usa `striped`, GIS tiene `source` sin `file` y los
1er parcial de ASI, Redes y GIS pasan `legacyKey`. Probá el cambio en más de una materia, en modo claro
y oscuro y en ancho de celular.

- El progreso de cada parcial se guarda en `localStorage` con la clave `quiz-<slug>-<parcial>-v1`.
  `legacyKey: "quiz-<slug>-v1"` lee el progreso guardado antes de que las materias se dividieran por
  parcial. Si cambiás el formato de lo guardado, el progreso viejo tiene que seguir cargando.
- En la modalidad de preguntas abiertas, el desarrollo se guarda mientras se escribe en `writtenAnswers`,
  dentro de la misma clave. «Borrar mis respuestas» también lo borra.
- El tema claro/oscuro se guarda en `quiz-theme` (`light` o `dark`). Cada `index.html` lo aplica con un
  script corto en el `<head>`, antes de cargar el CSS, para que la página no aparezca primero con el
  otro tema: si agregás una página, copiá ese script.
- La ayuda «Cómo funciona este cuestionario» la genera el motor y es la misma en todos los parciales:
  si cambiás un botón, un filtro o un atajo, actualizala.

## Verificación

```sh
node scripts/validate.mjs                # tiene que terminar en «OK: sin errores»
python scripts/test-open-questions.py    # si cambiás el motor o las preguntas abiertas
npx serve .                              # para ver el sitio; con file:// no anda fetch
```

El validador revisa ids, `topic`, rangos de `correct`, campos obligatorios por tipo, que existan los
archivos referenciados y que `subjects.json`, cada `subject.json` y las carpetas estén sincronizados. Si
hay errores sale con código 1. Revisá también su aviso ⚠ sobre la opción más larga: en las preguntas con
`catedra: false` hay que equilibrar las opciones, y en las de la cátedra se deja como está.

La prueba de preguntas abiertas necesita Playwright (`pip install playwright`) y Chrome (`--channel
msedge` para Edge). Levanta un servidor temporal y usa un perfil de navegador aislado.

## Estilo

- Todo el contenido, los comentarios del repo y los mensajes de commit van en español rioplatense
  (voseo: «corré», «leé»).
- Commits en tercera persona del presente, describiendo el cambio: «Agrega las preguntas de parcial de
  la Unidad 2 de TEPLA».
- Los cambios entran por rama y pull request, no directo a `main`.
- `/Apuntes y parciales/` es material local de referencia y no se versiona.
