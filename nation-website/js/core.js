// Shared helpers used by both the public site and the admin panel.
(function () {
  const cfg = window.SITE_CONFIG || {};
  const hasBackend = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase);

  const db = hasBackend ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Turns plain text with line breaks into safe paragraphs.
  function textToParagraphs(text) {
    return String(text ?? "")
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
      .join("");
  }

  function toRoman(num) {
    const map = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
      [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
    let out = "";
    for (const [v, s] of map) { while (num >= v) { out += s; num -= v; } }
    return out;
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    } catch { return ""; }
  }

  function applyBranding() {
    document.querySelectorAll("[data-nation-name]").forEach((el) => (el.textContent = cfg.nationName || "Our Nation"));
    document.querySelectorAll("[data-nation-motto]").forEach((el) => (el.textContent = cfg.motto || ""));
    const suffix = document.body.dataset.titleSuffix;
    document.title = (cfg.nationName || "Our Nation") + (suffix ? " · " + suffix : "");
    const year = document.getElementById("year");
    if (year) year.textContent = new Date().getFullYear();
  }

  // Sample content shown while Supabase is not configured yet.
  const demo = {
    articles: [
      { id: 1, position: 1, title: "Of the Realm", body: "The Kingdom is a sovereign nation upon this server, founded by its first citizens in good faith and fellowship.\n\nIts lands extend to every chunk claimed in its name." },
      { id: 2, position: 2, title: "Of the Crown and the Council", body: "The Crown leads the Kingdom. A Council of Admins advises the Crown and keeps order in the realm." },
      { id: 3, position: 3, title: "Of the Citizens", body: "Every citizen may build, trade and dwell within the Kingdom's borders.\n\nGriefing, theft and dishonour towards fellow citizens are forbidden." }
    ],
    builds: [
      { id: 1, title: "The Great Keep", builder: "Founders", location: "X 120 / Z -340", description: "Seat of the Crown, raised from deepslate and spruce.", image_url: "" },
      { id: 2, title: "Harbour of Saltmere", builder: "The Guild", location: "X -80 / Z 610", description: "Docks and warehouses along the eastern sea.", image_url: "" }
    ]
  };

  window.Nation = { cfg, db, hasBackend, escapeHtml, textToParagraphs, toRoman, formatDate, applyBranding, demo };
})();
