// Shared quiz engine. Each exam page (subjects/<slug>/<exam>/) calls initQuiz({ slug, exam }) and the
// engine fetches ./questions.json (relative to the page), renders the UI into #app and keeps progress in
// localStorage under "quiz-<slug>-<exam>-v1". Questions are shown one at a time or all on one page (so the
// browser's Ctrl+F can find any of them).

const kindLabel = {
  single: "Seleccioná una opción",
  multi: "Seleccioná una o más opciones",
  tf: "Verdadero o falso",
  match: "Elegí la opción correcta para cada ítem",
  info: "Tarjeta informativa (sin puntaje): tocá «Ver respuesta»",
};

// Moodle-style score in [0,1]. multi: each wrong pick cancels a right one; match: per pair.
export function score(q, ans) {
  if (q.type === "match") {
    let ok = 0;
    q.correct.forEach((c, i) => { if (ans[i] === c) ok++; });
    return ok / q.correct.length;
  }
  if (q.type === "multi") {
    const hits = ans.filter((a) => q.correct.includes(a)).length;
    const wrong = ans.length - hits;
    return Math.max(0, (hits - wrong) / q.correct.length);
  }
  return ans.length === 1 && q.correct.includes(ans[0]) ? 1 : 0;
}

// info cards and questions without a confirmed key are never scored
export const isScored = (q) => q.type !== "info" && q.correct.length > 0;

// true when an answer (sent or draft) has at least one option or pair chosen
const hasAnswer = (q, ans) => !!ans && (q.type === "match" ? ans.some((a) => a >= 0) : ans.length > 0);

export const REPO_URL = "https://github.com/Big-Brain-Oficial/quizzis-utn/";
const GITHUB_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>';

// question mark in a circle: the button that opens "Cómo funciona este cuestionario"
const HELP_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/></svg>';

// GitHub mark + repo name, shown by topActions
export function repoLink() {
  return `<a class="repo" href="${REPO_URL}" target="_blank" rel="noopener noreferrer" title="Código fuente en GitHub (se abre en una pestaña nueva)">${GITHUB_ICON}<span>Big-Brain-Oficial/quizzis-utn</span></a>`;
}

// Light/dark toggle. An explicit choice is kept in localStorage and set as data-theme on <html> (each page's
// <head> applies it before the first paint); without one the page follows the system setting.
const THEME_KEY = "quiz-theme";
const MOON_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
const SUN_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>';
const systemDark = () => matchMedia("(prefers-color-scheme: dark)");
const isDark = () => {
  const t = document.documentElement.dataset.theme;
  return t ? t === "dark" : systemDark().matches;
};
// the icon shows the mode the button switches to
const toggleAttrs = (dark) => ({ pressed: String(dark), title: `Cambiar a modo ${dark ? "claro" : "oscuro"}`, icon: dark ? SUN_ICON : MOON_ICON });

// repo link + theme toggle, right-aligned in the topbar of the landing and every subject page
export function topActions() {
  const a = toggleAttrs(isDark());
  return `<div class="top-actions">${repoLink()}<button class="repo theme-toggle" type="button" data-theme-toggle aria-label="Modo oscuro" aria-pressed="${a.pressed}" title="${a.title}">${a.icon}</button></div>`;
}

function syncThemeToggles() {
  const a = toggleAttrs(isDark());
  document.querySelectorAll("[data-theme-toggle]").forEach((b) => {
    b.setAttribute("aria-pressed", a.pressed);
    b.title = a.title;
    b.innerHTML = a.icon;
  });
}

function setTheme(theme) {
  if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
  syncThemeToggles();
}

