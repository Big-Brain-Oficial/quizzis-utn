# Quizzes UTN

Cuestionarios de repaso para materias de ISI (UTN FRRe), con corrección inmediata, puntaje estilo Moodle
y la referencia al apunte o al parcial de donde sale cada pregunta. Se elige la materia, después el
parcial, y se practica por tema. El progreso queda guardado en el navegador y se puede pasar a otro
dispositivo con un código.

Cada cuestionario explica arriba, en «Cómo funciona este cuestionario», los botones, los filtros, el
puntaje y los atajos de teclado.

## Materias

| Materia | Parcial | Contenido |
|---|---|---|
| Administración de Sistemas de Información | 1er parcial | Cuestionarios de la cátedra, Evaluaciones Formativas 1 y 2 y preguntas de parciales de teoría |
| | 2do parcial | Cuestionarios de las Unidades 4, 5 y 6, Evaluación Formativa 3 y preguntas de parciales de 2024 y 2025, con la captura de cada una |
| Redes de Datos | 1er parcial | Revisiones del cuestionario de estudio, con link a la página de la teoría |
| | 2do parcial | PDF de parciales (las revisiones del cuestionario de estudio) por unidad (4 a 8), con la retroalimentación de la cátedra y el recorte de la diapositiva |
| Sistemas de Información Geográfica | 1er parcial | Las preguntas ★ importantes y las del 1er parcial 2025, con la página del apunte |
| Tecnologías para la Automatización (TEPLA) | 1er parcial | Práctica de las Unidades 1 a 4 elaborada a partir de *Apunte Solana P1 - TPLA*, preguntas de parcial de cada unidad y preguntas abiertas, con el recorte del apunte y, si sale de un parcial, el de esa pregunta |

Las de GIS salen del banco de [matiasgzlez/GIS](https://github.com/matiasgzlez/GIS): solo las marcadas como
importantes en clase y las del parcial 2025 (con sus variantes), en el orden de lectura de los apuntes.

## De dónde salen las preguntas

Todo sale del material de la cátedra: apuntes, cuestionarios, evaluaciones formativas y parciales
anteriores. Las preguntas que vienen de la cátedra o de un parcial se dejan tal cual, aunque tengan errores
o una respuesta dudosa; cuando la cátedra no publicó la respuesta, se deduce del apunte y se avisa al
corregir. Las que armamos nosotros a partir del apunte siguen los criterios de [`criterios.md`](criterios.md).

## Colaborar

Si encontrás un error o querés sumar una materia o un parcial, abrí un issue o un pull request. Antes de
escribir preguntas, leé [`criterios.md`](criterios.md). Cómo está armado el sitio y cómo se carga un
parcial está en [`CLAUDE.md`](CLAUDE.md).

Para verlo en tu compu hace falta un servidor (abriendo los archivos directo no carga las preguntas):

```sh
npx serve .
```
