# CLAUDE.md

Sitio estático de cuestionarios de repaso para materias de ISI (UTN FRRe): HTML, CSS y JavaScript
vanilla con ES modules, sin build ni dependencias. La estructura, el esquema de `questions.json` y los
scripts están en [`README.md`](README.md). Cómo escribir las preguntas está en
[`criterios.md`](criterios.md). Leé los dos antes de tocar un banco de preguntas.

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
  `localStorage` por id y se pierde.
- Los ids nuevos llevan el prefijo de la materia y del parcial (por ejemplo `asi-p2-…`) y son únicos en
  todo el sitio.
- Si cambiás `page` o `crop` de un `source` o de un `origin`, volvé a correr
  `python scripts/render-source-pages.py <materia>/<parcial>` (agregá `--only origin` o `--only source`
  para regenerar solo uno de los dos).
- Si agregás un parcial o cambia lo que contiene, actualizá su fila en la tabla de `README.md` (sin
  cantidades: las informa el validador). Si agregás una categoría de la cátedra o de parciales,
  actualizá la lista de `criterios.md` que dice qué categorías llevan `catedra: true`.

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
python scripts/test-open-questions.py    # si cambiás el motor o las preguntas abiertas (Playwright)
npx serve .                              # para ver el sitio; con file:// no anda fetch
```

Revisá el aviso ⚠ del validador sobre la opción más larga: en las preguntas con `catedra: false` hay
que equilibrar las opciones, y en las de la cátedra se deja como está.

## Estilo

- Todo el contenido, los comentarios del repo y los mensajes de commit van en español rioplatense
  (voseo: «corré», «leé»).
- Commits en tercera persona del presente, describiendo el cambio: «Agrega las preguntas de parcial de
  la Unidad 2 de TEPLA».
- Los cambios entran por rama y pull request, no directo a `main`.
- `/Apuntes y parciales/` es material local de referencia y no se versiona.
