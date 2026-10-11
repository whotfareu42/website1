// Public site: tabs, constitution, builds gallery and citizenship form.
(function () {
  const { db, hasBackend, escapeHtml, textToParagraphs, toRoman, applyBranding, demo } = window.Nation;

  applyBranding();
  if (!hasBackend) document.getElementById("demo-note").hidden = false;

  // ---------- Tabs (with #hash so links can point to a tab) ----------
  const tabs = ["constitution", "builds", "apply"];
  function showTab(name) {
    if (!tabs.includes(name)) name = "constitution";
    tabs.forEach((t) => {
      document.getElementById("tab-" + t).hidden = t !== name;
      const btn = document.querySelector(`[data-tab="${t}"]`);
      btn.setAttribute("aria-selected", String(t === name));
    });
  }
  document.querySelectorAll("[data-tab]").forEach((btn) =>
    btn.addEventListener("click", () => { location.hash = btn.dataset.tab; })
  );
  window.addEventListener("hashchange", () => showTab(location.hash.slice(1)));
  showTab(location.hash.slice(1));

  // ---------- Constitution ----------
  async function loadArticles() {
    const box = document.getElementById("articles");
    let rows = demo.articles;
    if (hasBackend) {
      const { data, error } = await db.from("constitution_articles").select("*").order("position").order("id");
      if (error) { box.innerHTML = `<p class="error">Could not load the constitution.</p>`; return; }
      rows = data;
    }
    if (!rows.length) { box.innerHTML = `<p class="muted">The constitution has not been written yet.</p>`; return; }
    box.innerHTML = rows.map((a, i) => `
      <article class="article">
        <h3><span class="article-no">Article ${toRoman(i + 1)}</span>${escapeHtml(a.title)}</h3>
        ${textToParagraphs(a.body)}
      </article>`).join("");
  }

  // ---------- Builds ----------
  async function loadBuilds() {
    const box = document.getElementById("builds");
    let rows = demo.builds;
    if (hasBackend) {
      const { data, error } = await db.from("builds").select("*").order("created_at", { ascending: false });
      if (error) { box.innerHTML = `<p class="error">Could not load builds.</p>`; return; }
      rows = data;
    }
    if (!rows.length) { box.innerHTML = `<p class="muted center">No builds have been recorded yet.</p>`; return; }
    box.innerHTML = rows.map((b) => `
      <figure class="build-card">
        ${b.image_url
          ? `<img src="${escapeHtml(b.image_url)}" alt="${escapeHtml(b.title)}" loading="lazy">`
          : `<div class="img-placeholder" aria-hidden="true">⛫</div>`}
        <figcaption>
          <h3>${escapeHtml(b.title)}</h3>
          ${b.builder || b.location ? `<p class="meta">${[b.builder && "By " + escapeHtml(b.builder), b.location && escapeHtml(b.location)].filter(Boolean).join(" · ")}</p>` : ""}
          ${b.description ? `<p>${escapeHtml(b.description)}</p>` : ""}
        </figcaption>
      </figure>`).join("");
  }

  // ---------- Citizenship form ----------
  const form = document.getElementById("apply-form");
  const msg = document.getElementById("apply-msg");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = form.elements.minecraft_name.value.trim();
    msg.className = "form-msg";
    if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) {
      msg.textContent = "Please enter a valid Minecraft name (3–16 letters, numbers or underscores).";
      msg.classList.add("error");
      return;
    }
    const btn = form.querySelector("button");
    btn.disabled = true;
    try {
      if (hasBackend) {
        const { error } = await db.from("applications").insert({ minecraft_name: name });
        if (error) throw error;
      }
      form.reset();
      msg.textContent = hasBackend
        ? `Your petition, ${name}, has been received. The Council will review it soon.`
        : `Demo mode: the petition for ${name} was not actually saved.`;
      msg.classList.add("success");
    } catch (err) {
      msg.textContent = "Something went wrong. Please try again later.";
      msg.classList.add("error");
    } finally {
      btn.disabled = false;
    }
  });

  loadArticles();
  loadBuilds();
})();
