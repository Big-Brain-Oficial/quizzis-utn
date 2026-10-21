# Quizzes UTN

Bancos de preguntas de repaso para materias de ISI (UTN FRRe), con corrección inmediata, puntaje estilo
Moodle y progreso guardado en el navegador. Es un sitio estático: HTML, CSS y JavaScript vanilla con ES
modules, sin frameworks, sin build y sin dependencias en runtime.

Los cuestionarios están divididos por materia y, dentro de cada materia, por parcial: en la landing se
elige la materia y después el parcial que se quiere practicar.

Las preguntas se pueden ver de a una o todas juntas en una página. La vista "Todas en una página" sirve
para buscar una pregunta con Ctrl+F.

Cada pregunta se envía por separado. Si quedan preguntas con opciones marcadas sin enviar, al final aparece
**Enviar todas** para corregirlas de una vez; las que no tienen nada marcado quedan sin responder.

Cuando se responden todas las preguntas que se están viendo, aparece **Repetir las incorrectas**: borra esas
respuestas y deja el filtro en «las que estoy repitiendo», para volver a intentar solo las erradas o
parciales hasta tenerlas todas bien. Cada cuestionario explica arriba, en «Cómo funciona este cuestionario»,
los botones, los filtros, el puntaje y cómo se guardan las respuestas.

En la vista "Una por vez" hay atajos de teclado: `1`–`9` marcan opciones, `Enter` envía la respuesta (o
pasa a la siguiente si ya estaba enviada) y `←` `→` cambian de pregunta.

El botón de arriba a la derecha (sol/luna) cambia entre modo claro y oscuro. Si nunca se tocó, el sitio
sigue el tema del sistema.

Materias y parciales incluidos:

| Materia | Parcial | Carpeta | Preguntas |
|---|---|---|---|
| Administración de Sistemas de Información | 1er parcial | `subjects/asi/1er-parcial/` | 87 (78 con puntaje + 9 informativas) |
| | 2do parcial | `subjects/asi/2do-parcial/` | 237 (235 con puntaje + 2 informativas): los cuestionarios de la cátedra de las Unidades 4, 5 y 6, cada uno como categoría, y la Evaluación Formativa 3 |
| Redes de Datos | 1er parcial | `subjects/redes/1er-parcial/` | 97 (89 con link a la página de la teoría) |
| | 2do parcial | `subjects/redes/2do-parcial/` | 219 del PDF de parciales (las revisiones del cuestionario de estudio), por unidad (4 a 8), 120 con la retroalimentación de la cátedra como imagen y 186 con link a la página de la teoría (175 con el recorte de la diapositiva) |
| Sistemas de Información Geográfica | 1er parcial | `subjects/gis/1er-parcial/` | 84 (las ★ importantes y las 33 del 1er parcial 2025, con la página del apunte) |
| Tecnologías para la Automatización (TEPLA) | 1er parcial | `subjects/tepla/1er-parcial/` | 104 elaboradas a partir de *Apunte Solana P1 - TPLA*, separadas por unidad (24 de U1, 36 de U2, 22 de U3 y 22 de U4), todas con explicación y página del PDF |

