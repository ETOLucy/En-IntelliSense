const $ = selector => document.querySelector(selector);
let localSecret = "";
let currentTicketId = "";
let currentUserId = "";
let currentUsers = [];
let activeView = "";
const loadedViews = new Set();

function setStatus(selector, message, error = false) {
  const element = $(selector);
  element.textContent = message;
  element.className = `status${error ? " error" : ""}`;
}

async function adminApi(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(localSecret ? { "X-Admin-Secret": localSecret } : {}),
      ...(options.headers || {}),
    },
  });
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(`管理员 API 未运行。请通过账户调试服务打开此页面，当前地址：${location.origin}`);
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "管理员请求失败");
  return data;
}

function dateText(value) {
  return value ? new Date(Number(value)).toLocaleString() : "-";
}

function appendCells(row, values) {
  for (const value of values) {
    const cell = document.createElement("td");
    cell.textContent = value ?? "-";
    row.appendChild(cell);
  }
}

function renderUsers(items) {
  currentUsers = items;
  $("#userRows").replaceChildren(...items.map(user => {
    const row = document.createElement("tr");
    const identity = document.createElement("td");
    const email = document.createElement("span");
    email.className = "user-email";
    email.textContent = user.email;
    const id = document.createElement("span");
    id.className = "user-id";
    id.textContent = user.id;
    identity.append(email, id);
    row.append(identity);
    appendCells(row, [
      user.status === "active" ? "可用" : "暂停",
      user.plan || "-",
      `${user.used_units ?? "-"} / ${user.monthly_units ?? "-"}`,
      user.requests_per_minute ? `${user.requests_per_minute}/分钟` : "-",
      user.device_limit,
      dateText(user.last_login_at),
    ]);
    row.addEventListener("click", () => openUser(user.id));
    return row;
  }));
  $("#userEmpty").classList.toggle("hidden", items.length > 0);
  $("#metricUsers").textContent = String(items.length);
  $("#metricActiveUsers").textContent = String(items.filter(user => user.status === "active").length);
}

async function loadUsers() {
  const params = new URLSearchParams();
  const query = $("#userSearchInput").value.trim();
  if (query) params.set("q", query);
  const data = await adminApi(`/api/admin/users?${params}`);
  renderUsers(data.users);
  setStatus("#userStatus", `共 ${data.users.length} 个用户`);
}

function openUser(id) {
  const user = currentUsers.find(item => item.id === id);
  if (!user) return;
  currentUserId = id;
  $("#adminUserId").textContent = id;
  $("#adminUserEmail").textContent = user.email;
  $("#adminUserStatus").value = user.status;
  $("#adminUserPlan").value = user.plan || "beta";
  $("#adminUserUnits").value = user.monthly_units ?? 300;
  $("#adminUserRpm").value = user.requests_per_minute ?? 15;
  $("#adminUserDevices").value = user.device_limit ?? 2;
  setStatus("#adminUserSaveStatus", "");
  $("#adminUserDialog").showModal();
}

function renderProviders(items, activeProvider) {
  $("#providerRows").replaceChildren(...items.map(provider => {
    const row = document.createElement("article");
    row.className = `provider-row${provider.id === activeProvider ? " active" : ""}`;
    const head = document.createElement("header");
    const name = document.createElement("strong");
    name.textContent = provider.label;
    const state = document.createElement("span");
    state.textContent = provider.id === activeProvider ? "当前线路" : provider.configured ? "已配置" : "未配置";
    head.append(name, state);
    const detail = document.createElement("p");
    const region = provider.region_policy === "china" ? "中国大陆" : "国际支持地区";
    const cost = provider.cost_tier === "low" ? "低成本" : provider.cost_tier === "low-to-medium" ? "较低成本" : "标准成本";
    detail.textContent = provider.configured
      ? `${region} · ${cost} · ${provider.endpoint_host} / ${provider.model}`
      : `${region} · ${cost} · 请先通过 Worker Secrets 配置`;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = provider.id === activeProvider ? "正在使用" : "切换到此线路";
    button.disabled = provider.id === activeProvider || !provider.configured;
    button.addEventListener("click", () => activateProvider(provider.id));
    row.append(head, detail, button);
    return row;
  }));
}

