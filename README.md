# Differenza — site e agenda

Redesign completo do site do Differenza Espaço de Beleza, com experiência responsiva, solicitação de agendamentos, persistência local e painel administrativo protegido.

## Executar

Requer Node.js 20 ou superior.

```powershell
npm start
```

Abra `http://localhost:3000`. O terminal exibirá o token temporário para acessar `http://localhost:3000/admin.html`.

Para definir um token permanente no PowerShell:

```powershell
$env:DIFFERENZA_ADMIN_TOKEN="troque-por-um-token-seguro"
npm start
```

## Funcionalidades

- Site premium e responsivo com conteúdo real do Differenza
- Filtro de serviços e fluxo de agendamento em modal
- API REST para criar, listar e atualizar solicitações
- Protocolo único e continuação da conversa pelo WhatsApp
- Painel com métricas, filtros e gestão de status
- Persistência em `data/appointments.json`
- Proteções HTTP, limite de payload, rate limiting e validação no servidor

## API

- `GET /api/health`
- `POST /api/appointments`
- `GET /api/appointments` — requer `X-Admin-Token`
- `PATCH /api/appointments/:id` — requer `X-Admin-Token`

Em produção, use HTTPS, configure `DIFFERENZA_ADMIN_TOKEN` e substitua o armazenamento JSON por banco de dados gerenciado.
