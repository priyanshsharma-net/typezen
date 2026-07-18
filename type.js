/* =========================================================
   TypeZen — Typing Engine (type.js)
   Powers typing.html only. Handles word generation, character
   rendering + highlighting, the hidden-input capture, the
   countdown timer, live WPM/accuracy, and the results panel.
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const engine = createTypingEngine();
  engine.init();
});

function createTypingEngine() {
  // ---------- Word bank ----------
  const WORD_BANK = [
    "the", "of", "and", "to", "in", "a", "is", "that", "for", "it",
    "with", "as", "was", "on", "be", "at", "by", "this", "have", "from",
    "or", "one", "had", "word", "but", "not", "what", "all", "were", "when",
    "we", "there", "can", "an", "your", "which", "their", "said", "if", "will",
    "way", "about", "many", "then", "them", "write", "would", "like", "so",
    "these", "her", "long", "make", "thing", "see", "him", "two", "has",
    "look", "more", "day", "could", "go", "come", "did", "number", "sound",
    "no", "most", "people", "over", "know", "water", "than", "call", "first",
    "who", "may", "down", "side", "been", "now", "find", "any", "new",
    "work", "part", "take", "get", "place", "made", "live", "where", "after",
    "back", "little", "only", "round", "man", "year", "came", "show",
    "every", "good", "give", "our", "under", "name", "very", "through",
    "just", "form", "sentence", "great", "think", "say", "help", "low",
    "line", "differ", "turn", "cause", "much", "mean", "before", "move",
    "right", "boy", "old", "too", "same", "tell", "does", "set", "three",
    "want", "air", "well", "also", "play", "small", "end", "put", "home",
    "read", "hand", "port", "large", "spell", "add", "even", "land",
    "here", "must", "big", "high", "such", "follow", "act", "why", "ask",
    "men", "change", "went", "light", "kind", "off", "need", "house",
    "picture", "try", "again", "animal", "point", "mother", "world",
    "near", "build", "self", "earth", "father", "head", "stand", "own",
    "page", "should", "country", "found", "answer", "school", "grow",
    "study", "still", "learn", "plant", "cover", "food", "sun", "four",
  ];

  // ---------- DOM refs ----------
  let dom = {};

  // ---------- State ----------
  let state = {
    duration: 30,
    words: [],
    wordEls: [],
    charEls: [],
    typedWords: [],
    currentWordIndex: 0,
    testStarted: false,
    testFinished: false,
    startTime: 0,
    timerId: null,
    liveStatsId: null,
    timeLeft: 30,
    wpmSamples: [],
  };

  function init() {
    dom = {
      modeBar: document.getElementById("modeBar"),
      typeArea: document.getElementById("typeArea"),
      typingFrame: document.getElementById("typingFrame"),
      scrollInner: document.getElementById("scrollInner"),
      wordsInner: document.getElementById("wordsInner"),
      caret: document.getElementById("caret"),
      hiddenInput: document.getElementById("hiddenInput"),
      focusPrompt: document.getElementById("focusPrompt"),
      restartBtn: document.getElementById("restartBtn"),
      nextBtn: document.getElementById("nextBtn"),
      resultsPanel: document.getElementById("resultsPanel"),
      liveTime: document.getElementById("liveTime"),
      liveWpm: document.getElementById("liveWpm"),
      liveAcc: document.getElementById("liveAcc"),
      resWpm: document.getElementById("resWpm"),
      resAcc: document.getElementById("resAcc"),
      resRaw: document.getElementById("resRaw"),
      resTime: document.getElementById("resTime"),
      resChars: document.getElementById("resChars"),
    };

    if (!dom.wordsInner || !dom.hiddenInput) return; // not on this page

    bindModeBar();
    bindFocusHandling();
    bindKeyboardInput();
    bindRestart();

    startNewTest(state.duration);
  }

  // ---------- Mode bar (15 / 30 / 60) ----------
  function bindModeBar() {
    if (!dom.modeBar) return;
    dom.modeBar.querySelectorAll(".time-pill").forEach((pill) => {
      pill.addEventListener("click", () => {
        dom.modeBar
          .querySelectorAll(".time-pill")
          .forEach((p) => p.classList.remove("is-active"));
        pill.classList.add("is-active");
        const seconds = parseInt(pill.dataset.time, 10);
        startNewTest(seconds);
      });
    });
  }

  // ---------- Focus handling ----------
  function bindFocusHandling() {
    dom.typeArea.addEventListener("click", () => dom.hiddenInput.focus());

    dom.hiddenInput.addEventListener("focus", () => {
      dom.typingFrame.classList.add("is-focused");
    });
    dom.hiddenInput.addEventListener("blur", () => {
      dom.typingFrame.classList.remove("is-focused");
    });
  }

  // ---------- Restart ----------
  function bindRestart() {
    dom.restartBtn.addEventListener("click", () => startNewTest(state.duration));
    if (dom.nextBtn) {
      dom.nextBtn.addEventListener("click", () => startNewTest(state.duration));
    }
  }

  // ---------- Keyboard capture ----------
  function bindKeyboardInput() {
    dom.hiddenInput.addEventListener("keydown", (e) => {
      if (e.key === "Tab" || e.key === "Escape") {
        e.preventDefault();
        startNewTest(state.duration);
        return;
      }

      if (state.testFinished) return;

      if (e.key === " ") {
        e.preventDefault();
        commitCurrentWord();
        return;
      }

      if (e.key === "Backspace" && dom.hiddenInput.value === "") {
        if (state.currentWordIndex > 0) {
          e.preventDefault();
          state.currentWordIndex--;
          const prevWord = state.typedWords.pop() ?? "";
          dom.hiddenInput.value = prevWord;
          clearExtraChars(state.currentWordIndex);
          renderCurrentWord(prevWord);
        }
      }
    });

    dom.hiddenInput.addEventListener("input", () => {
      if (state.testFinished) return;

      // Strip any accidental whitespace that slipped through (e.g. paste).
      const value = dom.hiddenInput.value.replace(/\s/g, "");
      dom.hiddenInput.value = value;

      if (!state.testStarted) startTest();

      renderCurrentWord(value);
      checkAutoAdvance(value);
    });
  }

  // ---------- Word generation ----------
  function randomWord() {
    return WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)];
  }

  function generateWords(count) {
    const arr = [];
    for (let i = 0; i < count; i++) arr.push(randomWord());
    return arr;
  }

  function ensureEnoughWords() {
    // Keep a buffer of 40 unseen words ahead of the current position.
    if (state.words.length - state.currentWordIndex < 40) {
      const more = generateWords(60);
      state.words = state.words.concat(more);
      appendWordElements(more, state.words.length - more.length);
    }
  }

  // ---------- Rendering ----------
  function buildWordElement(word, index) {
    const wordEl = document.createElement("div");
    wordEl.className = "word";
    wordEl.dataset.index = String(index);

    const charSpans = [];
    for (const ch of word) {
      const span = document.createElement("span");
      span.className = "char";
      span.textContent = ch;
      wordEl.appendChild(span);
      charSpans.push(span);
    }

    state.wordEls[index] = wordEl;
    state.charEls[index] = charSpans;
    return wordEl;
  }

  function appendWordElements(words, startIndex) {
    const fragment = document.createDocumentFragment();
    words.forEach((word, i) => {
      fragment.appendChild(buildWordElement(word, startIndex + i));
    });
    dom.wordsInner.appendChild(fragment);
  }

  function renderAllWords() {
    dom.wordsInner.innerHTML = "";
    state.wordEls = [];
    state.charEls = [];
    appendWordElements(state.words, 0);
  }

  function clearExtraChars(wordIndex) {
    const wordEl = state.wordEls[wordIndex];
    if (!wordEl) return;
    wordEl.querySelectorAll(".char.is-extra").forEach((el) => el.remove());
  }

  function renderCurrentWord(typed) {
    const wordIndex = state.currentWordIndex;
    const target = state.words[wordIndex] || "";
    const charSpans = state.charEls[wordIndex] || [];

    charSpans.forEach((span, i) => {
      span.classList.remove("is-correct", "is-incorrect");
      if (i < typed.length) {
        span.classList.add(typed[i] === target[i] ? "is-correct" : "is-incorrect");
      }
    });

    clearExtraChars(wordIndex);
    if (typed.length > target.length) {
      const wordEl = state.wordEls[wordIndex];
      const fragment = document.createDocumentFragment();
      for (let i = target.length; i < typed.length; i++) {
        const span = document.createElement("span");
        span.className = "char is-extra";
        span.textContent = typed[i];
        fragment.appendChild(span);
      }
      wordEl.appendChild(fragment);
    }

    positionCaret(typed);
  }

  function positionCaret(typed) {
    const wordIndex = state.currentWordIndex;
    const target = state.words[wordIndex] || "";
    const wordEl = state.wordEls[wordIndex];
    if (!wordEl) return;

    let refEl = null;
    let placeAfter = false;

    if (typed.length < target.length) {
      refEl = state.charEls[wordIndex][typed.length];
    } else {
      // Caret goes after the last character (target or extra).
      const extras = wordEl.querySelectorAll(".char.is-extra");
      refEl = extras.length
        ? extras[extras.length - 1]
        : state.charEls[wordIndex][target.length - 1];
      placeAfter = true;
    }

    if (!refEl) {
      // Empty word edge case — place caret at the word's own position.
      dom.caret.style.left = `${wordEl.offsetLeft}px`;
      dom.caret.style.top = `${wordEl.offsetTop}px`;
      return;
    }

    const left = placeAfter ? refEl.offsetLeft + refEl.offsetWidth : refEl.offsetLeft;
    dom.caret.style.left = `${left}px`;
    dom.caret.style.top = `${refEl.offsetTop}px`;

    autoScroll(refEl.offsetTop);
  }

  function autoScroll(caretTop) {
    const lineHeight = 2.35 * 16; // matches --font-size line-height in CSS (rem-based)
    const visibleLines = 3;
    const line = Math.round(caretTop / lineHeight);
    const maxVisibleLine = visibleLines - 1;

    const shift = line > maxVisibleLine ? (line - maxVisibleLine) * lineHeight : 0;
    dom.scrollInner.style.transform = `translateY(-${shift}px)`;
  }

  // ---------- Word commit / advance ----------
  function commitCurrentWord() {
    const typed = dom.hiddenInput.value;
    if (typed.length === 0) return; // ignore double-spaces

    state.typedWords[state.currentWordIndex] = typed;
    state.currentWordIndex++;
    dom.hiddenInput.value = "";
    ensureEnoughWords();
    renderCurrentWord("");
  }

  function checkAutoAdvance(typed) {
    // In word-less "time" mode we never force-advance on completion —
    // the user keeps typing until the timer ends. Spaces (handled in
    // keydown) are what move to the next word.
    ensureEnoughWords();
  }

  // ---------- Timer / test lifecycle ----------
  function startTest() {
    state.testStarted = true;
    state.startTime = Date.now();
    dom.focusPrompt.style.display = "none";

    state.timerId = setInterval(() => {
      const elapsed = (Date.now() - state.startTime) / 1000;
      state.timeLeft = Math.max(0, Math.round(state.duration - elapsed));
      dom.liveTime.textContent = state.timeLeft;

      if (state.timeLeft <= 0) {
        finishTest();
      }
    }, 200);

    state.liveStatsId = setInterval(updateLiveStats, 500);
  }

  function updateLiveStats() {
    if (state.testFinished) return;
    const elapsedMinutes = Math.max((Date.now() - state.startTime) / 60000, 1 / 600);
    const { correct, incorrect } = tallyChars(true);
    const totalTyped = correct + incorrect;

    const wpm = Math.round(correct / 5 / elapsedMinutes);
    const acc = totalTyped > 0 ? Math.round((correct / totalTyped) * 100) : 100;

    dom.liveWpm.textContent = wpm;
    dom.liveAcc.textContent = `${acc}%`;
    state.wpmSamples.push(wpm);
  }

  /**
   * Counts correct/incorrect/extra characters across every
   * committed word, plus the word currently being typed.
   */
  function tallyChars(includeCurrent) {
    let correct = 0;
    let incorrect = 0;
    let extra = 0;

    const lastIndex = includeCurrent
      ? state.currentWordIndex
      : state.currentWordIndex - 1;

    for (let i = 0; i <= lastIndex; i++) {
      const target = state.words[i] || "";
      const typed =
        i === state.currentWordIndex ? dom.hiddenInput.value : state.typedWords[i] || "";

      if (typed.length === 0) continue;

      for (let j = 0; j < typed.length; j++) {
        if (j < target.length) {
          if (typed[j] === target[j]) correct++;
          else incorrect++;
        } else {
          extra++;
        }
      }

      // Count the trailing space as a correct keystroke for every
      // word that was actually committed (not the in-progress one).
      if (i < state.currentWordIndex) correct++;
    }

    return { correct, incorrect, extra };
  }

  function finishTest() {
    if (state.testFinished) return;
    state.testFinished = true;

    clearInterval(state.timerId);
    clearInterval(state.liveStatsId);
    dom.hiddenInput.blur();

    const elapsedSeconds = state.duration - Math.max(state.timeLeft, 0) || state.duration;
    const elapsedMinutes = Math.max(elapsedSeconds / 60, 1 / 600);

    const { correct, incorrect, extra } = tallyChars(true);
    const totalTyped = correct + incorrect + extra;

    const netWpm = Math.round(correct / 5 / elapsedMinutes);
    const rawWpm = Math.round(totalTyped / 5 / elapsedMinutes);
    const accuracy = totalTyped > 0 ? Math.round((correct / (correct + incorrect + extra)) * 100) : 100;

    dom.resWpm.textContent = netWpm;
    dom.resAcc.textContent = `${accuracy}%`;
    dom.resRaw.textContent = rawWpm;
    dom.resTime.textContent = `${Math.round(elapsedSeconds)}s`;
    dom.resChars.textContent = `${correct}/${incorrect}/${extra}`;

    dom.typingFrame.style.display = "none";
    document.querySelector(".restart-row").style.display = "none";
    document.querySelector(".live-readout").style.display = "none";
    dom.resultsPanel.hidden = false;
  }

  // ---------- Full reset ----------
  function startNewTest(seconds) {
    clearInterval(state.timerId);
    clearInterval(state.liveStatsId);

    state.duration = seconds;
    state.words = generateWords(80);
    state.typedWords = [];
    state.currentWordIndex = 0;
    state.testStarted = false;
    state.testFinished = false;
    state.timeLeft = seconds;
    state.wpmSamples = [];

    dom.hiddenInput.value = "";
    dom.liveTime.textContent = seconds;
    dom.liveWpm.textContent = "0";
    dom.liveAcc.textContent = "100%";
    dom.scrollInner.style.transform = "translateY(0)";
    dom.focusPrompt.style.display = "flex";

    dom.typingFrame.style.display = "";
    document.querySelector(".restart-row").style.display = "";
    document.querySelector(".live-readout").style.display = "";
    dom.resultsPanel.hidden = true;

    renderAllWords();
    positionCaret("");
    dom.hiddenInput.focus();
  }

  return { init };
}
