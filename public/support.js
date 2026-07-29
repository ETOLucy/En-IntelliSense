const $ = selector => document.querySelector(selector);
const page = document.body.dataset.page || "account";
let challengeId = "";
let currentEmail = "";
let currentTicketId = "";
let accessToken = sessionStorage.getItem("writemelo-access-token") || "";
let turnstileToken = "";

function setStatus(selector, message, error = false) {
  const element = $(selector);
  if (!element) return;
  element.textContent = message;
  element.className = `status${error ? " error" : ""}`;
}

async function api(path, options = {}, authenticated = true) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(authenticated && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers || {}),
    },
  });
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) throw new Error("账号 API 未运行。");
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "请求失败");
  return data;
}

const dateText = value => value ? new Date(Number(value)).toLocaleString() : "-";
const categoryText = { account: "账号", billing: "收费与额度", technical: "技术问题", model: "模型服务", privacy: "隐私与数据", feedback: "建议", other: "其他" };
const statusText = { open: "待处理", waiting_for_user: "等待回复", in_progress: "处理中", resolved: "已解决", closed: "已关闭" };

function showLogin() {
  $("#loginSection")?.classList.remove("hidden");
  $("#pageContent")?.classList.add("hidden");
  $("#signOutButton")?.classList.add("hidden");
}

function showPage() {
  $("#loginSection")?.classList.add("hidden");
  $("#pageContent")?.classList.remove("hidden");
  $("#signOutButton")?.classList.remove("hidden");
}

function desktopStore() {
  return window.pywebview?.api || null;
}

async function loadStore() {
  try {
    const products = await api("/api/store/products");
    const bridge = desktopStore();
    if (!bridge?.store_status) {
      setStatus("#storeStatus", "请在 Microsoft Store 安装版中购买；当前浏览器仅可查看商品。");
      document.querySelectorAll(".store-buy").forEach(button => { button.disabled = true; });
      return;
    }
    const state = await bridge.store_status();
    if (!state.available) {
      setStatus("#storeStatus", state.message || "当前版本未关联 Microsoft Store。", true);
      document.querySelectorAll(".store-buy").forEach(button => { button.disabled = true; });
    } else if (products.purchase_verification !== "available") {
      setStatus("#storeStatus", "商店服务暂未完成服务器验证配置，购买已暂停。", true);
      document.querySelectorAll(".store-buy").forEach(button => { button.disabled = true; });
    } else {
      setStatus("#storeStatus", "购买、续费和退款由 Microsoft Store 处理。");
    }
  } catch (error) {
    setStatus("#storeStatus", error.message, true);
  }
}

async function purchase(productId) {
  const bridge = desktopStore();
  if (!bridge?.purchase_store_product) return;
  setStatus("#storeStatus", "正在打开 Microsoft Store...");
  const result = await bridge.purchase_store_product(productId);
  if (!result.ok) {
    setStatus("#storeStatus", result.status === "cancelled" ? "已取消购买。" : "当前无法完成商店购买。", result.status !== "cancelled");
    return;
  }
  await api("/api/store/purchases/verify", {
    method: "POST",
    body: JSON.stringify({ product_id: productId, store_evidence: result.store_evidence }),
  });
  setStatus("#storeStatus", "购买已验证，额度已经更新。");
  await loadAccount();
}

function renderTickets(items) {
  const list = $("#ticketRows");
  if (!list) return;
  list.replaceChildren(...items.map(ticket => {
    const button = document.createElement("button");
    button.className = "ticket-row";
    button.type = "button";
    const copy = document.createElement("span");
    copy.className = "ticket-copy";
    const subject = document.createElement("strong");
    subject.textContent = ticket.subject;
    const meta = document.createElement("span");
    meta.textContent = `${categoryText[ticket.category] || ticket.category} · ${dateText(ticket.updated_at)}`;
    copy.append(subject, meta);
    const state = document.createElement("span");
    state.className = `ticket-state ${ticket.status}`;
    state.textContent = statusText[ticket.status] || ticket.status;
    const arrow = document.createElement("span");
    arrow.className = "ticket-arrow";
    arrow.textContent = "›";
    button.append(copy, state, arrow);
    button.addEventListener("click", () => openTicket(ticket.id));
    return button;
  }));
  $("#ticketEmpty")?.classList.toggle("hidden", items.length > 0);
}

