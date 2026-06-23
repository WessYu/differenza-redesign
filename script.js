const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const header = $(".header");
const menuButton = $("#menuButton");
const nav = $("#nav");
const modal = $("#bookingModal");
const bookingForm = $("#bookingForm");
const successState = $("#successState");
const formStatus = $("#formStatus");

const setMinDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  $("#dateInput").min = tomorrow.toISOString().split("T")[0];
};

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
  submit.textContent = "Enviando...";
  formStatus.textContent = "";
  const payload = Object.fromEntries(new FormData(bookingForm));
  try {
    const response = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Não foi possível enviar.");
    bookingForm.hidden = true;
    successState.hidden = false;
    $("#protocol").textContent = result.protocol;
    const message = encodeURIComponent(`Olá! Fiz uma solicitação pelo site do Differenza.\nProtocolo: ${result.protocol}\nServiço: ${payload.service}\nUnidade: ${payload.unit}\nData: ${payload.date} (${payload.period})`);
    $("#whatsappConfirm").href = `https://wa.me/5554981176888?text=${message}`;
    bookingForm.reset();
  } catch (error) {
    formStatus.textContent = error.message.includes("fetch") ? "Servidor indisponível. Inicie o projeto com “npm start” e tente novamente." : error.message;
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
