const tokenInput = document.querySelector("#token");
const loginCard = document.querySelector("#loginCard");
const dashboard = document.querySelector("#dashboard");
const list = document.querySelector("#appointmentList");
const empty = document.querySelector("#empty");
let appointments = [];
let activeFilter = "Todos";

const applyAdminBrandLogo = () => {
  const style = document.createElement("style");
  style.textContent = `
    .admin-logo { gap: 14px; }
    .admin-logo b {
      width: 56px !important;
      height: 56px !important;
      border: 0 !important;
      background: center / contain no-repeat url("assets/logo-mark.png") !important;
      color: transparent !important;
      font-size: 0 !important;
    }
    .admin-logo span { font-size: 14px !important; letter-spacing: .18em; }
    .admin-logo small { font-size: 7px !important; letter-spacing: .26em; }
    @media (max-width: 850px) {
      .admin-logo b { width: 46px !important; height: 46px !important; }
    }
  `;
  document.head.appendChild(style);
  const brandText = document.querySelector(".admin-logo span");
  if (brandText) {
    brandText.childNodes[0].nodeValue = "DIFFERENZA";
    const small = brandText.querySelector("small");
    if (small) small.textContent = "SALÃO E BARBEARIA";
  }
};

const token = () => sessionStorage.getItem("differenza_admin_token") || "";
const formatDate = (value) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(`${value}T12:00:00`));
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));

applyAdminBrandLogo();

function render() {
  document.querySelector("#pendingCount").textContent = appointments.filter((item) => item.status === "Pendente").length;
  document.querySelector("#confirmedCount").textContent = appointments.filter((item) => item.status === "Confirmado").length;
  document.querySelector("#totalCount").textContent = appointments.length;
  const filtered = activeFilter === "Todos" ? appointments : appointments.filter((item) => item.status === activeFilter);
  empty.hidden = filtered.length > 0;
  list.innerHTML = filtered.map((item) => `
    <article class="appointment">
      <div><span class="protocol">${escapeHtml(item.protocol)}</span><h3>${escapeHtml(item.name)}</h3><p><a href="https://wa.me/55${item.phone.replace(/\D/g, "")}" target="_blank">${escapeHtml(item.phone)} ↗</a></p></div>
      <div><p><strong>${escapeHtml(item.service)}</strong><br>${escapeHtml(item.unit)}<br>${item.notes ? escapeHtml(item.notes) : "Sem observações"}</p></div>
      <div><p><strong>${formatDate(item.date)} · ${escapeHtml(item.period)}</strong><br>Recebido em ${new Date(item.createdAt).toLocaleString("pt-BR")}</p></div>
      <select data-id="${item.id}" aria-label="Alterar status de ${escapeHtml(item.name)}">${["Pendente","Confirmado","Concluído","Cancelado"].map((status) => `<option ${item.status === status ? "selected" : ""}>${status}</option>`).join("")}</select>
    </article>`).join("");
  document.querySelectorAll("[data-id]").forEach((select) => select.addEventListener("change", () => updateStatus(select.dataset.id, select.value)));
}

async function loadAppointments() {
  const response = await fetch("/api/appointments", { headers: { "X-Admin-Token": token() } });
  if (!response.ok) throw new Error("Token inválido ou expirado.");
  appointments = await response.json();
  loginCard.hidden = true;
  dashboard.hidden = false;
  render();
}

async function updateStatus(id, status) {
  const response = await fetch(`/api/appointments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json", "X-Admin-Token": token() }, body: JSON.stringify({ status }) });
  if (response.ok) {
    const updated = await response.json();
    appointments = appointments.map((item) => item.id === id ? updated : item);
    render();
  } else alert("Não foi possível atualizar o status.");
}

document.querySelector("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  sessionStorage.setItem("differenza_admin_token", tokenInput.value.trim());
  try { await loadAppointments(); } catch (error) { document.querySelector("#loginError").textContent = error.message; sessionStorage.removeItem("differenza_admin_token"); }
});
document.querySelector("#logout").addEventListener("click", () => { sessionStorage.removeItem("differenza_admin_token"); location.reload(); });
document.querySelector("#refresh").addEventListener("click", loadAppointments);
document.querySelectorAll(".filter").forEach((button) => button.addEventListener("click", () => {
  document.querySelectorAll(".filter").forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  activeFilter = button.dataset.status;
  render();
}));
if (token()) loadAppointments().catch(() => sessionStorage.removeItem("differenza_admin_token"));