async function loadProviders() {
  const data = await adminApi("/api/admin/model-providers");
  renderProviders(data.providers, data.active_provider);
  const active = data.providers.find(item => item.id === data.active_provider);
  setStatus("#providerStatus", `当前线路：${active?.label || data.active_provider}`);
  $("#metricProviders").textContent = String(data.providers.filter(item => item.configured).length);
}

async function activateProvider(providerId) {
  setStatus("#providerStatus", "正在切换...");
  try {
    await adminApi("/api/admin/model-providers", {
      method: "PATCH",
      body: JSON.stringify({ provider_id: providerId }),
    });
    await loadProviders();
  } catch (error) {
    setStatus("#providerStatus", error.message, true);
  }
}

async function loadOrders() {
  const data = await adminApi("/api/admin/orders");
  $("#orderRows").replaceChildren(...data.orders.map(order => {
    const row = document.createElement("tr");
    appendCells(row, [
      order.email,
      order.store_product_id,
      order.purchase_kind,
      order.verification_status,
      order.store_transaction_id,
      dateText(order.created_at),
    ]);
    return row;
  }));
  $("#orderEmpty").classList.toggle("hidden", data.orders.length > 0);
  setStatus("#orderStatus", `共 ${data.orders.length} 条订单记录`);
}

function renderQueue(items) {
  $("#queueRows").replaceChildren(...items.map(ticket => {
    const row = document.createElement("tr");
    appendCells(row, [
      ticket.subject,
      ticket.email,
      ticket.category,
      ticket.priority,
      ticket.status,
      dateText(ticket.updated_at),
    ]);
    row.addEventListener("click", () => openTicket(ticket.id));
    return row;
  }));
  $("#queueEmpty").classList.toggle("hidden", items.length > 0);
}

async function loadQueue() {
  setStatus("#queueStatus", "正在加载...");
  const params = new URLSearchParams();
  if ($("#searchInput").value.trim()) params.set("q", $("#searchInput").value.trim());
  if ($("#statusFilter").value) params.set("status", $("#statusFilter").value);
  const data = await adminApi(`/api/admin/tickets?${params}`);
  renderQueue(data.tickets);
  setStatus("#queueStatus", `共 ${data.tickets.length} 个工单`);
  $("#metricOpenTickets").textContent = String(data.tickets.filter(ticket => !["resolved", "closed"].includes(ticket.status)).length);
}

async function loadAudit() {
  const data = await adminApi("/api/admin/audit");
  $("#auditRows").replaceChildren(...data.events.map(event => {
    const row = document.createElement("tr");
    appendCells(row, [
      event.actor,
      event.action,
      event.target,
      event.outcome,
      event.source_ip || "-",
      dateText(event.created_at),
    ]);
    return row;
  }));
  $("#auditEmpty").classList.toggle("hidden", data.events.length > 0);
  setStatus("#auditStatus", `最近 ${data.events.length} 条操作记录`);
}

const viewLoaders = {
  users: loadUsers,
  providers: loadProviders,
  orders: loadOrders,
  tickets: loadQueue,
  audit: loadAudit,
};

async function loadView(view, force = false) {
  if (!force && loadedViews.has(view)) return;
  try {
    await viewLoaders[view]();
    loadedViews.add(view);
    $("#localAuthSection").classList.add("hidden");
  } catch (error) {
    const statusSelector = { users: "#userStatus", providers: "#providerStatus", orders: "#orderStatus", tickets: "#queueStatus", audit: "#auditStatus" }[view];
    setStatus(statusSelector, error.message, true);
    if (!localSecret) $("#localAuthSection").classList.remove("hidden");
  }
}

function selectView(view, updateHash = true) {
  const nextView = viewLoaders[view] ? view : "users";
  activeView = nextView;
  document.querySelectorAll("[data-admin-view]").forEach(link => {
    const active = link.dataset.adminView === nextView;
    link.classList.toggle("active", active);
    link.setAttribute("aria-current", active ? "page" : "false");
  });
  document.querySelectorAll("[data-admin-panel]").forEach(panel => {
    panel.hidden = panel.dataset.adminPanel !== nextView;
  });
  if (updateHash && location.hash !== `#${nextView}`) history.replaceState(null, "", `#${nextView}`);
  loadView(nextView);
}