// Wires every theme toggle rendered by topActions, added once per page by the landing, initSubject and initQuiz
let themeReady = false;
export function initTheme() {
  if (themeReady) return;
  themeReady = true;
  document.addEventListener("click", (e) => {
    if (!e.target.closest("[data-theme-toggle]")) return;
    const theme = isDark() ? "light" : "dark";
    setTheme(theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (err) { /* storage unavailable: this page only */ }
  });
  systemDark().addEventListener("change", syncThemeToggles);
  // same choice in every open tab
  addEventListener("storage", (e) => { if (e.key === THEME_KEY) setTheme(e.newValue); });
}

// Floating "Volver arriba" pill centered at the top, added once per page by the landing, initSubject
// and initQuiz. Shows while the page is scrolled past the first 400px.
export function backToTop() {
  if (document.getElementById("toTop")) return;
  const btn = document.createElement("button");
  btn.id = "toTop";
  btn.type = "button";
  btn.className = "to-top";
  btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5l-7 7m7-7l7 7M12 5v14"/></svg>Volver arriba';
  document.body.append(btn);

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const update = () => btn.classList.toggle("show", scrollY > 400);
  addEventListener("scroll", update, { passive: true });
  update();
  btn.addEventListener("click", () => {
    scrollTo({ top: 0, behavior: reduceMotion.matches ? "auto" : "smooth" });
    // the button hides at the top: hand keyboard focus to the page title instead of losing it
    const h1 = document.querySelector("h1");
    if (h1) { h1.tabIndex = -1; h1.focus({ preventScroll: true }); }
  });
}

// breadcrumb from an exam page (subjects/<slug>/<exam>/) back to its subject and to the landing
function crumbs(subject) {
  return `<nav class="crumbs" aria-label="Ubicación"><a href="../../../">Materias</a><span aria-hidden="true">›</span><a href="../">${esc(subject)}</a></nav>`;
}

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Sets the subject accent as CSS variables; the stylesheet picks light or dark.
export function applyAccent(data, el = document.documentElement) {
  if (data.accent) el.style.setProperty("--accent-light", data.accent);
  el.style.setProperty("--accent-dark", data.accentDark || `color-mix(in srgb, ${data.accent || "#2F6FD6"} 70%, white)`);
}

export function swatch(topic) {
  if (!topic) return "";
  return `<span class="wire${topic.striped ? " striped" : ""}" style="--tc:${esc(topic.color)}" aria-hidden="true"></span>`;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const fmt = (n) => n.toFixed(2).replace(".", ",");

// legacyKey: storage key used before the subject was split by exam; read once if the new key is empty
export async function initQuiz({ slug, exam, legacyKey, root = document.getElementById("app") }) {
  backToTop();
  initTheme();
  const dataUrl = new URL("questions.json", document.baseURI);
  let DATA;
  try {
    const res = await fetch(dataUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    DATA = await res.json();
  } catch (e) {
    root.innerHTML = `<div class="wrap"><div class="card empty-state">No se pudieron cargar las preguntas (${esc(e.message)}).
      Si abriste el archivo directamente, levantá un servidor local: <code>npx serve .</code></div></div>`;
    return;
  }
  applyAccent(DATA);
  const heading = `<div class="topbar">${crumbs(DATA.subject)}${topActions()}</div>
    ${DATA.exam ? `<p class="kicker">${esc(DATA.exam)}</p>` : ""}
    <h1>${esc(DATA.subject)}</h1>
    ${DATA.description ? `<p class="sub">${esc(DATA.description)}</p>` : ""}`;
  if (!DATA.questions.length) {
    root.innerHTML = `<div class="wrap">${heading}
      <div class="card empty-state">Todavía no hay preguntas cargadas para ${esc(DATA.exam ? `el ${DATA.exam}` : "este cuestionario")}.
        <p><a href="../">Elegir otro parcial</a></p></div></div>`;
    return;
  }
  const asset = (path) => new URL(path, dataUrl).href;
  const STORE_KEY = `quiz-${slug}-${exam}-v1`;
  const topicIds = Object.keys(DATA.topics);
  const topicOf = (q) => DATA.topics[String(q.topic)];
  // "multi": chips toggle independently, all on by default (Redes).
  // "pick": a "Todas" chip plus chips that combine: the first tap narrows to that one, later taps add or remove (ASI).
  const pick = DATA.topicFilter === "pick";
  const L = Object.assign({ topics: "Temas", allTopics: "Todos los temas", noTopics: "Ninguno", section: "Sección", feedback: "Explicación de la cátedra" }, DATA.labels);
  const sections = [...new Set(DATA.questions.map((q) => q.section).filter(Boolean))];
  const hasOpenQuestions = DATA.openQuestions === true;
  const isOpen = (q) => hasOpenQuestions && q.type === "info";

  // ---------- state ----------
  let state = loadState();
  let view = [];          // question indexes after filters
  let cur = 0;            // position inside view (in "all" mode: last card touched)
  let optOrder = {};      // question id -> shuffled option order
  let rowOrder = {};      // match question id -> shuffled stem order (the bank lists stems in answer order)
  let drafts = {};        // question id -> in-progress answer (not checked yet)
  let bulkMsg = "";       // result of the last "Enviar todas", shown until the next change
  let gridView = null;    // view the dot grid was built for
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

  function loadState() {
    // retry: ids being repeated with "Repetir las incorrectas", shown while status is "retry"
    const base = { answers: {}, writtenAnswers: {}, practice: "all", topics: topicIds.slice(), section: "all", status: "all", retry: [], shuffleQ: false, shuffleO: true, mode: "one" };
    try {
      const raw = localStorage.getItem(STORE_KEY) || (legacyKey && localStorage.getItem(legacyKey));
      if (!raw) return base;
      const s = Object.assign(base, JSON.parse(raw));
      s.topics = s.topics.map(String).filter((t) => topicIds.includes(t));
      if (pick && !s.topics.length) s.topics = topicIds.slice();
      if (s.section !== "all" && !sections.includes(s.section)) s.section = "all";
      if (!Array.isArray(s.retry)) s.retry = [];
      if (s.status === "retry" && !s.retry.length) s.status = "all";
      if (s.mode !== "all") s.mode = "one";
      if (!hasOpenQuestions || !["all", "quiz", "open"].includes(s.practice)) s.practice = "all";
      if (!s.writtenAnswers || typeof s.writtenAnswers !== "object" || Array.isArray(s.writtenAnswers)) s.writtenAnswers = {};
      return s;
    } catch (e) { return base; }
  }
  function saveState() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable: keep in memory */ }
  }

  function orderFor(q) {
    const n = q.type === "match" ? q.choices.length : q.opts.length;
    if (!optOrder[q.id]) {
      const idx = [...Array(n).keys()];
      optOrder[q.id] = state.shuffleO && q.type !== "tf" ? shuffle(idx) : idx;
    }
    return optOrder[q.id];
  }
  function rowsFor(q) {
    if (!rowOrder[q.id]) {
      const idx = [...q.stems.keys()];
      rowOrder[q.id] = state.shuffleO ? shuffle(idx) : idx;
    }
    return rowOrder[q.id];
  }
  function statusOf(q) {
    const a = state.answers[q.id];
    if (!a) return "pending";
    if (q.type === "info") return "seen";
    return a.score >= 0.999 ? "ok" : a.score <= 0 ? "bad" : "part";
  }

  // ---------- layout ----------
  // both open until the first answer is sent
  const firstVisit = !Object.keys(state.answers).length;
  // what is particular to this bank (sources, categories, caveats); how to use the quiz goes in howto
  const intro = DATA.about && DATA.about.length
    ? `<details class="intro" id="intro" ${firstVisit ? "open" : ""}><summary>Sobre este banco de preguntas</summary>${DATA.about.join("")}</details>` : "";
  // same guide in every exam; the lines about notes, info cards and theory pages only show if the bank has them
  const hasNotes = DATA.questions.some((q) => q.note);
  const hasInfo = DATA.questions.some((q) => q.type === "info");
  const hasPages = DATA.questions.some((q) => q.img || (q.source && q.source.img));
  // the theory PDFs are in the repo: a question without "source" is one whose answer is not in them
  const hasTheory = DATA.questions.some((q) => q.source && q.source.file);
  const howto = `<details class="intro howto" id="howto" ${firstVisit ? "open" : ""}>
    <summary>Cómo funciona este cuestionario</summary>
    <h3>Responder</h3>
    <ul>
      <li>Elegí una opción (o varias, si dice «Seleccioná una o más opciones») y tocá <b>Enviar respuesta</b>. En las de relacionar, elegí una opción en cada desplegable.</li>
      <li>Al enviar ves la corrección: en verde lo correcto, en rojo lo incorrecto, y la explicación con la página de la teoría de donde sale.${hasTheory ? " Si la respuesta no está en los apuntes de teoría, la corrección lo indica." : ""}${hasPages ? " Tocá una imagen para verla en tamaño completo." : ""}</li>
      ${hasNotes ? `<li>Algunas preguntas muestran al corregir un aviso <b>Atención</b>: por ejemplo, si la respuesta no está confirmada por la cátedra y se dedujo del material. En esos casos conviene verificarla.</li>` : ""}
      ${hasOpenQuestions ? `<li>En <b>Preguntas Abiertas</b> podés escribir tu desarrollo y tocar <b>Ver respuesta</b> para compararlo con la respuesta orientativa y sus fuentes. Tu texto se guarda mientras escribís en este navegador, incluso al recargar. No se corrige automáticamente ni suma puntaje. <b>Ocultar respuesta</b> permite seguir editándolo.</li>` : hasInfo ? `<li>Las <b>tarjetas informativas</b> (cuadros, relaciones, gráficos) no se responden: tocá <b>Ver respuesta</b> para verla.</li>` : ""}
      <li>Si marcaste varias preguntas sin enviarlas, aparece <b>Enviar todas</b> para corregirlas juntas.</li>
      <li><b>Responder de nuevo</b> borra tu respuesta a esa pregunta para volver a intentarla.</li>
      <li>Cuando respondés todas las preguntas que estás viendo, aparece <b>Repetir las incorrectas</b>: te deja respondiendo solo las que erraste o te salieron a medias, hasta tenerlas todas bien.</li>
    </ul>
    <h3>Puntaje</h3>
    <p>Cada pregunta corregible vale 1 punto, al estilo Moodle: en las de selección múltiple cada opción mal marcada descuenta una bien marcada, y en las de relacionar vale cada fila. ${hasOpenQuestions ? "Las preguntas abiertas" : "Las tarjetas informativas"} no suman puntaje.</p>
    <h3>${esc(L.topics)} y opciones</h3>
    <ul>
      <li><b>${esc(L.topics)}</b>: ${pick
        ? `tocá un botón para practicar solo eso; tocando otros los sumás o los sacás. <b>${esc(L.allTopics)}</b> vuelve a mostrar todo.`
        : `cada botón se prende o se apaga al tocarlo. <b>${esc(L.allTopics)}</b> y <b>${esc(L.noTopics)}</b> los prenden o apagan todos.`}</li>
      ${sections.length ? `<li><b>${esc(L.section)}</b>: filtra las preguntas por ${esc(L.section.toLowerCase())}.</li>` : ""}
      <li><b>Mostrar</b>: todas, solo las que todavía no respondiste, o las incorrectas o parciales.</li>
      <li><b>Mezclar preguntas</b> cambia el orden de las preguntas; <b>Mezclar opciones</b>, el de las opciones y el de las filas de las preguntas de relacionar.</li>
      <li><b>Una por vez</b> muestra una pregunta con <b>Anterior</b> y <b>Siguiente</b>; <b>Todas en una página</b> las muestra juntas, para buscarlas con Ctrl+F. Los números de abajo llevan a cada pregunta y su color indica cómo te fue.</li>
      <li><b>Borrar mis respuestas</b> empieza de cero.</li>
    </ul>
    <h3>Cómo se guardan tus respuestas</h3>
    <div class="storage-info">
      <p>Se guardan en este navegador cuando las enviás. No hace falta cuenta, pero tampoco pasan a otro navegador ni a otro dispositivo.</p>
      <table>
        <thead><tr><th scope="col">Acción</th><th scope="col">Respuestas enviadas</th><th scope="col">Marcadas sin enviar</th></tr></thead>
        <tbody>
          <tr><th scope="row">F5 / recargar</th><td>Se mantienen</td><td>Se pierden</td></tr>
          <tr><th scope="row">Cerrar la pestaña o el navegador y volver</th><td>Se mantienen</td><td>Se pierden</td></tr>
          <tr><th scope="row">Abrir el mismo parcial en otra pestaña</th><td>Aparecen las enviadas hasta ese momento</td><td>No aparecen</td></tr>
        </tbody>
      </table>
    </div>
    <p class="kbd-hint">Con teclado, en «Una por vez»: <kbd>1</kbd>–<kbd>9</kbd> marcan opciones, <kbd>Enter</kbd> envía la respuesta o pasa a la siguiente, <kbd>←</kbd> <kbd>→</kbd> cambian de pregunta.</p>
  </details>`;
  root.innerHTML = `<div class="wrap">
    ${heading}
    ${hasOpenQuestions ? `<div class="viewmode practice-mode" id="practiceMode" role="group" aria-label="Secciones del cuestionario">
      <button type="button" class="seg" data-practice="all">Todas las preguntas</button>
      <button type="button" class="seg" data-practice="quiz">Cuestionario</button>
      <button type="button" class="seg" data-practice="open">Preguntas Abiertas</button>
    </div>
    <p class="sub" id="openHelp" hidden>Desarrollá tu respuesta y comparala con la orientación del apunte. Sin corrección automática ni puntaje.</p>` : ""}
    ${intro}
    ${howto}
    <details class="filters" id="filters" open>
      <summary><span>${esc(L.topics)} y opciones</span><span class="hint" id="filterHint"></span></summary>
      <div class="chips" id="chips" role="group" aria-label="Filtrar por ${esc(L.topics.toLowerCase())}"></div>
      <ul class="topic-notes" id="topicNotes"></ul>
      ${pick ? "" : `<div class="row">
        <button class="linkbtn" id="allTopics" type="button">${esc(L.allTopics)}</button>
        <button class="linkbtn" id="noTopics" type="button">${esc(L.noTopics)}</button>
      </div>`}
      <div class="row" style="margin-top:8px">
        ${sections.length ? `<label>${esc(L.section)}
          <select id="sectionFilter">
            <option value="all">todas</option>
            ${sections.map((s) => `<option value="${esc(s)}">${esc(s)} (${DATA.questions.filter((q) => q.section === s).length})</option>`).join("")}
          </select>
        </label>` : ""}
        <label>Mostrar
          <select id="statusFilter">
            <option value="all">todas</option>
            <option value="pending">sin responder</option>
            <option value="wrong">incorrectas o parciales</option>
            <option value="retry" id="retryOpt">las que estoy repitiendo</option>
          </select>
        </label>
        <label><input type="checkbox" id="shuffleQ"> Mezclar preguntas</label>
        <label><input type="checkbox" id="shuffleO" checked> Mezclar opciones</label>
      </div>
      <div class="row" style="margin-top:6px">
        <button class="linkbtn" id="reset" type="button">Borrar mis respuestas</button>
        <button class="linkbtn storage-btn" id="howtoBtn" type="button">${HELP_ICON}Cómo funciona y cómo se guardan mis respuestas</button>
      </div>
    </details>
    <div class="stats" id="stats"></div>
    <div class="bar"><i id="barFill"></i></div>
    <div class="viewmode" id="viewMode" role="group" aria-label="Cómo mostrar las preguntas">
      <button type="button" class="seg" data-mode="one">Una por vez</button>
      <button type="button" class="seg" data-mode="all" title="Muestra todas las preguntas filtradas juntas, para buscarlas con Ctrl+F">Todas en una página</button>
    </div>
    <main id="main"></main>
    <div class="submit-all" id="submitAll" hidden></div>
    <div class="submit-all" id="finish" hidden></div>
    <div class="grid" id="grid" aria-label="Ir a pregunta"></div>
    ${DATA.footer ? `<footer class="foot"><p>${DATA.footer}</p></footer>` : ""}
  </div>`;
  const $ = (id) => document.getElementById(id);

  // ---------- filters ----------
  function buildChips() {
    const counts = {};
    DATA.questions.forEach((q) => { counts[q.topic] = (counts[q.topic] || 0) + 1; });
    const all = state.topics.length === topicIds.length;
    const allChip = pick
      ? `<button type="button" class="chip" data-topic="*" aria-pressed="${all}">${esc(L.allTopics)} <span class="n">${DATA.questions.length}</span></button>`
      : "";
    $("chips").innerHTML = allChip + topicIds.map((k) =>
      `<button type="button" class="chip" data-topic="${esc(k)}" aria-pressed="${pick ? !all && state.topics.includes(k) : state.topics.includes(k)}">
         ${swatch(DATA.topics[k])}${esc(DATA.topics[k].name)} <span class="n">${counts[k] || 0}</span>
       </button>`).join("");
    $("chips").querySelectorAll(".chip").forEach((b) => b.addEventListener("click", () => {
      const t = b.dataset.topic;
      if (pick) {
        if (t === "*" || all) state.topics = t === "*" ? topicIds.slice() : [t];
        else {
          state.topics = state.topics.includes(t) ? state.topics.filter((x) => x !== t) : [...state.topics, t];
          if (!state.topics.length) state.topics = topicIds.slice();
        }
        buildChips();
      } else {
        state.topics = state.topics.includes(t) ? state.topics.filter((x) => x !== t) : [...state.topics, t];
        b.setAttribute("aria-pressed", state.topics.includes(t));
      }
      applyFilters();
    }));
  }
  function renderTopicNotes() {
    $("topicNotes").innerHTML = state.topics.filter((k) => DATA.topics[k].note)
      .map((k) => `<li>${swatch(DATA.topics[k])}<span><b>${esc(DATA.topics[k].name)}:</b> ${esc(DATA.topics[k].note)}</span></li>`).join("");
  }
  function applyFilters() {
    let idx = DATA.questions.map((q, i) => i).filter((i) => {
      const q = DATA.questions[i];
      if (state.practice === "open" && !isOpen(q)) return false;
      if (state.practice === "quiz" && isOpen(q)) return false;
      if (!state.topics.includes(String(q.topic))) return false;
      if (state.section !== "all" && q.section !== state.section) return false;
      if (state.status === "retry") return state.retry.includes(q.id);
      const st = statusOf(q);
      if (state.status === "pending") return st === "pending";
      if (state.status === "wrong") return st === "bad" || st === "part";
      return true;
    });
    if (state.shuffleQ) idx = shuffle(idx);
    view = idx;
    cur = 0;
    bulkMsg = "";
    saveState();
    $("filterHint").textContent = `${view.length} de ${DATA.questions.length}`;
    if (hasOpenQuestions) {
      $("practiceMode").querySelectorAll(".seg").forEach((b) => b.setAttribute("aria-pressed", b.dataset.practice === state.practice));
      $("openHelp").hidden = state.practice !== "open";
    }
    renderTopicNotes();
    render();
  }

  // ---------- rendering ----------
  function renderStats() {
    const qs = view.map((i) => DATA.questions[i]);
    const scored = qs.filter(isScored);
    const done = scored.filter((q) => state.answers[q.id]);
    const pts = done.reduce((s, q) => s + state.answers[q.id].score, 0);
    const pct = done.length ? Math.round((pts / done.length) * 100) : 0;
    const by = (st) => done.filter((q) => statusOf(q) === st).length;
    const infos = qs.filter((q) => q.type === "info");
    const seen = infos.filter((q) => state.answers[q.id]).length;
    $("stats").innerHTML = `${scored.length || !hasOpenQuestions ? `<span>Respondidas <b>${done.length}/${scored.length}</b></span>
      <span><b class="c-ok">✔︎ ${by("ok")}</b> · <b class="c-bad">✘︎ ${by("bad")}</b> · <b class="c-part">◐︎ ${by("part")}</b></span>
      <span>Puntaje <b>${fmt(pts)}</b></span>
      <span>Acierto <b>${done.length ? pct + "%" : "–"}</b></span>` : ""}
      ${infos.length ? `<span>${hasOpenQuestions ? "Respuestas consultadas" : "Informativas vistas"} <b>${seen}/${infos.length}</b></span>` : ""}`;
    const total = scored.length + infos.length;
    $("barFill").style.width = total ? ((done.length + seen) / total) * 100 + "%" : "0";
  }

  // the dots are rebuilt only when the filtered view changes; otherwise just their classes are synced
  function renderGrid() {
    if (gridView !== view) {
      gridView = view;
      $("grid").innerHTML = view.map((qi, p) => `<button type="button" class="dot" data-p="${p}" aria-label="Pregunta ${p + 1}">${p + 1}</button>`).join("");
    }
    [...$("grid").children].forEach((d, p) => {
      const st = statusOf(DATA.questions[view[p]]);
      const cls = ["dot", p === cur ? "cur" : "", st !== "pending" ? st : ""].filter(Boolean).join(" ");
      if (d.className !== cls) d.className = cls;
      d.toggleAttribute("aria-current", p === cur);
    });
  }
  $("grid").addEventListener("click", (e) => {
    const d = e.target.closest(".dot");
    if (d) goTo(+d.dataset.p);
  });

  // "Enviar todas": sends every checked-but-unsent answer in the current view at once
  const unsent = () => view.map((i) => DATA.questions[i])
    .filter((q) => isScored(q) && !state.answers[q.id] && hasAnswer(q, drafts[q.id]));
  function renderSubmitAll() {
    const n = unsent().length;
    const box = $("submitAll");
    box.hidden = !n && !bulkMsg;
    box.innerHTML = n
      ? `<p>${n === 1 ? "Tenés <b>1</b> pregunta marcada" : `Tenés <b>${n}</b> preguntas marcadas`} sin enviar. Podés enviarlas una por una o todas juntas; las que no tienen ninguna opción elegida quedan sin responder.</p>
        <button class="btn primary" type="button" id="sendAll">Enviar todas (${n})</button>`
      : bulkMsg;
  }
  $("submitAll").addEventListener("click", (e) => {
    if (!e.target.closest("#sendAll")) return;
    const qs = unsent();
    qs.forEach(record);
    saveState();
    const by = (st) => qs.filter((q) => statusOf(q) === st).length;
    const scored = view.map((i) => DATA.questions[i]).filter(isScored);
    const done = scored.filter((q) => state.answers[q.id]).length;
    bulkMsg = `<p class="sent" tabindex="-1">Se ${qs.length === 1 ? "envió <b>1</b> pregunta marcada que faltaba enviar" : `enviaron las <b>${qs.length}</b> preguntas marcadas que faltaban enviar`}:
      <b class="c-ok">✔︎ ${by("ok")}</b> · <b class="c-bad">✘︎ ${by("bad")}</b> · <b class="c-part">◐︎ ${by("part")}</b>.
      En total llevás <b>${done} de ${scored.length}</b> respondidas. Las correcciones están en cada pregunta.</p>`;
    render();
    $("submitAll").querySelector(".sent").focus();
  });

  // once every scored question in the view is answered: the summary and "Repetir las incorrectas"
  const toRetry = () => view.map((i) => DATA.questions[i]).filter((q) => isScored(q) && statusOf(q) !== "ok");
  function renderFinish() {
    const scored = view.map((i) => DATA.questions[i]).filter(isScored);
    const box = $("finish");
    box.hidden = !scored.length || scored.some((q) => !state.answers[q.id]);
    if (box.hidden) return;
    const n = toRetry().length;
    const by = (st) => scored.filter((q) => statusOf(q) === st).length;
    const back = state.status === "retry" ? `<button class="btn" type="button" id="backAll">Volver a todas las preguntas</button>` : "";
    box.innerHTML = `<p>${state.status === "retry" ? "Terminaste esta vuelta" : "Respondiste todas las preguntas"}:
        <b class="c-ok">✔︎ ${by("ok")}</b> · <b class="c-bad">✘︎ ${by("bad")}</b> · <b class="c-part">◐︎ ${by("part")}</b>.
        ${n ? "Podés volver a intentar las que erraste o te salieron a medias." : "¡Todas correctas!"}</p>
      <div class="actions">${n ? `<button class="btn primary" type="button" id="retryWrong">Repetir las incorrectas (${n})</button>` : ""}${back}</div>`;
  }
  $("finish").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    if (btn.id === "retryWrong") {
      const ids = toRetry().map((q) => q.id);
      ids.forEach((id) => { delete state.answers[id]; delete drafts[id]; delete optOrder[id]; delete rowOrder[id]; });
      setStatus("retry", ids);
    } else if (btn.id === "backAll") setStatus("all");
    else return;
    const first = $("main").querySelector(".card");
    if (first) first.scrollIntoView({ block: "start" });
    focusIn(0, ".opts input, .opts select, .check");
  });

  function renderFigure(q) {
    if (!q.img) return "";
    const cap = q.type === "info" ? "" : `<figcaption>${esc(DATA.imageCaption || "Imagen de referencia")}</figcaption>`;
    return `<figure class="figure">${cap}<img src="${esc(asset(q.img))}" alt="Esquema de la pregunta" loading="lazy"></figure>`;
  }

  // a figure the question can't be answered without: shown with the statement, before answering
  function renderQuestionFigure(q) {
    if (!q.figure) return "";
    return `<figure class="figure qfigure"><a href="${esc(asset(q.figure))}" target="_blank" rel="noopener" title="Ver la imagen en tamaño completo">
      <img src="${esc(asset(q.figure))}" alt="Figura de la pregunta" loading="lazy"></a></figure>`;
  }

  const cardAt = (p) => $("main").querySelector(`.card[data-p="${p}"]`);

  function render() {
    renderStats();
    renderGrid();
    renderSubmitAll();
    renderFinish();
    $("viewMode").querySelectorAll(".seg").forEach((b) => b.setAttribute("aria-pressed", b.dataset.mode === state.mode));
    const main = $("main");
    main.dataset.mode = state.mode;
    if (!view.length) {
      main.innerHTML = `<div class="card empty-state">No hay preguntas con estos filtros. ${pick ? `Cambiá la selección en “${esc(L.topics)}”` : "Activá algún tema"} o cambiá “Mostrar”.</div>`;
      return;
    }
    if (state.mode === "all") {
      main.innerHTML = view.map((qi, p) => cardHTML(DATA.questions[qi], p)).join("");
      return;
    }
    main.innerHTML = cardHTML(DATA.questions[view[cur]], cur) + `
      <div class="nav">
        <button class="btn" id="prev" type="button" ${cur === 0 ? "disabled" : ""}>Anterior</button>
        <button class="btn" id="next" type="button" ${cur === view.length - 1 ? "disabled" : ""}>Siguiente</button>
      </div>`;
  }

  // re-renders only the card at position p, so "all" mode keeps its scroll position
  function update(p) {
    if (state.mode !== "all") return render();
    renderStats();
    renderGrid();
    renderSubmitAll();
    renderFinish();
    cardAt(p).outerHTML = cardHTML(DATA.questions[view[p]], p);
  }

  // A cátedra option can be the string, or a drawing: { img, alt, text }.
  function optHTML(opt) {
    if (opt && typeof opt === "object") {
      const bits = [];
      if (opt.img) bits.push(`<img class="optimg" src="${esc(asset(opt.img))}" alt="${esc(opt.alt || "Opción")}">`);
      if (opt.text) bits.push(esc(opt.text));
      return bits.join("");
    }
    return esc(opt);
  }

  function cardHTML(q, p) {
    const saved = state.answers[q.id];
    const locked = !!saved;
    const topic = topicOf(q);

    let body = "", actions = "";
    if (q.type === "info") {
      if (isOpen(q)) body = `<label class="open-answer" for="answer-${esc(q.id)}">Tu desarrollo
        <textarea id="answer-${esc(q.id)}" rows="6" ${locked ? "readonly" : ""} aria-describedby="help-${esc(q.id)}" placeholder="Escribí tu respuesta antes de consultar la orientación…">${esc(state.writtenAnswers[q.id] || "")}</textarea>
        <span class="kind" id="help-${esc(q.id)}">Se guarda en este navegador. Compará tu desarrollo con la respuesta orientativa; no suma puntaje.</span>
      </label>`;
      actions = locked
        ? `<button class="btn retry" type="button">Ocultar respuesta</button>`
        : `<button class="btn primary check" type="button">Ver respuesta</button>`;
    } else {
      const answer = saved ? saved.ans : (drafts[q.id] || (q.type === "match" ? q.stems.map(() => -1) : []));
      if (q.type === "match") {
        const order = orderFor(q);
        body = rowsFor(q).map((i) => {
          const stem = q.stems[i], sel = answer[i];
          let cls = "pair", fix = "";
          if (locked) {
            cls += sel === q.correct[i] ? " is-ok" : " is-bad";
            if (sel !== q.correct[i]) fix = `<span class="fix">Correcta: ${esc(q.choices[q.correct[i]])}</span>`;
          }
          const options = [`<option value="-1">Elegir…</option>`].concat(order.map((c) =>
            `<option value="${c}" ${sel === c ? "selected" : ""}>${esc(q.choices[c])}</option>`)).join("");
          return `<div class="${cls}"><span class="stem">${esc(stem)}</span>
            <select data-i="${i}" ${locked ? "disabled" : ""} aria-label="${esc(stem)}">${options}</select>${fix}</div>`;
        }).join("");
      } else {
        const order = orderFor(q);
        const inputType = q.type === "multi" ? "checkbox" : "radio";
        body = order.map((o) => {
          const checked = answer.includes(o);
          let cls = "opt" + (locked ? " locked" : ""), tag = "";
          if (locked) {
            const isCorrect = q.correct.includes(o);
            if (checked && isCorrect) { cls += " is-ok"; tag = "Correcta"; }
            else if (checked && !isCorrect) { cls += " is-bad"; tag = "Incorrecta"; }
            // a single with several right options is fully right with any one of them
            else if (!checked && isCorrect && (q.type === "multi" || saved.score < 1)) { cls += " is-missed"; tag = "Faltó marcar"; }
          }
          return `<label class="${cls}"><input type="${inputType}" name="q-${esc(q.id)}" value="${o}" ${checked ? "checked" : ""} ${locked ? "disabled" : ""}>
            <span>${optHTML(q.opts[o])}</span>${tag ? `<span class="tag">${tag}</span>` : ""}</label>`;
        }).join("");
      }
      if (!isScored(q)) actions = `<span class="unscored">Sin respuesta confirmada: no se corrige automáticamente.</span>`;
      else actions = locked
        ? `<button class="btn retry" type="button">Responder de nuevo</button>`
        : `<button class="btn primary check" type="button" ${hasAnswer(q, answer) ? "" : "disabled"}>Enviar respuesta</button>`;
    }

    return `
      <article class="card" data-p="${p}">
        <div class="meta">
          <span class="qnum">Pregunta ${p + 1}</span>${swatch(topic)}<span>${esc(topic ? topic.name : q.topic)}</span>
          ${q.section ? `<span class="badge">${esc(q.section)}</span>` : ""}
          ${q.type === "multi" ? `<span class="badge">Selección múltiple</span>` : ""}
          ${q.type === "info" ? `<span class="badge info">${isOpen(q) ? "Pregunta abierta" : "Informativa"}</span>` : ""}
          ${topic && topic.note ? `<span class="tnote">${esc(topic.note)}</span>` : ""}
          ${q.tip ? `<span class="qtip">${esc(q.tip)}</span>` : ""}
        </div>
        <p class="qtext">${esc(q.text)}</p>
        ${renderQuestionFigure(q)}
        <p class="kind">${isOpen(q) ? "Desarrollá tu respuesta y luego consultá la orientación del material." : kindLabel[q.type]}</p>
        ${body ? `<div class="opts">${body}</div>` : ""}
        <div class="actions">${actions}</div>
        ${locked ? (q.type === "info" ? renderInfoReview(q) : renderReview(q, saved)) : ""}
      </article>`;
  }

  // theory PDF page backing the question (source.page is the physical PDF page): a picture of the page when
  // source.img exists, plus the link to the PDF. Without file, only the picture, captioned with source.label.
  // Without source, in a bank with theory PDFs, says that the answer is not in them (info cards summarize several
  // pages, so they are left out)
  function renderSource(q) {
    if (!q.source) return hasTheory && q.type !== "info" ? `<p class="source none">No figura en los apuntes de teoría.</p>` : "";
    const { file, page, confidence, img, label } = q.source;
    if (!file) return `<figure class="figure source-page"><figcaption>En la teoría: ${esc(label)}</figcaption>
      <a href="${esc(asset(img))}" target="_blank" rel="noopener" title="Ver la imagen en tamaño completo"><img src="${esc(asset(img))}" alt="${esc(label)}" loading="lazy"></a></figure>`;
    const name = file.split("/").pop();
    const low = confidence === "low" ? " · referencia aproximada (confianza baja)"
      : confidence === "medium" ? " · trata el tema, pero no da la respuesta completa" : "";
    const shot = img ? `<figure class="figure source-page"><figcaption>En la teoría: ${esc(name)}, pág. ${page}</figcaption>
      <a href="${esc(asset(img))}" target="_blank" rel="noopener" title="Ver la imagen en tamaño completo"><img src="${esc(asset(img))}" alt="Página ${page} de ${esc(name)}" loading="lazy"></a></figure>` : "";
    return `${shot}<p class="source"><a href="${esc(asset(file))}#page=${page}" target="_blank" rel="noopener" title="Se abre en una pestaña nueva">Ver en la teoría (${esc(name)}, pág. ${page})${low}</a></p>`;
  }

  // exam the question was taken from (origin.page is the physical PDF page). Same crop/picture as source,
  // captioned with origin.label so the filename doesn't have to say which exam it is.
  function renderOrigin(q) {
    if (!q.origin) return "";
    const { file, page, img, label } = q.origin;
    const name = label || file.split("/").pop();
    const shot = img ? `<figure class="figure source-page"><figcaption>En el parcial: ${esc(name)}, pág. ${page}</figcaption>
      <a href="${esc(asset(img))}" target="_blank" rel="noopener" title="Ver la imagen en tamaño completo"><img src="${esc(asset(img))}" alt="Página ${page} de ${esc(name)}" loading="lazy"></a></figure>` : "";
    return `${shot}<p class="source"><a href="${esc(asset(file))}#page=${page}" target="_blank" rel="noopener" title="Se abre en una pestaña nueva">Ver en el parcial (${esc(name)}, pág. ${page})</a></p>`;
  }

  function renderNote(q) {
    return q.note ? `<div class="note"><b>Atención:</b> ${esc(q.note)}</div>` : "";
  }

  function renderInfoReview(q) {
    return `<section class="review" aria-live="polite" tabindex="-1">
      <h3>${isOpen(q) ? "Respuesta orientativa" : "Respuesta"}</h3>${renderFigure(q)}<div class="answer">${esc(q.answer)}</div>${renderNote(q)}${renderSource(q)}${renderOrigin(q)}
    </section>`;
  }

  function renderReview(q, saved) {
    const s = saved.score;
    const [cls, label] = s >= 0.999 ? ["ok", "Correcta"] : s <= 0 ? ["bad", "Incorrecta"] : ["part", "Parcialmente correcta"];
    let key;
    if (q.type === "match") {
      key = `<ul>${rowsFor(q).map((i) => `<li>${esc(q.stems[i])} → ${esc(q.choices[q.correct[i]])}</li>`).join("")}</ul>`;
    } else if (q.correct.length > 1) {
      key = `<ul>${q.correct.map((c) => `<li>${optHTML(q.opts[c])}</li>`).join("")}</ul>`;
    } else {
      key = `<p>${optHTML(q.opts[q.correct[0]])}</p>`;
    }
    let fb = "";
    if (q.fb) fb = `<h3>${esc(L.feedback)}</h3><div class="fb">${esc(q.fb)}</div>`;
    else if (DATA.emptyFeedback) fb = `<h3>${esc(L.feedback)}</h3><div class="fb empty">${esc(DATA.emptyFeedback)}</div>`;
    return `<section class="review" aria-live="polite" tabindex="-1">
      <span class="verdict ${cls}">${label}: ${fmt(s)} / 1</span>
      <h3>${q.correct.length > 1 || q.type === "match" ? "Respuestas correctas" : "Respuesta correcta"}</h3>${key}
      ${fb}${renderNote(q)}${renderFigure(q)}${renderSource(q)}${renderOrigin(q)}
    </section>`;
  }

  // one set of delegated listeners serves both modes: the card's data-p says which question it is
  const cardOf = (el) => {
    const card = el.closest(".card[data-p]");
    return card && { card, p: +card.dataset.p, q: DATA.questions[view[+card.dataset.p]] };
  };
  $("main").addEventListener("change", (e) => {
    const c = cardOf(e.target);
    if (!c || isOpen(c.q) || state.answers[c.q.id]) return;
    const { card, q } = c;
    const opts = card.querySelector(".opts");
    // selects are in shuffled row order: data-i maps each one back to its stem
    if (q.type === "match") {
      drafts[q.id] = q.stems.map(() => -1);
      opts.querySelectorAll("select").forEach((s) => { drafts[q.id][+s.dataset.i] = +s.value; });
    } else drafts[q.id] = [...opts.querySelectorAll("input:checked")].map((i) => +i.value);
    const check = card.querySelector(".check");
    if (check) check.disabled = !hasAnswer(q, drafts[q.id]);
    bulkMsg = "";
    renderSubmitAll();
  });
  $("main").addEventListener("input", (e) => {
    if (!e.target.matches(".open-answer textarea")) return;
    const c = cardOf(e.target);
    if (!c || !isOpen(c.q) || state.answers[c.q.id]) return;
    state.writtenAnswers[c.q.id] = e.target.value;
    saveState();
  });
  $("main").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    if (btn.id === "prev" || btn.id === "next") { goTo(cur + (btn.id === "next" ? 1 : -1), btn.id); return; }
    const c = cardOf(btn);
    if (!c) return;
    cur = c.p;
    if (btn.classList.contains("check")) submit(c.q);
    else if (btn.classList.contains("retry")) {
      delete state.answers[c.q.id];
      delete drafts[c.q.id];
      delete optOrder[c.q.id];
      delete rowOrder[c.q.id];
      saveState();
      update(c.p);
      focusIn(c.p, ".opts textarea, .opts input, .opts select, .check");
    }
  });

  function record(q) {
    if (q.type === "info") {
      state.answers[q.id] = { seen: true };
    } else {
      const ans = drafts[q.id] || (q.type === "match" ? q.stems.map(() => -1) : []);
      state.answers[q.id] = { ans, score: score(q, ans) };
      delete drafts[q.id];
    }
  }

  function submit(q) {
    record(q);
    saveState();
    update(cur);
    // the card was re-rendered: move focus to the correction instead of losing it to <body>
    focusIn(cur, ".review");
  }

  function focusIn(p, selector) {
    const card = cardAt(p);
    const el = card && card.querySelector(selector);
    if (el) el.focus({ preventScroll: true });
  }

  // after changing question: if the card doesn't fit where it is (its start is above the screen,
  // or it runs past the bottom), bring its start to the top so the question is read first
  function scrollToCard() {
    const c = $("main").querySelector(".card");
    if (!c) return;
    const r = c.getBoundingClientRect();
    if (r.top < 0 || r.bottom > innerHeight) c.scrollIntoView({ block: "start" });
  }

  // moves to position p; in "one" mode the card slides in the direction of travel.
  // focusId: nav button to keep focused after the re-render ("prev" / "next")
  function goTo(p, focusId) {
    if (p < 0 || p >= view.length) return;
    if (state.mode === "all") { cur = p; renderGrid(); cardAt(cur).scrollIntoView({ block: "start" }); return; }
    if (p === cur) return;
    const back = p < cur;
    cur = p;
    withTransition(back, () => {
      render();
      scrollToCard();
      if (!focusId) return;
      // preventScroll: a taller card pushes the buttons down and focusing them would scroll past the question
      const b = $(focusId), other = $(focusId === "next" ? "prev" : "next");
      if (b && !b.disabled) b.focus({ preventScroll: true });
      else if (other && !other.disabled) other.focus({ preventScroll: true });
    });
  }

  function withTransition(back, fn) {
    if (!document.startViewTransition || reduceMotion.matches) return fn();
    document.documentElement.dataset.dir = back ? "prev" : "next";
    document.startViewTransition(fn);
  }

  // ---------- global controls ----------
  if (hasOpenQuestions) $("practiceMode").querySelectorAll(".seg").forEach((b) => b.addEventListener("click", () => {
    if (state.practice === b.dataset.practice) return;
    state.practice = b.dataset.practice;
    state.topics = topicIds.slice();
    state.section = "all";
    if ($("sectionFilter")) $("sectionFilter").value = "all";
    buildChips();
    setStatus("all");
  }));
  $("statusFilter").value = state.status;
  $("retryOpt").hidden = !state.retry.length;
  if ($("sectionFilter")) {
    $("sectionFilter").value = state.section;
    $("sectionFilter").addEventListener("change", (e) => { state.section = e.target.value; applyFilters(); });
  }
  $("shuffleQ").checked = state.shuffleQ;
  $("shuffleO").checked = state.shuffleO;
  $("statusFilter").addEventListener("change", (e) => setStatus(e.target.value, e.target.value === "retry" ? state.retry : []));
  $("shuffleQ").addEventListener("change", (e) => { state.shuffleQ = e.target.checked; applyFilters(); });
  $("shuffleO").addEventListener("change", (e) => { state.shuffleO = e.target.checked; optOrder = {}; rowOrder = {}; saveState(); render(); });
  $("viewMode").querySelectorAll(".seg").forEach((b) => b.addEventListener("click", () => {
    if (state.mode === b.dataset.mode) return;
    state.mode = b.dataset.mode;
    saveState();
    render();
    if (state.mode === "all") { const c = cardAt(cur); if (c) c.scrollIntoView({ block: "start" }); }
    else scrollToCard();
  }));
  if (!pick) {
    $("allTopics").addEventListener("click", () => { state.topics = topicIds.slice(); buildChips(); applyFilters(); });
    $("noTopics").addEventListener("click", () => { state.topics = []; buildChips(); applyFilters(); });
  }
  $("howtoBtn").addEventListener("click", () => {
    $("howto").open = true;
    $("howto").scrollIntoView({ block: "start" });
    $("howto").querySelector("summary").focus({ preventScroll: true });
  });
  // "retry" keeps the ids being repeated; any other status drops them
  function setStatus(status, retry = []) {
    state.status = status;
    state.retry = status === "retry" ? retry : [];
    $("statusFilter").value = status;
    $("retryOpt").hidden = !state.retry.length;
    applyFilters();
  }
  $("reset").addEventListener("click", () => {
    if (!confirm("¿Borrar todas tus respuestas guardadas?")) return;
    state.answers = {}; state.writtenAnswers = {}; drafts = {}; optOrder = {}; rowOrder = {};
    setStatus(state.status === "retry" ? "all" : state.status);
  });
  // keyboard, "one" mode only: 1–9 pick options, Enter sends (or goes on once sent), arrows navigate
  document.addEventListener("keydown", (e) => {
    if (state.mode === "all" || e.ctrlKey || e.metaKey || e.altKey || e.target.closest("select, textarea")) return;
    const card = $("main").querySelector(".card");
    if (!card) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      if (e.target.matches("input")) return; // radios use the arrows themselves
      goTo(cur + (e.key === "ArrowRight" ? 1 : -1));
    } else if (e.key === "Enter") {
      if (e.target.matches("button, a, summary")) return; // they already react to Enter
      e.preventDefault();
      const check = card.querySelector(".check");
      if (check) { if (!check.disabled) check.click(); }
      else goTo(cur + 1);
    } else if (/^[1-9]$/.test(e.key)) {
      const input = card.querySelectorAll(".opts input:not(:disabled)")[+e.key - 1];
      if (!input) return;
      e.preventDefault();
      input.checked = input.type === "checkbox" ? !input.checked : true;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
  if (window.innerWidth < 600) {
    $("filters").open = false;
    if ($("intro")) $("intro").open = false;
  }

  buildChips();
  applyFilters();
}
