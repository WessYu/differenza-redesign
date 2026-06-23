const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const header = $(".header");
const menuButton = $("#menuButton");
const nav = $("#nav");
const modal = $("#bookingModal");
const bookingForm = $("#bookingForm");
const successState = $("#successState");
const formStatus = $("#formStatus");
const isGitHubPages = location.hostname.endsWith("github.io");

const applyBrandLogo = () => {
  const style = document.createElement("style");
  style.textContent = `
    .logo { gap: 14px; }
    .logo-symbol {
      width: 52px !important;
      height: 52px !important;
      border: 0 !important;
      background: center / contain no-repeat url("assets/logo-mark.png") !important;
      color: transparent !important;
      font-size: 0 !important;
      transform: none !important;
    }
    .logo-symbol::first-letter { transform: none !important; }
    .logo strong { font-size: 18px !important; letter-spacing: .18em; }
    .logo small { font-size: 8px !important; letter-spacing: .28em; }
    .footer .logo-symbol { width: 48px !important; height: 48px !important; }
    @media (max-width: 720px) {
      .logo { gap: 10px; }
      .logo-symbol { width: 42px !important; height: 42px !important; }
      .logo strong { font-size: 14px !important; }
      .logo small { font-size: 7px !important; letter-spacing: .2em; }
    }
  `;
  document.head.appendChild(style);
  $$(".logo strong").forEach((item) => { item.textContent = "DIFFERENZA"; });
  $$(".logo small").forEach((item) => { item.textContent = "SALÃO E BARBEARIA"; });
};

const setMinDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  $("#dateInput").min = tomorrow.toISOString().split("T")[0];
};

const createProtocol = () => `DFZ-${Date.now().toString(36).toUpperCase().slice(-6)}`;

const createWhatsAppMessage = (payload, protocol) => encodeURIComponent(
  `Olá! Quero solicitar um agendamento pelo site do Differenza.\n\n` +
  `Protocolo: ${protocol}\n` +
  `Serviço: ${payload.service}\n` +
  `Unidade: ${payload.unit}\n` +
  `Data: ${payload.date} (${payload.period})\n` +
  `Nome: ${payload.name}\n` +
  `WhatsApp: ${payload.phone}\n` +
  `${payload.notes ? `Observações: ${payload.notes}` : ""}`
);

const showSuccess = (payload, protocol) => {
  bookingForm.hidden = true;
  successState.hidden = false;
  $("#protocol").textContent = protocol;
  $("#whatsappConfirm").href = `https://wa.me/5554981176888?text=${createWhatsAppMessage(payload, protocol)}`;
  bookingForm.reset();
};

applyBrandLogo();

window.addEventListener("scroll", () => header.classList.toggle("scrolled", window.scrollY > 120), { passive: true });

menuButton.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("open");
  document.body.classList.toggle("menu-open", isOpen);
  menuButton.setAttribute("aria-expanded", String(isOpen));
});

$$(".nav a").forEach((link) => link.addEventListener("click", () => {
  nav.classList.remove("open");
  document.body.classList.remove("menu-open");
  menuButton.setAttribute("aria-expanded", "false");
}));

const openBooking = (trigger) => {
  bookingForm.hidden = false;
  successState.hidden = true;
  formStatus.textContent = "";
  if (trigger.dataset.service) $("#serviceSelect").value = trigger.dataset.service;
  if (trigger.dataset.unit) $("#unitSelect").value = trigger.dataset.unit;
  modal.showModal();
  document.body.classList.add("modal-open");
};

$$("[data-open-booking]").forEach((button) => button.addEventListener("click", () => openBooking(button)));
$("#modalClose").addEventListener("click", () => modal.close());
modal.addEventListener("close", () => document.body.classList.remove("modal-open"));
modal.addEventListener("click", (event) => {
  const box = modal.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) modal.close();
});

$$(".category-tabs button").forEach((button) => button.addEventListener("click", () => {
  $$(".category-tabs button").forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  const filter = button.dataset.filter;
  $$("#serviceGrid > article").forEach((card) => card.classList.toggle("hidden", filter !== "todos" && card.dataset.category !== filter));
}));

bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submit = $(".submit-button", bookingForm);
  submit.disabled = true;
  submit.textContent = "Preparando...";
  formStatus.textContent = "";
  const payload = Object.fromEntries(new FormData(bookingForm));

  if (isGitHubPages) {
    const protocol = createProtocol();
    showSuccess(payload, protocol);
    submit.disabled = false;
    submit.innerHTML = "Enviar solicitação <span>→</span>";
    return;
  }

  try {
    const response = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Não foi possível enviar.");
    showSuccess(payload, result.protocol);
  } catch (error) {
    const protocol = createProtocol();
    showSuccess(payload, protocol);
  } finally {
    submit.disabled = false;
    submit.innerHTML = "Enviar solicitação <span>→</span>";
  }
});

$("#newBooking").addEventListener("click", () => {
  successState.hidden = true;
  bookingForm.hidden = false;
});

const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
  if (entry.isIntersecting) {
    entry.target.classList.add("visible");
    observer.unobserve(entry.target);
  }
}), { threshold: 0.12 });

$$(".reveal").forEach((element) => observer.observe(element));
$("#year").textContent = new Date().getFullYear();
setMinDate();
