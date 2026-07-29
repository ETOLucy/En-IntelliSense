const localWritingUrl = location.hostname === "127.0.0.1" || location.hostname === "localhost"
  ? `${location.protocol}//${location.hostname}:8000/`
  : "index.html";

document.querySelectorAll("[data-writing-link]").forEach(link => {
  link.href = localWritingUrl;
});
