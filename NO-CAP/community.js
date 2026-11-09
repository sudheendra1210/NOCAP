const MAX_GUESS_LENGTH = 150;
const MAX_THEORIES = 100;
const INSERT_SETUP_MESSAGE = "Online submissions are disabled until secure Clerk and Supabase authorization is configured.";

// Fictional seed content for the demo. Keep these entries separate from user submissions.
const demoGuesses = [
  { id: "demo-1", username: "fictional_theory_01", text: "Something big is coming, and nobody's ready 👀" },
  { id: "demo-2", username: "fictional_theory_02", text: "A secret gathering with a twist. Calling it now." },
  { id: "demo-3", username: "fictional_theory_03", text: "The name sounds like a challenge… but to whom?" },
  { id: "demo-4", username: "fictional_theory_04", text: "Whatever it is, the countdown has me curious." },
];

export function initializeCommunityUI() {
  const community = document.querySelector("#community");
  const guessGrid = document.querySelector("#guess-grid");
  const emptyState = document.querySelector("#guess-empty");
  const makeGuessButton = document.querySelector("#make-guess");
  const guessPrompt = document.querySelector("#guess-prompt");
  const communityGuessForm = document.querySelector("#community-guess-form");
  const communityGuessCounter = document.querySelector("#community-guess-counter");
  const communityGuessError = document.querySelector("#community-guess-error");
  const communityGuessSuccess = document.querySelector("#community-guess-success");
  const guessDialog = document.querySelector("#guess-dialog");
  const guessForm = document.querySelector("#guess-form");
  const guessInput = document.querySelector("#guess-input");
  const guessCounter = document.querySelector("#guess-counter");
  const guessError = document.querySelector("#guess-error");
  const guessFeedback = document.querySelector("#guess-feedback");
  const guessSubmit = document.querySelector("#guess-submit");
  const prototypeDialog = document.querySelector("#profile-prototype-dialog");
  const prototypeTitle = document.querySelector("#profile-prototype-title");
  const prototypeCopy = document.querySelector("#profile-prototype-copy");
  const prototypeClose = document.querySelector("#profile-prototype-close");
  const prototypeDone = document.querySelector("#profile-prototype-done");
  const profileControl = document.querySelector("#auth-profile-control");
  const profileButton = document.querySelector("#auth-profile");
  const loginButton = document.querySelector("#auth-open");
  const theoryStatus = document.querySelector("#theory-status");
  const communityGuessSubmit = communityGuessForm.querySelector("button[type='submit']");

  let visibleGuesses = demoGuesses.map((entry) => ({ ...entry, source: "demo" }));
  let signedIn = false;
  let currentUserId = "";
  let currentUsername = "";
  let authRequestPending = false;
  let submitting = false;
  let loadSequence = 0;
  let supabaseModulePromise = null;
  let supabase = null;
  let supabaseConfigured = false;
  let theoryInsertsEnabled = false;
  let supabaseInitializationError = "";

  function renderGuesses() {
    guessGrid.replaceChildren();
    emptyState.hidden = visibleGuesses.length > 0;

    for (const entry of visibleGuesses) {
      const card = document.createElement("article");
      card.className = "guess-card";
      card.dataset.source = entry.source;

      const label = document.createElement("span");
      label.className = "guess-card-label";
      label.textContent = entry.username || "NO CAP member";

      if (entry.source === "pending") {
        const pendingLabel = document.createElement("span");
        pendingLabel.className = "guess-card-label";
        pendingLabel.textContent = "PENDING REVIEW";
        card.append(label, pendingLabel);
      } else {
        card.append(label);
      }

      const text = document.createElement("p");
      text.className = "guess-card-text";
      text.textContent = entry.text;

      card.append(text);
      guessGrid.append(card);
    }
  }

  function setTheoryStatus(text) {
    theoryStatus.textContent = text;
    theoryStatus.hidden = !text;
  }

  function showDemoTheories() {
    visibleGuesses = demoGuesses.map((entry) => ({ ...entry, source: "demo" }));
    renderGuesses();
  }

  function updateSubmitAvailability() {
    const unavailable = signedIn && !theoryInsertsEnabled;
    communityGuessSubmit.disabled = submitting || unavailable;
    guessSubmit.disabled = submitting || unavailable;
  }

  async function ensureSupabase() {
    if (!supabaseModulePromise) {
      supabaseModulePromise = import("./supabase.js").then((module) => {
        supabase = module.supabase;
        supabaseConfigured = module.supabaseConfigured;
        theoryInsertsEnabled = module.theoryInsertsEnabled;
        supabaseInitializationError = module.supabaseInitializationError;
        updateSubmitAvailability();
        return true;
      }).catch(() => {
        supabaseModulePromise = null;
        supabaseInitializationError = "The community database could not initialize. Check the Supabase setup and reload.";
        updateSubmitAvailability();
        return false;
      });
    }
    return supabaseModulePromise;
  }

  async function loadTheories() {
    const sequence = ++loadSequence;

    setTheoryStatus("Loading community theories…");
    const initialized = await ensureSupabase();
    if (sequence !== loadSequence) return;

    if (!initialized || supabaseInitializationError) {
      showDemoTheories();
      setTheoryStatus(supabaseInitializationError || "The community database could not initialize. Showing fictional demo theories.");
      return;
    }

    if (!supabaseConfigured || !supabase) {
      showDemoTheories();
      setTheoryStatus("Demo theories are fictional. Supabase is not configured yet, so live submissions are off.");
      return;
    }

    setTheoryStatus("Loading community theories…");
    try {
      const { data, error } = await supabase
        .from("theories")
        .select("id, username, content, created_at, is_approved")
        .order("created_at", { ascending: false })
        .limit(MAX_THEORIES);

      if (error) throw error;
      if (sequence !== loadSequence) return;

      const remoteGuesses = (Array.isArray(data) ? data : []).map((entry) => ({
        id: entry.id,
        // RLS exposes pending rows only to their owner. If an older row was
        // created before the Clerk username claim was configured, use that
        // owner's signed-in Clerk username for the pending card.
        username: (() => {
          const storedUsername = typeof entry.username === "string" ? entry.username.trim() : "";
          return storedUsername && storedUsername !== "NO CAP member"
            ? storedUsername
            : (!entry.is_approved && currentUsername ? currentUsername : "NO CAP member");
        })(),
        text: typeof entry.content === "string" ? entry.content : "",
        source: entry.is_approved ? "remote" : "pending",
      })).filter((entry) => entry.text.trim().length > 0 && entry.text.length <= MAX_GUESS_LENGTH);
      const demoEntries = demoGuesses.map((entry) => ({ ...entry, source: "demo" }));
      visibleGuesses = [...remoteGuesses, ...demoEntries];
      renderGuesses();

      if (!theoryInsertsEnabled) {
        setTheoryStatus("Showing approved theories and fictional demo cards. Online submissions are off until secure Clerk authorization is configured.");
      } else if (remoteGuesses.some((entry) => entry.source === "pending")) {
        setTheoryStatus("Only approved theories are public. Your pending theories are visible to you until approved.");
      } else if (remoteGuesses.length > 0) {
        setTheoryStatus("Approved theories are shown above; fictional demo cards are at the bottom.");
      } else {
        setTheoryStatus("No approved theories yet. Fictional demo theories are shown below.");
      }
    } catch {
      if (sequence !== loadSequence) return;
      showDemoTheories();
      setTheoryStatus("We couldn't load community theories right now. The displayed demo theories are fictional.");
    }
  }

  function updateCounter() {
    guessCounter.textContent = `${guessInput.value.length} / ${MAX_GUESS_LENGTH}`;
    guessCounter.dataset.overLimit = String(guessInput.value.length > MAX_GUESS_LENGTH);
  }

  function updateCommunityCounter() {
    communityGuessCounter.textContent = `${guessPrompt.value.length} / ${MAX_GUESS_LENGTH}`;
    communityGuessCounter.dataset.overLimit = String(guessPrompt.value.length > MAX_GUESS_LENGTH);
  }

  function showGuessError(text = "") {
    guessError.textContent = text;
    guessError.hidden = !text;
    guessInput.setAttribute("aria-invalid", String(Boolean(text)));
  }

  function showCommunityError(text = "") {
    communityGuessError.textContent = text;
    communityGuessError.hidden = !text;
    guessPrompt.setAttribute("aria-invalid", String(Boolean(text)));
  }

  function requestAuthentication(draft = "") {
    if (!signedIn && authRequestPending) return;
    if (!signedIn) authRequestPending = true;
    document.dispatchEvent(new CustomEvent("nocap:request-guess-auth", { detail: { draft } }));
  }

  async function storeGuess(text) {
    const initialized = await ensureSupabase();
    if (!initialized) throw new Error(supabaseInitializationError || INSERT_SETUP_MESSAGE);
    if (!supabase || !theoryInsertsEnabled) throw new Error(INSERT_SETUP_MESSAGE);

    // Only the content comes from the browser. Database defaults derive the
    // Clerk user ID and username from the verified JWT claims.
    const { data, error } = await supabase
      .from("theories")
      .insert({ content: text })
      .select("id, username, content, created_at, is_approved")
      .single();

    if (error) throw error;
    if (data) {
      const saved = {
        id: data.id,
        username: typeof data.username === "string" && data.username.trim() && data.username.trim() !== "NO CAP member"
          ? data.username.trim()
          : (!data.is_approved && currentUsername ? currentUsername : "NO CAP member"),
        text: typeof data.content === "string" ? data.content : text,
        source: data.is_approved ? "remote" : "pending",
      };
      visibleGuesses = [saved, ...visibleGuesses.filter((entry) => entry.id !== saved.id)];
      renderGuesses();
      setTheoryStatus(saved.source === "pending"
        ? "Your theory is saved and visible to you while it awaits approval."
        : "Only approved theories are shown publicly.");
    }
  }

  function openGuessForm(event) {
    if (window.location.hash !== "#community") {
      const url = new URL(window.location.href);
      url.hash = "community";
      history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }
    community.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });

    showGuessError();
    if (signedIn && !theoryInsertsEnabled) showGuessError(INSERT_SETUP_MESSAGE);
    guessFeedback.hidden = true;
    const draft = event?.detail?.draft;
    guessInput.value = typeof draft === "string" ? draft.slice(0, MAX_GUESS_LENGTH) : "";
    updateCounter();
    if (!guessDialog.open) guessDialog.showModal();
    guessInput.focus();
  }

  function closeGuessForm() {
    if (guessDialog.open) guessDialog.close();
  }

  function openPrototypePanel(type) {
    const panel = type === "rewards"
      ? {
          title: "YOUR REWARDS",
          copy: "This prototype panel will show your rewards here in a future phase. No rewards are tracked yet.",
        }
      : {
          title: "PROFILE SETTINGS",
          copy: "This is a prototype panel. Profile changes are not available yet; your current account details are shown in the profile menu.",
        };

    prototypeTitle.textContent = panel.title;
    prototypeCopy.textContent = panel.copy;
    document.dispatchEvent(new CustomEvent("nocap:close-profile-menu"));
    if (!prototypeDialog.open) prototypeDialog.showModal();
    prototypeClose.focus();
  }

  function closePrototypePanel() {
    if (prototypeDialog.open) prototypeDialog.close();
  }

  renderGuesses();
  updateCounter();
  updateCommunityCounter();
  updateSubmitAvailability();
  void loadTheories();

  document.addEventListener("nocap:auth-state", (event) => {
    const previousIdentity = `${signedIn}:${currentUserId}:${currentUsername}`;
    signedIn = Boolean(event.detail?.signedIn);
    currentUserId = signedIn && typeof event.detail?.userId === "string" ? event.detail.userId : "";
    currentUsername = signedIn && typeof event.detail?.username === "string" ? event.detail.username.trim() : "";
    if (signedIn) authRequestPending = false;
    updateSubmitAvailability();
    if (previousIdentity !== `${signedIn}:${currentUserId}:${currentUsername}`) void loadTheories();
  });
  document.addEventListener("nocap:guess-auth-cancelled", () => {
    authRequestPending = false;
  });

  makeGuessButton.addEventListener("click", () => requestAuthentication());
  guessPrompt.addEventListener("focus", () => {
    if (!signedIn) requestAuthentication(guessPrompt.value);
  });
  guessPrompt.addEventListener("click", () => {
    if (!signedIn) requestAuthentication(guessPrompt.value);
  });
  guessPrompt.addEventListener("input", () => {
    updateCommunityCounter();
    showCommunityError();
    communityGuessSuccess.hidden = true;
  });

  communityGuessForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    showCommunityError();
    communityGuessSuccess.hidden = true;

    const draft = guessPrompt.value;
    const text = draft.trim();
    if (!signedIn) {
      requestAuthentication(draft);
      return;
    }
    if (!text) {
      showCommunityError("Add a theory before submitting.");
      guessPrompt.focus();
      return;
    }
    if (draft.length > MAX_GUESS_LENGTH || text.length > MAX_GUESS_LENGTH) {
      showCommunityError(`Keep your theory to ${MAX_GUESS_LENGTH} characters or fewer.`);
      guessPrompt.focus();
      return;
    }
    if (!currentUserId) {
      showCommunityError("We couldn't confirm your account. Please try again.");
      return;
    }
    if (!theoryInsertsEnabled) {
      showCommunityError(INSERT_SETUP_MESSAGE);
      return;
    }
    if (submitting) return;

    submitting = true;
    communityGuessForm.setAttribute("aria-busy", "true");
    updateSubmitAvailability();
    try {
      await storeGuess(text);
      guessPrompt.value = "";
      updateCommunityCounter();
      communityGuessSuccess.textContent = "Theory dropped. Let's see if you're right 👀";
      communityGuessSuccess.hidden = false;
    } catch {
      showCommunityError("We couldn't save your theory online. Please try again.");
    } finally {
      submitting = false;
      communityGuessForm.removeAttribute("aria-busy");
      updateSubmitAvailability();
    }
  });

  document.addEventListener("nocap:open-guess-form", openGuessForm);
  window.addEventListener("popstate", () => {
    if (guessDialog.open) closeGuessForm();
  });

  guessInput.addEventListener("input", () => {
    updateCounter();
    showGuessError();
    guessFeedback.hidden = true;
  });

  guessForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    showGuessError();
    guessFeedback.hidden = true;

    if (!signedIn) {
      const draft = guessInput.value;
      closeGuessForm();
      requestAuthentication(draft);
      return;
    }

    const text = guessInput.value.trim();
    if (!text) {
      showGuessError("Add a theory before submitting.");
      guessInput.focus();
      return;
    }
    if (guessInput.value.length > MAX_GUESS_LENGTH || text.length > MAX_GUESS_LENGTH) {
      showGuessError(`Keep your theory to ${MAX_GUESS_LENGTH} characters or fewer.`);
      guessInput.focus();
      return;
    }
    if (!currentUserId) {
      showGuessError("We couldn't confirm your account. Please try again.");
      guessInput.focus();
      return;
    }
    if (!theoryInsertsEnabled) {
      showGuessError(INSERT_SETUP_MESSAGE);
      return;
    }
    if (submitting) return;

    submitting = true;
    guessForm.setAttribute("aria-busy", "true");
    updateSubmitAvailability();
    try {
      await storeGuess(text);
      guessPrompt.value = "";
      updateCommunityCounter();
      showCommunityError();
      communityGuessSuccess.hidden = true;
      guessInput.value = "";
      updateCounter();
      guessFeedback.textContent = "Theory dropped. Let's see if you're right 👀";
      guessFeedback.hidden = false;
    } catch {
      showGuessError("We couldn't save your theory online. Please try again.");
    } finally {
      submitting = false;
      guessForm.removeAttribute("aria-busy");
      updateSubmitAvailability();
    }
  });

  document.querySelector("#guess-close").addEventListener("click", closeGuessForm);
  document.querySelector("#guess-cancel").addEventListener("click", closeGuessForm);
  guessDialog.addEventListener("click", (event) => {
    if (event.target === guessDialog) closeGuessForm();
  });
  guessDialog.addEventListener("close", () => makeGuessButton.focus());

  document.querySelectorAll("[data-profile-prototype]").forEach((button) => {
    button.addEventListener("click", () => openPrototypePanel(button.dataset.profilePrototype));
  });
  prototypeClose.addEventListener("click", closePrototypePanel);
  prototypeDone.addEventListener("click", closePrototypePanel);
  prototypeDialog.addEventListener("click", (event) => {
    if (event.target === prototypeDialog) closePrototypePanel();
  });
  prototypeDialog.addEventListener("close", () => (profileControl.hidden ? loginButton : profileButton).focus());

}