async function loadTickets() {
  renderTickets((await api("/api/tickets")).tickets);
}

async function loadAccount() {
  try {
    const data = await api("/api/account");
    if ($("#accountEmail")) $("#accountEmail").textContent = data.user.email;
    if ($("#accountPlan")) $("#accountPlan").textContent = data.entitlement?.plan || "Free";
    if ($("#accountUnits")) $("#accountUnits").textContent = data.entitlement ? String(data.entitlement.monthly_units) : "0";
    if ($("#betaPlanUnits")) $("#betaPlanUnits").textContent = data.entitlement ? String(data.entitlement.monthly_units) : "300";
    if ($("#accountExpiry")) $("#accountExpiry").textContent = data.entitlement ? dateText(data.entitlement.period_end) : "-";
    showPage();
    if (page === "plans") await loadStore();
    if (page === "tickets") await loadTickets();
  } catch {
    accessToken = "";
    sessionStorage.removeItem("writemelo-access-token");
    showLogin();
  }
}

async function initializeTurnstile() {
  if (!$("#turnstileContainer")) return;
  try {
    const config = await api("/api/auth/config", {}, false);
    if (!config.turnstile_site_key) return;
    $("#turnstileContainer").classList.remove("hidden");
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.addEventListener("load", () => {
      window.turnstile.render("#turnstileContainer", {
        sitekey: config.turnstile_site_key,
        callback: token => { turnstileToken = token; },
        "expired-callback": () => { turnstileToken = ""; },
      });
    });
    document.head.appendChild(script);
  } catch (error) {
    setStatus("#loginStatus", error.message, true);
  }
}

async function openTicket(id) {
  currentTicketId = id;
  const data = await api(`/api/tickets/${encodeURIComponent(id)}`);
  $("#ticketDetailSubject").textContent = data.ticket.subject;
  $("#ticketDetailMeta").textContent = `${categoryText[data.ticket.category] || data.ticket.category} · ${statusText[data.ticket.status] || data.ticket.status}`;
  const closed = data.ticket.status === "closed";
  $("#replyForm").classList.toggle("hidden", closed);
  $("#closedTicketNote").classList.toggle("hidden", !closed);
  $("#ticketMessages").replaceChildren(...data.messages.map(message => {
    const article = document.createElement("article");
    article.className = "message";
    const head = document.createElement("div");
    head.className = "message-head";
    const author = document.createElement("span");
    author.textContent = message.author_role === "user" ? "我" : "WriteMelo 支持";
    const date = document.createElement("span");
    date.textContent = dateText(message.created_at);
    const body = document.createElement("p");
    body.textContent = message.body;
    head.append(author, date);
    article.append(head, body);
    return article;
  }));
  $("#ticketDialog").showModal();
}

$("#emailForm")?.addEventListener("submit", async event => {
  event.preventDefault();
  currentEmail = $("#email").value.trim();
  setStatus("#loginStatus", "正在发送...");
  try {
    const data = await api("/api/auth/request-code", {
      method: "POST",
      body: JSON.stringify({ email: currentEmail, turnstile_token: turnstileToken }),
    }, false);
    challengeId = data.challenge_id;
    $("#emailForm").classList.add("hidden");
    $("#codeForm").classList.remove("hidden");
    $("#emailStep").classList.remove("active");
    $("#codeStep").classList.add("active");
    $("#authTitle").textContent = "输入验证码";
    $("#authDescription").textContent = `验证码已发送至 ${currentEmail}`;
    setStatus("#loginStatus", data.development_code ? `开发环境验证码：${data.development_code}` : "请检查邮箱，包括垃圾邮件文件夹。");
    $("#code").focus();
  } catch (error) {
    setStatus("#loginStatus", error.message, true);
  }
});

