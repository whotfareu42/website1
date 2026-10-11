// Admin panel: login, citizenship petitions, constitution editor, build uploads.
(function () {
  const { db, hasBackend, escapeHtml, toRoman, formatDate, applyBranding } = window.Nation;
  const $ = (id) => document.getElementById(id);

  applyBranding();

  if (!hasBackend) {
    $("demo-note").hidden = false;
    return;
  }

  // ---------- Auth ----------
  // Usernames are turned into the internal Supabase login, e.g. acp5 -> acp5@icarus.admin
  function toLoginEmail(input) {
    const name = input.trim().toLowerCase();
    return name.includes("@") ? name : `${name}@${window.Nation.cfg.adminDomain || "icarus.admin"}`;
  }

  async function checkAdmin() {
    const { data: { session } } = await db.auth.getSession();
    if (!session) return showLogin();
    const { data: isAdmin, error } = await db.rpc("is_admin");
    if (error || !isAdmin) {
      await db.auth.signOut();
      return showLogin("This account is not a member of the Council.");
    }
    $("who").textContent = session.user.email.split("@")[0];
    showPanel();
  }

  function showLogin(message = "") {
    $("panel-view").hidden = true;
    $("login-view").hidden = false;
    $("login-msg").textContent = message;
  }

  function showPanel() {
    $("login-view").hidden = true;
    $("panel-view").hidden = false;
    showAdminTab("applications");
  }

  $("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button");
    btn.disabled = true;
    $("login-msg").textContent = "";
    const { error } = await db.auth.signInWithPassword({
      email: toLoginEmail($("username").value),
      password: $("password").value
    });
    btn.disabled = false;
    if (error) { $("login-msg").textContent = "Wrong username or password."; return; }
    $("password").value = "";
    checkAdmin();
  });

  $("logout").addEventListener("click", async () => {
    await db.auth.signOut();
    showLogin();
  });

  // ---------- Admin tabs ----------
  const loaders = { applications: loadApplications, constitution: loadArticles, builds: loadBuilds };
  function showAdminTab(name) {
    Object.keys(loaders).forEach((t) => {
      $("atab-" + t).hidden = t !== name;
      document.querySelector(`[data-atab="${t}"]`).setAttribute("aria-selected", String(t === name));
    });
    loaders[name]();
  }
  document.querySelectorAll("[data-atab]").forEach((b) => b.addEventListener("click", () => showAdminTab(b.dataset.atab)));

  function fail(box, err) {
    console.error(err);
    box.innerHTML = `<p class="error">Error: ${escapeHtml(err.message || err)}</p>`;
  }

  // ---------- Applications ----------
  let appFilter = "pending";
  document.querySelectorAll("#app-filter [data-status]").forEach((b) =>
    b.addEventListener("click", () => {
      appFilter = b.dataset.status;
      document.querySelectorAll("#app-filter [data-status]").forEach((x) => x.classList.toggle("ghost", x !== b));
      loadApplications();
    })
  );

  async function loadApplications() {
    const box = $("app-list");
    box.innerHTML = `<p class="muted">Loading…</p>`;
    let q = db.from("applications").select("*").order("created_at", { ascending: false });
    if (appFilter !== "all") q = q.eq("status", appFilter);
    const { data, error } = await q;
    if (error) return fail(box, error);
    if (!data.length) { box.innerHTML = `<p class="muted">No petitions here.</p>`; return; }
    box.innerHTML = data.map((a) => `
      <div class="admin-item admin-row">
        <div>
          <strong>${escapeHtml(a.minecraft_name)}</strong>
          <span class="badge ${a.status}">${a.status}</span>
          <div class="hint">${formatDate(a.created_at)}</div>
        </div>
        <div class="actions">
          ${a.status !== "accepted" ? `<button class="btn small green" data-act="accepted" data-id="${a.id}">Accept</button>` : ""}
          ${a.status !== "rejected" ? `<button class="btn small" data-act="rejected" data-id="${a.id}">Reject</button>` : ""}
          <button class="btn small ghost" data-act="delete" data-id="${a.id}">Delete</button>
        </div>
      </div>`).join("");
  }

  $("app-list").addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const act = btn.dataset.act;
    if (act === "delete" && !confirm("Delete this petition permanently?")) return;
    btn.disabled = true;
    const { error } = act === "delete"
      ? await db.from("applications").delete().eq("id", id)
      : await db.from("applications").update({ status: act }).eq("id", id);
    if (error) { alert(error.message); btn.disabled = false; return; }
    loadApplications();
  });

  // ---------- Constitution ----------
  async function loadArticles() {
    const box = $("article-list");
    box.innerHTML = `<p class="muted">Loading…</p>`;
    const { data, error } = await db.from("constitution_articles").select("*").order("position").order("id");
    if (error) return fail(box, error);
    if (!data.length) { box.innerHTML = `<p class="muted">No articles yet. Add the first one below.</p>`; return; }
    box.innerHTML = data.map((a, i) => `
      <form class="admin-item" data-id="${a.id}">
        <div class="admin-row">
          <strong>Article ${toRoman(i + 1)}</strong>
          <div class="actions">
            <button type="button" class="btn small ghost" data-move="-1" ${i === 0 ? "disabled" : ""}>↑</button>
            <button type="button" class="btn small ghost" data-move="1" ${i === data.length - 1 ? "disabled" : ""}>↓</button>
          </div>
        </div>
        <label>Title</label>
        <input name="title" value="${escapeHtml(a.title)}" required maxlength="150">
        <label>Text</label>
        <textarea name="body">${escapeHtml(a.body)}</textarea>
        <div class="actions" style="margin-top:10px">
          <button class="btn small" type="submit">Save</button>
          <button class="btn small ghost" type="button" data-delete>Delete</button>
          <span class="form-msg"></span>
        </div>
      </form>`).join("");
    articleCache = data;
  }
  let articleCache = [];

  $("article-list").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const status = form.querySelector(".form-msg");
    const { error } = await db.from("constitution_articles")
      .update({ title: form.elements.title.value.trim(), body: form.elements.body.value, updated_at: new Date().toISOString() })
      .eq("id", Number(form.dataset.id));
    status.className = "form-msg " + (error ? "error" : "success");
    status.textContent = error ? error.message : "Saved.";
  });

  $("article-list").addEventListener("click", async (e) => {
    const form = e.target.closest("form");
    if (!form) return;
    const id = Number(form.dataset.id);

    if (e.target.matches("[data-delete]")) {
      if (!confirm("Delete this article?")) return;
      const { error } = await db.from("constitution_articles").delete().eq("id", id);
      if (error) return alert(error.message);
      return loadArticles();
    }

    const move = e.target.dataset.move;
    if (move) {
      const idx = articleCache.findIndex((a) => a.id === id);
      const other = articleCache[idx + Number(move)];
      if (!other) return;
      // Re-number everything so positions stay clean, then swap the two.
      const order = articleCache.map((a) => a.id);
      [order[idx], order[idx + Number(move)]] = [order[idx + Number(move)], order[idx]];
      const results = await Promise.all(order.map((aid, pos) =>
        db.from("constitution_articles").update({ position: pos + 1 }).eq("id", aid)));
      const err = results.find((r) => r.error);
      if (err) alert(err.error.message);
      loadArticles();
    }
  });

  $("add-article").addEventListener("click", async () => {
    const position = articleCache.length ? Math.max(...articleCache.map((a) => a.position)) + 1 : 1;
    const { error } = await db.from("constitution_articles").insert({ title: "New article", body: "", position });
    if (error) return alert(error.message);
    await loadArticles();
    const forms = $("article-list").querySelectorAll("form");
    forms[forms.length - 1]?.scrollIntoView({ behavior: "smooth" });
  });

  // ---------- Builds ----------
  async function loadBuilds() {
    const box = $("build-list");
    box.innerHTML = `<p class="muted">Loading…</p>`;
    const { data, error } = await db.from("builds").select("*").order("created_at", { ascending: false });
    if (error) return fail(box, error);
    if (!data.length) { box.innerHTML = `<p class="muted">No builds yet.</p>`; return; }
    box.innerHTML = data.map((b) => `
      <div class="admin-item admin-row">
        <div class="admin-row" style="justify-content:flex-start">
          ${b.image_url ? `<img class="thumb" src="${escapeHtml(b.image_url)}" alt="">` : `<div class="thumb"></div>`}
          <div>
            <strong>${escapeHtml(b.title)}</strong>
            <div class="hint">${[b.builder, b.location].filter(Boolean).map(escapeHtml).join(" · ")}</div>
          </div>
        </div>
        <button class="btn small ghost" data-del-build="${b.id}" data-path="${escapeHtml(b.image_path || "")}">Delete</button>
      </div>`).join("");
  }

  $("build-list").addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-del-build]");
    if (!btn || !confirm("Delete this build?")) return;
    btn.disabled = true;
    if (btn.dataset.path) await db.storage.from("builds").remove([btn.dataset.path]);
    const { error } = await db.from("builds").delete().eq("id", Number(btn.dataset.delBuild));
    if (error) { alert(error.message); btn.disabled = false; return; }
    loadBuilds();
  });

  $("build-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const msg = $("build-msg");
    const btn = form.querySelector("button[type=submit]");
    const file = form.elements.image.files[0];
    msg.className = "form-msg";

    if (file && file.size > 5 * 1024 * 1024) {
      msg.classList.add("error"); msg.textContent = "The image is larger than 5 MB."; return;
    }

    btn.disabled = true;
    msg.textContent = "Uploading…";
    try {
      let image_path = null, image_url = null;
      if (file) {
        const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
        image_path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const up = await db.storage.from("builds").upload(image_path, file, { contentType: file.type });
        if (up.error) throw up.error;
        image_url = db.storage.from("builds").getPublicUrl(image_path).data.publicUrl;
      }
      const { error } = await db.from("builds").insert({
        title: form.elements.title.value.trim(),
        builder: form.elements.builder.value.trim(),
        location: form.elements.location.value.trim(),
        description: form.elements.description.value.trim(),
        image_path, image_url
      });
      if (error) throw error;
      form.reset();
      msg.classList.add("success");
      msg.textContent = "Build added.";
      loadBuilds();
    } catch (err) {
      msg.classList.add("error");
      msg.textContent = "Upload failed: " + (err.message || err);
    } finally {
      btn.disabled = false;
    }
  });

  db.auth.onAuthStateChange((event) => { if (event === "SIGNED_OUT") showLogin(); });
  checkAdmin();
})();
