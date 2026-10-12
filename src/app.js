import { categories, questions, sourceCatalog } from "./questions.js";

const PASSING_SCORE = 40;
const EXAM_SIZE = 50;
const QUICK_SIZE = 10;
const STORAGE_KEY = "nj-driver-practice-v1";

const sourceById = Object.fromEntries(sourceCatalog.map((source) => [source.id, source]));
const questionById = Object.fromEntries(questions.map((question) => [question.id, question]));

const app = document.querySelector("#app");

const defaultStats = {
  attempts: 0,
  correct: 0,
  examsTaken: 0,
  bestExamScore: 0,
  missed: {},
  lastSeen: {},
};

const loadStats = () => {
  try {
    return { ...defaultStats, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return { ...defaultStats };
  }
};

let stats = loadStats();
let state = {
  mode: "quick",
  category: getInitialCategory(),
  session: [],
  index: 0,
  answers: {},
  locked: {},
  examFinished: false,
};

state.session = buildSession(state.mode);

function saveStats() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function sample(items, size) {
  return shuffle(items).slice(0, Math.min(size, items.length));
}

function balancedSample(items, size) {
  const groups = categories.map((category) =>
    shuffle(items.filter((question) => question.category === category)),
  );
  const result = [];
  while (result.length < size && groups.some((group) => group.length)) {
    for (const group of groups) {
      if (group.length && result.length < size) result.push(group.pop());
    }
  }
  return shuffle(result);
}

function getInitialCategory() {
  const requested = new URLSearchParams(window.location.search).get("category");
  return categories.includes(requested) ? requested : "All categories";
}

function updateCategoryUrl(category) {
  const url = new URL(window.location.href);
  if (category === "All categories") url.searchParams.delete("category");
  else url.searchParams.set("category", category);
  window.history.replaceState({}, "", url);
}

function getFilteredQuestions() {
  if (state.category === "All categories") return questions;
  return questions.filter((question) => question.category === state.category);
}

function getMissedQuestions() {
  return Object.entries(stats.missed)
    .filter(([, count]) => count > 0)
    .map(([id]) => questionById[id])
    .filter(Boolean);
}

function buildSession(mode = state.mode) {
  const filtered = getFilteredQuestions();
  if (mode === "quick") {
    return state.category === "All categories"
      ? balancedSample(questions, QUICK_SIZE)
      : sample(filtered, QUICK_SIZE);
  }
  if (mode === "exam") return balancedSample(questions, EXAM_SIZE);
  if (mode === "missed") return shuffle(getMissedQuestions());
  return shuffle(filtered);
}

function resetSession(mode = state.mode) {
  state = {
    ...state,
    mode,
    session: buildSession(mode),
    index: 0,
    answers: {},
    locked: {},
    examFinished: false,
  };
  render();
}

function setMode(mode) {
  state.mode = mode;
  resetSession(mode);
}

function setCategory(category) {
  state.category = category;
  updateCategoryUrl(category);
  resetSession(state.mode === "exam" || state.mode === "missed" ? "quick" : state.mode);
}

function currentQuestion() {
  return state.session[state.index];
}

function answerQuestion(choiceIndex) {
  const question = currentQuestion();
  if (!question || state.locked[question.id] || state.examFinished) return;

  const correct = choiceIndex === question.answerIndex;
  state.answers[question.id] = choiceIndex;
  state.locked[question.id] = true;

  stats.attempts += 1;
  stats.lastSeen[question.id] = new Date().toISOString();
  if (correct) {
    stats.correct += 1;
    if (stats.missed[question.id] > 0) {
      stats.missed[question.id] -= 1;
    }
  } else {
    stats.missed[question.id] = (stats.missed[question.id] || 0) + 1;
  }

  saveStats();
  render();
}

function sessionScore() {
  const answered = Object.keys(state.answers).length;
  const correct = state.session.reduce((sum, question) => {
    return sum + (state.answers[question.id] === question.answerIndex ? 1 : 0);
  }, 0);
  return { answered, correct, total: state.session.length };
}

function finishExam() {
  const score = sessionScore();
  state.examFinished = true;
  stats.examsTaken += 1;
  stats.bestExamScore = Math.max(stats.bestExamScore || 0, score.correct);
  saveStats();
  render();
}

function resetProgress() {
  stats = { ...defaultStats };
  saveStats();
  resetSession(state.mode);
}

function go(delta) {
  if (!state.session.length) return;
  state.index = Math.min(Math.max(state.index + delta, 0), state.session.length - 1);
  render();
}

function jumpTo(index) {
  state.index = Math.min(Math.max(index, 0), state.session.length - 1);
  render();
}

function className(...parts) {
  return parts.filter(Boolean).join(" ");
}

function renderSign(visual) {
  if (!visual) return "";
  return `
    <div class="visual-wrap" role="img" aria-label="Road sign illustration: ${visual.label}">
      <div class="${className("sign", `sign-${visual.shape}`, `tone-${visual.tone || "white"}`)}">
        <span>${visual.label}</span>
      </div>
    </div>
  `;
}

function renderOptions(question) {
  const selected = state.answers[question.id];
  const locked = state.locked[question.id] || state.examFinished;

  return question.options
    .map((option, index) => {
      const isSelected = selected === index;
      const isCorrect = question.answerIndex === index;
      const optionState = locked
        ? isCorrect
          ? "correct"
          : isSelected
            ? "wrong"
            : "muted"
        : "";
      return `
        <button
          class="${className("option", optionState, isSelected && "selected")}"
          type="button"
          data-answer="${index}"
          ${locked ? "disabled" : ""}
        >
          <span class="option-letter">${String.fromCharCode(65 + index)}</span>
          <span>${option}</span>
        </button>
      `;
    })
    .join("");
}

function renderFeedback(question) {
  const selected = state.answers[question.id];
  const locked = state.locked[question.id] || state.examFinished;
  if (!locked) return "";

  const correct = selected === question.answerIndex;
  const source = sourceById[question.source];
  return `
    <section class="${className("feedback", correct ? "is-correct" : "is-wrong")}">
      <div class="feedback-title">${correct ? "Correct" : "Review this one"}</div>
      <p>${question.explanation}</p>
      ${source ? `<a href="${source.url}" target="_blank" rel="noreferrer">${source.name}</a>` : ""}
    </section>
  `;
}

function renderQuestionCard() {
  const question = currentQuestion();
  if (!question) {
    const message =
      state.mode === "missed"
        ? "No missed questions are waiting."
        : "No questions match this category.";
    return `
      <section class="question-panel empty-state">
        <h2>${message}</h2>
        <button class="primary" type="button" data-action="study-all">Study all categories</button>
      </section>
    `;
  }

  const score = sessionScore();
  const progress = Math.round(((state.index + 1) / state.session.length) * 100);
  return `
    <section class="question-panel">
      <div class="question-meta">
        <span>${question.category}</span>
        <span>${question.difficulty}</span>
        <span>${state.index + 1} / ${state.session.length}</span>
      </div>
      <div class="progress-track"><div style="width:${progress}%"></div></div>
      ${renderSign(question.visual)}
      <h2>${question.prompt}</h2>
      <div class="options">${renderOptions(question)}</div>
      ${renderFeedback(question)}
      <div class="question-actions">
        <button type="button" data-action="prev" ${state.index === 0 ? "disabled" : ""}>Previous</button>
        ${
          state.mode === "exam" && score.answered === state.session.length && !state.examFinished
            ? '<button class="primary" type="button" data-action="finish-exam">Finish exam</button>'
            : state.index === state.session.length - 1 && state.locked[question.id]
              ? '<button class="primary" type="button" data-action="new-session">Start another set</button>'
              : `<button class="primary" type="button" data-action="next" ${state.index === state.session.length - 1 ? "disabled" : ""}>Next</button>`
        }
      </div>
    </section>
  `;
}

function renderModeControls() {
  const controls = [
    ["quick", "Quick 10"],
    ["exam", "Mock exam 50"],
    ["study", "Study bank"],
    ["missed", `Review ${getMissedQuestions().length}`],
  ];
  return controls
    .map(([mode, label]) => {
      return `<button class="${state.mode === mode ? "active" : ""}" type="button" data-mode="${mode}">${label}</button>`;
    })
    .join("");
}

function renderCategoryOptions() {
  return ["All categories", ...categories]
    .map((category) => {
      const count = category === "All categories" ? questions.length : questions.filter((q) => q.category === category).length;
      return `<option value="${category}" ${state.category === category ? "selected" : ""}>${category} (${count})</option>`;
    })
    .join("");
}

function renderExamResult() {
  if (state.mode !== "exam" || !state.examFinished) return "";
  const score = sessionScore();
  const passed = score.correct >= PASSING_SCORE;
  return `
    <section class="${className("exam-result", passed ? "passed" : "not-passed")}">
      <div>${passed ? "Passing score" : "Below passing score"}</div>
      <strong>${score.correct} / ${score.total}</strong>
      <span>${PASSING_SCORE} correct is the NJ passing threshold.</span>
    </section>
  `;
}

function renderCategoryStats() {
  return categories
    .map((category) => {
      const total = questions.filter((q) => q.category === category).length;
      const missed = questions
        .filter((q) => q.category === category)
        .reduce((sum, question) => sum + (stats.missed[question.id] || 0), 0);
      const pct = missed ? Math.max(6, Math.min(100, (missed / Math.max(total, 1)) * 45)) : 0;
      return `
        <button class="category-row" type="button" data-category-jump="${category}">
          <span>${category}</span>
          <b>${total}</b>
          <i style="width:${pct}%"></i>
        </button>
      `;
    })
    .join("");
}

function renderQuestionRail() {
  return state.session
    .map((question, index) => {
      const selected = state.answers[question.id];
      const answered = selected !== undefined;
      const correct = selected === question.answerIndex;
      return `
        <button
          class="${className("rail-dot", state.index === index && "current", answered && (correct ? "right" : "missed"))}"
          type="button"
          data-jump="${index}"
          title="Question ${index + 1}"
        >
          ${index + 1}
        </button>
      `;
    })
    .join("");
}

function renderSources() {
  return sourceCatalog
    .map(
      (source) => `
        <a class="source-link" href="${source.url}" target="_blank" rel="noreferrer">
          <strong>${source.name}</strong>
          <span>${source.detail}</span>
        </a>
      `,
    )
    .join("");
}

function renderSidebar() {
  const score = sessionScore();
  const overallPct = stats.attempts ? Math.round((stats.correct / stats.attempts) * 100) : 0;
  const missedTotal = Object.values(stats.missed).reduce((sum, count) => sum + count, 0);
  return `
    <aside class="side-panel">
      ${renderExamResult()}
      <section class="score-card">
        <div>
          <span>Session</span>
          <strong>${score.correct}/${score.answered || 0}</strong>
        </div>
        <div>
          <span>Accuracy</span>
          <strong>${overallPct}%</strong>
        </div>
        <div>
          <span>Missed</span>
          <strong>${missedTotal}</strong>
        </div>
        <div>
          <span>Best exam</span>
          <strong>${stats.bestExamScore || 0}/${EXAM_SIZE}</strong>
        </div>
      </section>
      <section class="rail">
        <div class="panel-heading">
          <h2>Session Map</h2>
          <span>${score.answered}/${score.total}</span>
        </div>
        <div class="rail-grid">${renderQuestionRail()}</div>
      </section>
      <section class="category-card">
        <div class="panel-heading">
          <h2>Bank</h2>
          <span>${questions.length} questions</span>
        </div>
        <div class="category-list">${renderCategoryStats()}</div>
      </section>
      <section class="sources-card">
        <div class="panel-heading">
          <h2>Sources</h2>
        </div>
        ${renderSources()}
      </section>
    </aside>
  `;
}

function render() {
  app.innerHTML = `
    <div class="shell">
      <header class="topbar">
        <div class="brand">
          <span class="mark">NJ</span>
          <div>
            <p>NJ Permit Practice</p>
            <strong>Free, current, and source-grounded</strong>
          </div>
        </div>
        <nav class="site-nav" aria-label="Main navigation">
          <a href="#practice">Practice</a>
          <a href="/study-guide/">Study guide</a>
          <a href="/test-details/">Test details</a>
          <a href="#faq">FAQ</a>
        </nav>
      </header>
      <section class="practice-intro" id="practice">
        <div>
          <p class="eyebrow">Updated for the September 2026 NJ MVC manual</p>
          <h1>Free New Jersey Permit Practice Test</h1>
          <p>Learn from ${questions.length} NJ-specific questions with instant explanations. Start with a balanced 10-question check or take a full 50-question mock exam.</p>
        </div>
        <dl class="test-facts" aria-label="NJ knowledge test facts">
          <div><dt>Real test</dt><dd>50 questions</dd></div>
          <div><dt>Passing score</dt><dd>40 correct</dd></div>
          <div><dt>Cost here</dt><dd>Free</dd></div>
        </dl>
      </section>
      <section class="toolbar" aria-label="Practice controls">
          <div class="segmented">${renderModeControls()}</div>
          <select aria-label="Category">${renderCategoryOptions()}</select>
          <button type="button" data-action="new-session">New set</button>
          <button type="button" data-action="reset-progress">Reset progress</button>
      </section>
      <div class="workspace">
        ${renderQuestionCard()}
        ${renderSidebar()}
      </div>
    </div>
  `;
}

app.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.dataset.answer !== undefined) {
    answerQuestion(Number(button.dataset.answer));
    return;
  }

  if (button.dataset.mode) {
    setMode(button.dataset.mode);
    return;
  }

  if (button.dataset.jump !== undefined) {
    jumpTo(Number(button.dataset.jump));
    return;
  }

  if (button.dataset.categoryJump) {
    setCategory(button.dataset.categoryJump);
    return;
  }

  const action = button.dataset.action;
  if (action === "prev") go(-1);
  if (action === "next") go(1);
  if (action === "new-session") resetSession(state.mode);
  if (action === "finish-exam") finishExam();
  if (action === "reset-progress") resetProgress();
  if (action === "study-all") {
    state.category = "All categories";
    updateCategoryUrl(state.category);
    resetSession("quick");
  }
});

app.addEventListener("change", (event) => {
  if (event.target.matches("select")) setCategory(event.target.value);
});

window.addEventListener("keydown", (event) => {
  const number = Number(event.key);
  if (number >= 1 && number <= 4) answerQuestion(number - 1);
  if (event.key === "ArrowRight") go(1);
  if (event.key === "ArrowLeft") go(-1);
});

render();