Las de GIS salen del banco de [matiasgzlez/GIS](https://github.com/matiasgzlez/GIS): solo las marcadas como
importantes en clase y las del parcial 2025 (con sus variantes), en el orden de lectura de los apuntes.

## Estructura

```
index.html              # landing: lista las materias de subjects/subjects.json con sus parciales
favicon.ico, apple-touch-icon.png
img/                    # logo de la UTN y favicon en PNG, compartidos por todas las páginas
engine/
  quiz.js               # motor común de un cuestionario (render, puntaje, filtros, progreso)
  subject.js            # página de una materia: lista sus parciales para elegir uno
  quiz.css              # diseño común (claro/oscuro, mobile-first)
subjects/
  subjects.json         # manifiesto: slugs de las materias que muestra la landing
  asi/
    index.html          # elegir el parcial: initSubject({ slug: "asi" })
    subject.json        # nombre, descripción, color y parciales de la materia
    1er-parcial/
      index.html        # carga el motor con initQuiz({ slug: "asi", exam: "1er-parcial" })
      questions.json
      img/              # imágenes referenciadas por las preguntas
    2do-parcial/        # cuestionarios de la cátedra (Unidades 4, 5 y 6) y Evaluación Formativa 3
      index.html
      questions.json
      sources/          # PDFs de teoría (y sus páginas como imagen en pages/)
      cuestionarios/    # PDFs de los cuestionarios de estudio de la cátedra
  redes/
    index.html, subject.json
    1er-parcial/
      index.html
      questions.json
      sources/          # PDFs de teoría + mapping-report.md
        pages/          # páginas de los PDFs como imagen (las genera render-source-pages.py)
    2do-parcial/        # preguntas del PDF de parciales (revisiones del cuestionario de estudio)
      index.html
      questions.json
      img/              # retroalimentación de la cátedra (diapositivas) y la figura de una pregunta
      revisiones/       # el PDF de parciales, cortado en un archivo por intento
      sources/          # PDFs de teoría de las Unidades 4 a 9 (y los recortes de las diapositivas en pages/)
  gis/
    index.html, subject.json
    1er-parcial/
      index.html
      questions.json
      img/              # figuras de los apuntes
      slides/           # página del apunte de donde sale cada pregunta (sin los PDFs)
  tepla/
    index.html, subject.json
    1er-parcial/
      index.html
      questions.json    # Unidades 1 a 4: opción simple, múltiple, V/F y relacionar
      sources/          # Apunte Solana P1 - TPLA, referenciado por página
scripts/
  validate.mjs          # valida todos los questions.json
  rank-sources.mjs      # sugiere páginas de la teoría para cada pregunta
  render-source-pages.py # renderiza como imagen las páginas de confianza alta
serve.json, vercel.json # cleanUrls + trailingSlash (ver abajo)
```

## Correrlo local

`fetch` no funciona abriendo los archivos con `file://`, así que hace falta un servidor:

```sh
npx serve .
```

y abrí la URL que imprime (por defecto <http://localhost:3000>).

`serve.json` activa `cleanUrls` y `trailingSlash`, igual que en producción: `/subjects/redes` redirige a
`/subjects/redes/` (y `/subjects/redes/1er-parcial` a `/subjects/redes/1er-parcial/`). Sin la barra final,
los paths relativos de cada parcial (`questions.json`, `img/…`, `sources/…`) no se resuelven. Cualquier servidor que publique el sitio tiene que hacer lo mismo.

## Cargar las preguntas de un parcial preparado

Antes de escribir o cambiar preguntas, leé [`criterios.md`](criterios.md): de dónde tiene que salir cada
pregunta y cómo escribir las opciones para que no se pueda acertar por el largo o por el orden.

Un parcial puede tener su carpeta, su página y un `questions.json` sin preguntas; mientras `questions` esté
vacío, la materia lo muestra como «Próximamente». Para cargarlo, completá `topics` y `questions` en
`subjects/<slug>/<parcial>/questions.json` siguiendo el esquema de abajo (las imágenes van en `img/` o
`sources/` dentro de esa misma carpeta) y corré `node scripts/validate.mjs`.

Los ids de las preguntas empiezan con `<slug>-` y son únicos en todo el sitio. Para no chocar con los del
1er parcial conviene usar un prefijo propio, por ejemplo `redes-p2-01` o `asi-p2-01`.

## Agregar un parcial a una materia

1. Creá `subjects/<slug>/<parcial>/` (en minúsculas, sin espacios; por ejemplo `integrador`).
2. Copiá `subjects/redes/2do-parcial/index.html` y cambiá el `<title>` y el parcial en
   `initQuiz({ slug: "<slug>", exam: "<parcial>" })`.
3. Escribí `questions.json` con el esquema de abajo. `subject` es el nombre de la materia y `exam` el del
   parcial, iguales a los de `subject.json`.
4. Agregá `{ "slug": "<parcial>", "name": "<nombre visible>" }` a `exams` en `subjects/<slug>/subject.json`,
   en el orden en que se tienen que listar.
5. Corré `node scripts/validate.mjs` hasta que no marque errores.

## Agregar una materia

1. Creá `subjects/<slug>/` (slug en minúsculas, sin espacios; por ejemplo `sistemas-operativos`).
2. Copiá `subjects/redes/index.html` y `subjects/redes/subject.json` a la carpeta nueva. En el `index.html`
   cambiá el `<title>` y el slug de `initSubject({ slug: "<slug>" })`; en `subject.json`, el nombre, la
   descripción, el color y la lista de parciales:

   ```jsonc
   {
     "name": "Sistemas Operativos",          // nombre visible (igual al "subject" de cada questions.json)
     "description": "…",                     // opcional, subtítulo en la landing y en la materia
     "accent": "#2F6FD6",                    // color de la tarjeta en la landing (#RRGGBB)
     "accentDark": "#5B8FE6",                // opcional, acento en modo oscuro
     "exams": [{ "slug": "1er-parcial", "name": "1er parcial" }]
   }
   ```
3. Creá cada parcial como en la sección anterior.
4. Agregá el slug a `subjects/subjects.json` para que aparezca en la landing.
5. Corré `node scripts/validate.mjs` hasta que no marque errores.

El progreso de cada parcial se guarda en `localStorage` con la clave `quiz-<slug>-<parcial>-v1`. Los 1er
parcial de ASI, Redes y GIS le pasan además `legacyKey: "quiz-<slug>-v1"` al motor, para leer el progreso
guardado antes de que las materias se dividieran por parcial. Si cambiás los ids de preguntas ya publicadas,
las respuestas guardadas de esas preguntas se pierden.

El tema elegido con el botón claro/oscuro se guarda en `localStorage` con la clave `quiz-theme` (`light` o
`dark`). Cada `index.html` lo aplica con un script corto en el `<head>`, antes de cargar el CSS, para que la
página no aparezca primero con el otro tema.

## Esquema de `questions.json`

```jsonc
{
  "subject": "Redes de Datos",          // nombre de la materia (igual a "name" en subject.json)
  "exam": "1er parcial",                // nombre del parcial (igual al de "exams" en subject.json)
  "description": "Banco de preguntas…",        // opcional, subtítulo
  "accent": "#2F6FD6",                         // color de acento (#RRGGBB)
  "accentDark": "#5B8FE6",                     // opcional, acento en modo oscuro
  "emptyFeedback": "La cátedra no incluyó…",   // texto si falta "fb"; null oculta la sección
  "topicFilter": "multi",                      // opcional: "multi" (chips independientes) o
                                               // "pick" ("Todas" + chips que se combinan)
  "labels": {                                  // opcional, textos del filtro
    "topics": "Temas", "allTopics": "Todos los temas", "noTopics": "Ninguno", "section": "Sección",
    "feedback": "Explicación de la cátedra"    // título de la explicación ("fb")
  },
  "imageCaption": "Imagen de referencia",      // opcional, título de las imágenes en la revisión
  "about": ["<p>…</p>"],                       // opcional, HTML: bloque "Sobre este banco de preguntas"
  "footer": "…",                               // opcional, HTML: texto al pie
  "topics": {
    "1": { "name": "Modelo de capas", "color": "#E8772E", "striped": true, "note": "…" }
  },
  "questions": [ /* ver abajo */ ]
}
```

`about` y `footer` se insertan como HTML sin escapar. Son contenido del repo, no de los usuarios.
`about` lleva solo lo propio del banco: de dónde salen las preguntas, qué significa cada tema o categoría y
las salvedades. Cómo usar el cuestionario lo explica el motor en «Cómo funciona este cuestionario», igual
en todos los parciales, así que no se repite en `about`. `footer` lleva los créditos o la lista de fuentes.
En `topics`, `striped` dibuja la muestra rayada (como los pares de cable T568B) y `note` agrega una
aclaración sobre el tema, visible en los filtros y en cada pregunta.

### Preguntas

| Campo | Tipos | Descripción |
|---|---|---|
| `id` | todos | Único en todo el sitio, con prefijo `<slug>-`. |
| `topic` | todos | Clave de `topics` (número o string). |
| `type` | todos | `single`, `multi`, `tf`, `match` o `info`. |
| `catedra` | todos | `true` si la pregunta viene tal cual del material de la cátedra o de un parcial (no se modifica); `false` si la armamos a partir del material. Ver [`criterios.md`](criterios.md). |
| `text` | todos | Enunciado. Los saltos de línea (`\n`) se respetan. |
| `opts` | single, multi, tf | Opciones. En `tf` son `["Verdadero", "Falso"]`. |
| `correct` | single, multi, tf, match | Índices correctos. En `match`, uno por stem: índice en `choices`. `[]` = sin respuesta confirmada (no se corrige). Una `single` puede tener más de uno cuando la cátedra acepta varias opciones (cualquiera suma el puntaje); en ese caso necesita `note`. |
| `stems`, `choices` | match | Ítems a emparejar y opciones del desplegable. |
| `answer` | info | Texto que se revela con "Ver respuesta". Las `info` no suman puntaje. |
| `fb` | opcional | Explicación de la cátedra. |
| `tip` | opcional | Comentario breve y discreto bajo el encabezado de la pregunta, visible antes de responder (por ejemplo, «Suele tomarse en el parcial»). |
| `note` | opcional | Aviso que se muestra al responder (por ejemplo, una respuesta dudosa). |
| `section` | opcional | Sub-agrupación (por ejemplo, "1er parcial 2024"). Se muestra como badge y habilita el filtro por sección. |
| `img` | opcional | Ruta relativa a la carpeta del parcial (`img/x.jpg`). Se muestra al corregir, con `imageCaption` como título. |
| `figure` | opcional | Imagen que forma parte del enunciado (por ejemplo, un esquema con los datos de la pregunta): se muestra antes de responder, debajo del texto. Ruta relativa como `img`. |
| `source` | opcional | `{ "file": "sources/x.pdf", "page": 12, "confidence": "high" \| "medium" \| "low", "img": "sources/pages/x-p12.webp" }`, más `crop` opcional (ver [Referencias a la teoría](#referencias-a-la-teoría)). Muestra "Ver en la teoría", que abre `x.pdf#page=12`, con una aclaración si la confianza es media (la página trata el tema, pero no da la respuesta completa) o baja. `page` es la página física del PDF (empieza en 1). Si está `img`, la corrección muestra además la imagen de esa página, para ver el respaldo sin abrir el PDF. En un parcial con los PDFs en el repo, una pregunta sin `source` (salvo las `info`) muestra «No figura en los apuntes de teoría». Sin `file` (cuando el PDF no está en el repo) muestra solo la imagen, con `label` como rótulo: `{ "label": "Unidad 3, diap. 52", "page": 52, "confidence": "high", "img": "slides/u3-52.webp" }`. |
| `origin` | opcional | De qué parcial salió la pregunta. `{ "file": "sources/1er parcial.pdf", "page": 14, "label": "1er parcial de teoría, 25 oct 2021", "crop": [[0, 28, 100, 58]], "img": "sources/pages/1er parcial-p14-abc123.webp" }`. `file` es el PDF en el repo, con el nombre con el que está guardado. `label` es el nombre que se muestra (el archivo puede llamarse distinto). `page` es la página física. `crop` usa el mismo formato que `source.crop` y recorta la pregunta, no la página entera. Al corregir se ve esa captura y el enlace «Ver en el parcial», que abre el PDF en esa página. No lleva `confidence`: la pregunta está en esa página o no está. |

### Puntaje

Cada pregunta vale 1:

- `single` / `tf`: 1 si la opción es correcta, 0 si no.
- `multi`: `max(0, (aciertos − errores) / cantidad de correctas)`.
- `match`: pares correctos / total de pares.

## Validación

```sh
node scripts/validate.mjs
```

Recorre `subjects/*/subject.json` y el `questions.json` de cada parcial, y verifica, entre otras cosas:

- ids únicos y con el prefijo correcto
- `topic` existente
- índices de `correct` dentro de rango
- `match` con tantos `correct` como `stems`
- campos obligatorios por tipo, y `catedra` (`true` o `false`) en todas las preguntas
- que existan los archivos de `img`, `figure`, `source` y `origin` (un `source` sin `file` necesita `img` y `label`; un `origin` necesita `file`, `page` y `label`)
- que `subjects.json` y los `exams` de cada `subject.json` estén sincronizados con las carpetas
- que `subject` y `exam` de cada `questions.json` coincidan con `subject.json`

Un parcial con `questions` vacío no es un error: se informa como «Próximamente».

También informa en cuántas preguntas de opción simple que no son de la cátedra (`catedra: false`) la correcta
es la opción más larga. Si pasa bastante
más seguido que por azar, avisa con ⚠ y lista las preguntas donde la correcta es más de 1,5 veces más larga
que los distractores (ver [`criterios.md`](criterios.md)). Ese aviso no cuenta como error.

Si encuentra errores, sale con código 1.

## Referencias a la teoría

`scripts/rank-sources.mjs` necesita `pdftotext` (poppler). Sugiere, para cada pregunta, las páginas del PDF
con más términos del enunciado y de la respuesta correcta:

```sh
node scripts/rank-sources.mjs redes/1er-parcial                 # todas las preguntas
node scripts/rank-sources.mjs redes/1er-parcial redes-c8 --top 5
```

Son solo candidatos: la página y la confianza de cada `source` las decide una persona. El detalle de
las asignaciones actuales de Redes, con el fragmento que justifica cada una, está en
[`subjects/redes/1er-parcial/sources/mapping-report.md`](subjects/redes/1er-parcial/sources/mapping-report.md).

Para las preguntas con `confidence: "high"` (la respuesta figura seguro en esa página), la corrección muestra
la página como imagen. Las genera `scripts/render-source-pages.py`, que necesita PyMuPDF y Pillow
(`pip install pymupdf pillow`):

```sh
python scripts/render-source-pages.py redes/1er-parcial
```

Escribe `sources/pages/<pdf>-p<N>.webp`, completa `source.img` y `origin.img` en `questions.json` y borra las
imágenes que ya no se usan. Hay que volver a correrlo después de cambiar la página, la confianza o el recorte
de un `source`, o la página o el recorte de un `origin`. Con `--only origin` (o `--only source`) regenera solo
ese campo y deja las imágenes del otro.

Cuando la página tiene mucho más que la respuesta, `source.crop` muestra solo una parte: es una lista de
recuadros `[x0, y0, x1, y1]` en porcentaje de la imagen de la página (sin los márgenes blancos), que se apilan
uno debajo del otro. Por ejemplo, `"crop": [[0, 58.5, 100, 66]]` deja la franja entre el 58,5 % y el 66 % de
la altura. Cada recorte se guarda como `sources/pages/<pdf>-p<N>-<hash>.webp`, así dos preguntas de la misma
página pueden mostrar partes distintas. Las del 2do parcial de ASI usan recortes, porque el apunte es texto
corrido en A4, y las del 2do parcial de Redes también, para mostrar solo los renglones o el diagrama de la
diapositiva que responden la pregunta.

Si la respuesta sigue en otra página, el recuadro lleva la página como quinto valor: `[x0, y0, x1, y1, página]`.
Por ejemplo, `"crop": [[0, 80, 100, 100], [0, 0, 100, 12, 5]]` muestra el final de la página de `source.page` y,
debajo, el principio de la página 5. `source.page` sigue siendo la página que abre «Ver en la teoría».

## De qué parcial sale la pregunta

`origin` cita el parcial, no el apunte. El PDF va en `sources/` con el nombre del archivo (el de Drive, si
viene de ahí) y `label` dice de qué examen se trata. El recorte muestra la pregunta tal como aparece en esa
revisión, con su número y sus opciones. «Ver en el parcial» abre ese PDF en `origin.page`. El mismo
`render-source-pages.py` genera la imagen a partir de `origin.crop`.