function renderMessages(messages) {
  $("#adminMessages").replaceChildren(...messages.map(message => {
    const article = document.createElement("article");
    article.className = "message";
    const head = document.createElement("div");
    head.className = "message-head";
    const author = document.createElement("span");
    author.textContent = message.author_role === "user" ? "用户" : "WriteMelo 支持";
    const date = document.createElement("span");
    date.textContent = dateText(message.created_at);
    const body = document.createElement("p");
    body.textContent = message.body;
    head.append(author, date);
    article.append(head, body);
    return article;
  }));
}

function updateAdminReplyState() {
  const closed = $("#adminTicketStatus").value === "closed";
  $("#adminReply").disabled = closed;
  if (closed) $("#adminReply").value = "";
  $("#adminReplyNote").textContent = closed
    ? "已关闭工单不能继续回复。如需联系用户，请先将状态改为“处理中”或“等待用户”。"
    : "可以只更新状态或优先级；填写回复后会同时发送给用户。";
  $("#saveAdminTicket").textContent = $("#adminReply").value.trim() ? "保存并发送" : "保存更改";
}

async function openTicket(id) {
  currentTicketId = id;
  setStatus("#adminTicketSaveStatus", "");
  try {
    const data = await adminApi(`/api/admin/tickets/${encodeURIComponent(id)}`);
    $("#adminTicketMeta").textContent = `${data.ticket.id} / ${data.ticket.category}`;
    $("#adminTicketSubject").textContent = data.ticket.subject;
    $("#adminTicketEmail").textContent = data.ticket.email;
    $("#adminTicketStatus").value = data.ticket.status;
    $("#adminTicketPriority").value = data.ticket.priority;
    $("#adminReply").value = "";
    updateAdminReplyState();
    renderMessages(data.messages);
    $("#adminTicketDialog").showModal();
  } catch (error) {
    setStatus("#queueStatus", error.message, true);
  }
}

document.querySelectorAll("[data-admin-view]").forEach(link => link.addEventListener("click", event => {
  event.preventDefault();
  selectView(link.dataset.adminView);
}));
window.addEventListener("hashchange", () => selectView(location.hash.slice(1), false));
$("#unlockButton").addEventListener("click", async () => {
  localSecret = $("#localAdminSecret").value;
  loadedViews.clear();
  await loadView(activeView, true);
  $("#localAdminSecret").value = "";
});
$("#refreshButton").addEventListener("click", () => loadView(activeView, true));
$("#filterForm").addEventListener("submit", event => {
  event.preventDefault();
  loadView("tickets", true);
});
$("#userFilterForm").addEventListener("submit", event => {
  event.preventDefault();
  loadView("users", true);
});
$("#closeAdminUser").addEventListener("click", () => $("#adminUserDialog").close());
$("#cancelAdminUser").addEventListener("click", () => $("#adminUserDialog").close());
$("#adminUserForm").addEventListener("submit", async event => {
  event.preventDefault();
  setStatus("#adminUserSaveStatus", "正在保存...");
  try {
    await adminApi(`/api/admin/users/${encodeURIComponent(currentUserId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: $("#adminUserStatus").value,
        plan: $("#adminUserPlan").value,
        monthly_units: Number($("#adminUserUnits").value),
        requests_per_minute: Number($("#adminUserRpm").value),
        device_limit: Number($("#adminUserDevices").value),
      }),
    });
    $("#adminUserDialog").close();
    await loadView("users", true);
    setStatus("#userStatus", "用户策略已更新。");
  } catch (error) {
    setStatus("#adminUserSaveStatus", error.message, true);
  }
});
$("#closeAdminTicket").addEventListener("click", () => $("#adminTicketDialog").close());
$("#cancelAdminTicket").addEventListener("click", () => $("#adminTicketDialog").close());
$("#adminTicketStatus").addEventListener("change", updateAdminReplyState);
$("#adminReply").addEventListener("input", updateAdminReplyState);
$("#adminTicketForm").addEventListener("submit", async event => {
  event.preventDefault();
  setStatus("#adminTicketSaveStatus", "正在保存...");
  try {
    await adminApi(`/api/admin/tickets/${encodeURIComponent(currentTicketId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: $("#adminTicketStatus").value,
        priority: $("#adminTicketPriority").value,
        message: $("#adminReply").value.trim(),
      }),
    });
    $("#adminTicketDialog").close();
    await loadView("tickets", true);
    setStatus("#queueStatus", "工单已更新。");
  } catch (error) {
    setStatus("#adminTicketSaveStatus", error.message, true);
  }
});

selectView(location.hash.slice(1), false);
