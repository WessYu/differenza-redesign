const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { server, ADMIN_TOKEN, APPOINTMENTS_FILE } = require("../server");

let baseUrl;
let originalData;

test.before(async () => {
  originalData = fs.readFileSync(APPOINTMENTS_FILE, "utf8");
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  fs.writeFileSync(APPOINTMENTS_FILE, originalData, "utf8");
  await new Promise((resolve) => server.close(resolve));
});

test("health check responde com sucesso", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, "ok");
});

test("cria e gerencia um agendamento", async () => {
  const create = await fetch(`${baseUrl}/api/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Cliente Teste", phone: "(54) 99999-9999", service: "Corte feminino", unit: "Guia Lopes", date: "2030-08-20", period: "Tarde", notes: "Teste automatizado" })
  });
  assert.equal(create.status, 201);
  const created = await create.json();
  assert.match(created.protocol, /^DFZ-/);

  const unauthorized = await fetch(`${baseUrl}/api/appointments`);
  assert.equal(unauthorized.status, 401);

  const list = await fetch(`${baseUrl}/api/appointments`, { headers: { "X-Admin-Token": ADMIN_TOKEN } });
  assert.equal(list.status, 200);
  const items = await list.json();
  const item = items.find((entry) => entry.protocol === created.protocol);
  assert.ok(item);

  const update = await fetch(`${baseUrl}/api/appointments/${item.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "X-Admin-Token": ADMIN_TOKEN },
    body: JSON.stringify({ status: "Confirmado" })
  });
  assert.equal(update.status, 200);
  assert.equal((await update.json()).status, "Confirmado");
});

test("rejeita payload incompleto e telefone inválido", async () => {
  const response = await fetch(`${baseUrl}/api/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "A", phone: "x" })
  });
  assert.equal(response.status, 400);
});
