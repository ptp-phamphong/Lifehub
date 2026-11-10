// Chạy trên https://student.ueh.edu.vn/*.
// Chèn nút "● Đồng bộ LifeHub" dưới logo UEH (img.header-logo); không thấy logo thì dùng nút nổi
// góc trên bên phải. Mở trang → tự gửi phiên (tối đa 1 lần / 10 phút, background lo phần giới hạn).
// Bấm nút → luôn gửi và đồng bộ ngay.
//
// Việc chờ đồng bộ (hỏi trạng thái mỗi 3 giây, tối đa 3 phút) làm ở đây chứ không ở background:
// service worker MV3 có thể bị Chrome tắt khi rảnh, còn mỗi tin nhắn từ trang lại đánh thức nó.
(() => {
  if (window.__lifehubUehSyncLoaded) return;
  window.__lifehubUehSyncLoaded = true;

  const POLL_INTERVAL_MS = 3000;
  const POLL_TIMEOUT_MS = 3 * 60 * 1000;
  const LOGO_WAIT_MS = 5000;

  const t = (key, subs) => chrome.i18n.getMessage(key, subs) || key;

  let button = null;
  let dot = null;
  let busy = false;

  // ---------- Giao diện ----------

  function createButton() {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "lh-sync-btn";

    const d = document.createElement("span");
    d.className = "lh-sync-dot lh-sync-dot--gray";
    const label = document.createElement("span");
    label.textContent = t("buttonLabel");

    btn.append(d, label);
    btn.addEventListener("click", onClick);

    button = btn;
    dot = d;
    setState("gray", t("statusLoading"));
    return btn;
  }

  function mount() {
    const logo = document.querySelector("img.header-logo");
    if (logo) {
      // Nút nằm DƯỚI logo, căn giữa. Header UEH (08/11/2026) là <header> flex cao 100px với logo 80px
      // là con duy nhất - không còn chỗ bên trong, và chèn vào đó sẽ đẩy logo lệch khỏi giữa. Vì vậy
      // thêm một hàng riêng ngay sau khối chứa logo thay vì sửa CSS của trang.
      // Logo nằm trong <a> thì lấy khối cha của <a>, để nút không thành một phần của link.
      const container = (logo.closest("a") || logo).parentElement;
      const row = document.createElement("div");
      row.className = "lh-sync-row";
      row.appendChild(createButton());
      container.insertAdjacentElement("afterend", row);
      return true;
    }
    return false;
  }

  function mountFloating() {
    document.body.appendChild(createButton());
    button.classList.add("lh-sync-btn--floating");
  }

  function setState(color, tooltip) {
    if (!dot) return;
    dot.className = "lh-sync-dot lh-sync-dot--" + color;
    button.title = tooltip + "\n\n" + t("clickToSync");
  }

  function toast(text, isError) {
    const el = document.createElement("div");
    el.className = "lh-sync-toast" + (isError ? " lh-sync-toast--error" : "");
    el.textContent = text;
    document.body.appendChild(el);
    // Hai khung hình để transition chạy được sau khi phần tử đã vào DOM.
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("lh-sync-toast--show")));
    setTimeout(() => {
      el.classList.remove("lh-sync-toast--show");
      setTimeout(() => el.remove(), 400);
    }, isError ? 8000 : 5000);
  }

  // ---------- Trạng thái ----------

  function formatTime(iso) {
    try {
      return new Date(iso).toLocaleString(chrome.i18n.getUILanguage());
    } catch {
      return iso;
    }
  }

  // status = UehSessionStatusDto (camelCase từ ASP.NET Core).
  function renderStatus(status) {
    const lines = [];
    if (!status || !status.hasSession) {
      lines.push(t("sessionNone"));
    } else {
      lines.push(status.isValid ? t("sessionValid") : t("sessionExpired"));
    }

    if (status && status.lastSyncAt) {
      lines.push(t("lastSync", [formatTime(status.lastSyncAt), String(status.lastSyncCount ?? 0)]));
      if (status.lastSyncSuccess === false && status.lastSyncMessage) {
        // Câu lỗi từ backend hiện nguyên văn.
        lines.push(t("lastError", [status.lastSyncMessage]));
      }
    } else {
      lines.push(t("lastSyncNever"));
    }

    let color;
    if (!status || !status.hasSession || !status.isValid || status.lastSyncSuccess === false) {
      color = "red";
    } else if (status.lastSyncSuccess === true) {
      color = "green";
    } else {
      color = "gray"; // phiên sống nhưng chưa đồng bộ lần nào
    }

    setState(color, lines.join("\n"));
  }

  function renderError(res) {
    const text = res.error === "need_login" ? t("needLogin") : t("networkError", [res.message || ""]);
    setState("red", text);
    return text;
  }

  // ---------- Gửi tin cho background ----------

  async function send(msg) {
    try {
      const res = await chrome.runtime.sendMessage(msg);
      return res || { ok: false, error: "network", message: "no response" };
    } catch (err) {
      return { ok: false, error: "network", message: String(err && err.message ? err.message : err) };
    }
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Chờ tới khi lastSyncAt khác giá trị ngay sau lúc gửi. So "khác" chứ không so với giờ máy để
  // không phụ thuộc đồng hồ của máy tính và của Pi có khớp nhau hay không.
  async function waitForSync(previousLastSyncAt) {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS);
      const res = await send({ type: "status" });
      if (!res.ok) return res;
      if (res.status && res.status.lastSyncAt && res.status.lastSyncAt !== previousLastSyncAt) {
        return res;
      }
    }
    return { ok: false, error: "timeout" };
  }

  async function run(force) {
    if (busy) return;
    busy = true;
    button.disabled = true;
    setState("gray", t("statusLoading"));

    try {
      const res = await send({ type: "submit", force });

      if (!res.ok) {
        // Báo cả khi tự gửi: thiếu JWT thì người dùng phải mở LifeHub, chỉ chấm đỏ thì dễ bị bỏ qua.
        toast(renderError(res), true);
        return;
      }

      if (res.kind === "status") {
        // Đã gửi trong 10 phút qua: chỉ hiện trạng thái.
        renderStatus(res.status);
        return;
      }

      const result = res.result || {};
      renderStatus(result.status);

      if (!result.syncJobId) {
        // Không đồng bộ: hoặc phiên không đổi, hoặc gửi hỏng (not_logged_in, no_semester, ...).
        const failed = !["saved_new", "revived", "unchanged"].includes(result.outcome);
        if (failed) setState("red", result.message || result.outcome);
        if (force || failed) toast(result.message || result.outcome, failed);
        return;
      }

      setState("gray", t("syncing"));
      toast(t("syncing"), false);

      const previous = result.status ? result.status.lastSyncAt : null;
      const done = await waitForSync(previous);

      if (done.ok) {
        renderStatus(done.status);
        if (done.status.lastSyncSuccess) {
          toast(t("syncDone", [String(done.status.lastSyncCount ?? 0)]), false);
        } else {
          toast(t("syncFailed", [done.status.lastSyncMessage || ""]), true);
        }
      } else if (done.error === "timeout") {
        setState("red", t("syncTimeout"));
        toast(t("syncTimeout"), true);
      } else {
        toast(renderError(done), true);
      }
    } finally {
      busy = false;
      button.disabled = false;
    }
  }

  function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    run(true);
  }

  // ---------- Khởi động ----------

  function start() {
    run(false);
  }

  if (mount()) {
    start();
    return;
  }

  // Header có thể được vẽ sau khi trang tải: chờ logo tối đa 5 giây rồi mới dùng nút nổi.
  const observer = new MutationObserver(() => {
    if (mount()) {
      observer.disconnect();
      clearTimeout(fallbackTimer);
      start();
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  const fallbackTimer = setTimeout(() => {
    observer.disconnect();
    if (!button) {
      mountFloating();
      start();
    }
  }, LOGO_WAIT_MS);
})();
