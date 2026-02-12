// --------------------
// STATE
// --------------------
let startTime = Date.now();
let elapsed = 0;
let interval = null;
let currentTabId = null;
let notes = [];

// --------------------
// PAGE DETECTION
// --------------------
async function detectPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTabId = tab.id;

  let platform = "Browser App";
  if (tab.url.includes("colab")) platform = "Google Colab";
  else if (tab.url.includes("docs.google")) platform = "Google Docs";

  document.getElementById("page").innerText = `Platform: ${platform}`;
}

detectPage();

// --------------------
// TIMER LOGIC
// --------------------
function startTimer() {
  if (interval) return; // prevent multiple intervals

  interval = setInterval(() => {
    elapsed++;
    document.getElementById("timer").innerText =
      `Time: ${elapsed} sec`;
  }, 1000);
}

function stopTimer() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}

// --------------------
// TAB / WINDOW FOCUS
// --------------------
chrome.tabs.onActivated.addListener((activeInfo) => {
  if (activeInfo.tabId === currentTabId) startTimer();
  else stopTimer();
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) stopTimer();
  else startTimer();
});

// Initial start
startTimer();

// --------------------
// NOTES HANDLING
// --------------------
document.getElementById("addNote")?.addEventListener("click", () => {
  const noteEl = document.getElementById("note");
  const note = noteEl.value.trim();

  if (!note) return;

  notes.push(note);
  noteEl.value = "";
});

// --------------------
// GENERATE REPORT
// --------------------
document.getElementById("generate").onclick = async () => {
  stopTimer();

  const minutes = Math.max(1, Math.round(elapsed / 60));
  const session =
    document.getElementById("session")?.value || "Work Session";

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const data = {
    platform: tab.url.includes("colab") ? "Google Colab" : "Browser App",
    work_type: "Coding / Analysis",
    time_spent_minutes: minutes,
    user_action: session,
    date: new Date().toISOString().split("T")[0],
    notes: notes
  };

  try {
    const res = await fetch("http://127.0.0.1:8000/analyze-work", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const result = await res.json();

    // Show output
    document.getElementById("output").textContent =
      JSON.stringify(result, null, 2);

    // Auto download PDF (SAFE SCOPE)
    if (result.pdf) {
      const pdfUrl = `http://127.0.0.1:8000/download/${result.pdf}`;
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = result.pdf;
      link.click();
    }

    // Reset session state
    notes = [];
    elapsed = 0;
    document.getElementById("timer").innerText = "Time: 0 sec";

  } catch (err) {
    document.getElementById("output").textContent =
      "Error connecting to backend";
  }
};