$("#codeForm")?.addEventListener("submit", async event => {
  event.preventDefault();
  try {
    const data = await api("/api/auth/verify-code", {
      method: "POST",
      body: JSON.stringify({ email: currentEmail, challenge_id: challengeId, code: $("#code").value }),
    }, false);
    accessToken = data.access_token;
    sessionStorage.setItem("writemelo-access-token", accessToken);
    await loadAccount();
  } catch (error) {
    setStatus("#loginStatus", error.message, true);
  }
});

$("#changeEmailButton")?.addEventListener("click", () => {
  challengeId = "";
  $("#codeForm").classList.add("hidden");
  $("#emailForm").classList.remove("hidden");
  $("#codeStep").classList.remove("active");
  $("#emailStep").classList.add("active");
  $("#authTitle").textContent = "登录或注册";
  $("#authDescription").textContent = "输入邮箱获取验证码。首次验证成功后将自动创建账号。";
  setStatus("#loginStatus", "");
  $("#email").focus();
});

$("#signOutButton")?.addEventListener("click", async () => {
  try { await api("/api/auth/logout", { method: "POST", body: "{}" }); } catch {}
  accessToken = "";
  sessionStorage.removeItem("writemelo-access-token");
  showLogin();
});

$("#newTicketButton")?.addEventListener("click", () => {
  $("#newTicketForm").reset();
  $("#newTicketDialog").showModal();
});

$("#newTicketForm")?.addEventListener("submit", async event => {
  event.preventDefault();
  try {
    await api("/api/tickets", {
      method: "POST",
      body: JSON.stringify({
        category: $("#ticketCategory").value,
        subject: $("#ticketSubject").value.trim(),
        body: $("#ticketBody").value.trim(),
      }),
    });
    $("#newTicketDialog").close();
    await loadTickets();
  } catch (error) {
    setStatus("#newTicketStatus", error.message, true);
  }
});

$("#replyForm")?.addEventListener("submit", async event => {
  event.preventDefault();
  try {
    await api(`/api/tickets/${encodeURIComponent(currentTicketId)}/messages`, {
      method: "POST",
      body: JSON.stringify({ body: $("#replyBody").value.trim() }),
    });
    $("#replyBody").value = "";
    $("#ticketDialog").close();
    await openTicket(currentTicketId);
  } catch (error) {
    setStatus("#replyStatus", error.message, true);
  }
});

$("#closeTicketButton")?.addEventListener("click", async () => {
  if (!currentTicketId || !window.confirm("关闭后将不能继续回复。确定关闭这个工单吗？")) return;
  setStatus("#replyStatus", "正在关闭...");
  try {
    await api(`/api/tickets/${encodeURIComponent(currentTicketId)}/close`, { method: "POST", body: "{}" });
    $("#ticketDialog").close();
    await loadTickets();
    setStatus("#ticketStatus", "工单已关闭，历史记录仍会保留。");
  } catch (error) {
    setStatus("#replyStatus", error.message, true);
  }
});

$("#archiveTicketButton")?.addEventListener("click", async () => {
  if (!currentTicketId || !window.confirm("确定从你的工单列表移除吗？支持记录仍会按服务与审计要求保留。")) return;
  try {
    await api(`/api/tickets/${encodeURIComponent(currentTicketId)}/archive`, { method: "POST", body: "{}" });
    $("#ticketDialog").close();
    await loadTickets();
    setStatus("#ticketStatus", "工单已从你的列表移除。");
  } catch (error) {
    setStatus("#ticketStatus", error.message, true);
  }
});

$("#restoreButton")?.addEventListener("click", async () => {
  const bridge = desktopStore();
  if (!bridge?.restore_store_purchases) {
    setStatus("#storeStatus", "请在 Microsoft Store 安装版中恢复购买。", true);
    return;
  }
  const result = await bridge.restore_store_purchases();
  setStatus("#storeStatus", result.ok ? "购买记录已恢复。" : "当前无法恢复购买。", !result.ok);
});

document.querySelectorAll(".store-buy").forEach(button => button.addEventListener("click", () => purchase(button.dataset.productId)));
document.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", () => $(`#${button.dataset.close}`)?.close()));

if (accessToken) loadAccount(); else showLogin();
initializeTurnstile();
