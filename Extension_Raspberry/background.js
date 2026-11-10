// Service worker của extension. Chỉ background mới đọc được cookie HttpOnly (ASP.NET_SessionId)
// và gọi được API LifeHub mà không vướng CORS (nhờ host_permissions).
//
// Tin nhắn nhận vào:
//   { type: "saveToken", token, expiration }   ← content-lifehub.js
//   { type: "submit", force: boolean }          ← content-ueh.js (force = bấm nút "Đồng bộ ngay")
//   { type: "status" }                          ← content-ueh.js (hỏi trạng thái, cũng dùng khi chờ đồng bộ)
//
// Kết quả trả về luôn có dạng một trong:
//   { ok: true, kind: "status", status }
//   { ok: true, kind: "submitted", result }    (result = UehSessionSubmitResultDto)
//   { ok: false, error: "need_login" }
//   { ok: false, error: "network", message }

const API_BASE = "https://app.ptp-phamphong.com/api";
const UEH_URL = "https://student.ueh.edu.vn";

// Tự gửi khi mở trang UEH tối đa 1 lần / 10 phút (Q16). Bấm nút thì luôn gửi.
const AUTO_SUBMIT_INTERVAL_MS = 10 * 60 * 1000;

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  handle(msg)
    .then(sendResponse)
    .catch((err) => sendResponse({ ok: false, error: "network", message: String(err && err.message ? err.message : err) }));
  return true; // trả lời bất đồng bộ
});

async function handle(msg) {
  switch (msg && msg.type) {
    case "saveToken":
      await chrome.storage.local.set({ jwt: msg.token, jwtExpiration: msg.expiration || null });
      return { ok: true };
    case "submit":
      return submit(Boolean(msg.force));
    case "status":
      return getStatus();
    default:
      return { ok: false, error: "network", message: "unknown message" };
  }
}

async function getJwt() {
  const { jwt, jwtExpiration } = await chrome.storage.local.get(["jwt", "jwtExpiration"]);
  if (!jwt) return null;
  if (jwtExpiration && new Date(jwtExpiration) <= new Date()) return null;
  return jwt;
}

async function callApi(path, jwt, init) {
  const res = await fetch(API_BASE + path, {
    ...init,
    headers: {
      ...(init && init.headers),
      Authorization: "Bearer " + jwt
    }
  });

  if (res.status === 401) {
    // Token hết hạn hoặc bị thu hồi: xóa đi để lần sau báo "đăng nhập lại" ngay, không gọi API nữa.
    await chrome.storage.local.remove(["jwt", "jwtExpiration"]);
    return { needLogin: true };
  }

  let body = null;
  try {
    body = await res.json();
  } catch {
    // body rỗng hoặc không phải JSON
  }

  // Submit trả 400 kèm body (invalid_cookie) - vẫn là kết quả hợp lệ, có trường outcome.
  if (!res.ok && !(body && body.outcome)) {
    throw new Error("HTTP " + res.status);
  }

  return { body };
}

async function getStatus() {
  const jwt = await getJwt();
  if (!jwt) return { ok: false, error: "need_login" };

  const r = await callApi("/UehSession/Status", jwt, { method: "GET" });
  if (r.needLogin) return { ok: false, error: "need_login" };
  return { ok: true, kind: "status", status: r.body };
}

async function readUehCookieHeader() {
  const cookies = await chrome.cookies.getAll({ url: UEH_URL });
  return cookies.map((c) => c.name + "=" + c.value).join("; ");
}

async function submit(force) {
  // Thiếu JWT thì dừng TRƯỚC khi đọc cookie: không có đích hợp lệ thì cookie không được rời trình duyệt.
  const jwt = await getJwt();
  if (!jwt) return { ok: false, error: "need_login" };

  if (!force) {
    const { lastSubmitAt } = await chrome.storage.local.get("lastSubmitAt");
    if (lastSubmitAt && Date.now() - lastSubmitAt < AUTO_SUBMIT_INTERVAL_MS) {
      return getStatus();
    }
  }

  const cookieHeader = await readUehCookieHeader();

  const r = await callApi("/UehSession/Submit", jwt, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cookieHeader, forceSync: force })
  });
  if (r.needLogin) return { ok: false, error: "need_login" };

  // Chỉ tính mốc 10 phút khi phiên thật sự được lưu. Gửi hỏng (chưa đăng nhập UEH, UEH lỗi...) thì
  // lần mở trang tiếp theo phải được gửi lại ngay, không bắt chờ.
  const saved = ["saved_new", "revived", "unchanged"];
  if (r.body && saved.includes(r.body.outcome)) {
    await chrome.storage.local.set({ lastSubmitAt: Date.now() });
  }
  return { ok: true, kind: "submitted", result: r.body };
}
