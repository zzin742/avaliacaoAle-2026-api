# Registro de Mudanças

Documento com tudo que foi alterado no projeto, organizado por tema. No fim há o histórico de commits.

## 1. Identidade do projeto e limpeza

- Removidas todas as referências a "TCC" (o trabalho é uma Avaliação Prática, não um TCC) em README, docs, código, `package.json` e `swagger.js`.
- Containers, redes e volumes renomeados de `tcc_*` para `cursos_*` (`cursos_nginx`, `cursos_app`, `cursos_postgres`, `cursos_redis`, `cursos_public`, `cursos_internal`, `cursos_postgres_data`, `cursos_redis_data`).
- `name` do projeto Docker mudou de `tcc-2026` para `cursos-api`.
- RA do Leandro corrigido para `6325072`.
- Documentação simplificada (sem diagramas ASCII, sem emojis, sem JSDoc pesado), mantendo o conteúdo.
- Corrigida a escrita do Swagger ("avaliacoe" → "avaliacao").

## 2. Subida com um comando (`docker compose up --build`)

- **Problema original:** em outro PC, o comando falhava porque o `docker-compose.yml` exigia copiar arquivos `.env` manualmente.
- **Correção:** os valores de ambiente (banco, JWT, Redis) viraram padrão dentro do próprio `docker-compose.yml`. O projeto sobe sem nenhum `.env` manual. Um `.env` na raiz é opcional, só para sobrescrever segredos.
- **Migrations automáticas:** criado um serviço one-shot `migrate` que roda `migrate` + `seed:if-empty` + `ensure-secret` antes do app subir (`depends_on: service_completed_successfully`). Aparece como `Exited (0)` no `ps` — é esperado.
- O `seed:if-empty` só popula se o banco estiver vazio, preservando dados em reinicializações.
- O serviço `migrate` tem retry (5 tentativas com backoff de 3s) para tolerar blip transitório do Postgres.

## 3. Segurança

- **Segredo JWT fora do repositório:** removido o segredo fixo do código. Agora é gerado aleatoriamente na primeira subida e persistido no volume `cursos_app_secrets`, estável entre reinicializações e compartilhado entre réplicas.
- **IDOR corrigido:** `POST /matriculas` e `POST /avaliacoes` forçam o `usuario_id` a partir do token (aluno não age em nome de outro).
- **RBAC:** escritas de `usuarios`, `categorias` e `cursos` exigem admin (`exigirAdmin`). Aluno recebe 403.
- **Ownership:** PUT/DELETE de matrículas e avaliações exigem ser o dono do registro ou admin (`exigirDonoOuAdmin`).
- **Mass assignment bloqueado:** o CRUD remove `id`, `created_at`, `updated_at` do corpo antes de gravar (cliente não controla a PK).
- **Rate limit no login/register:** 50 req/min por IP, usando Redis (funciona com múltiplas réplicas). Se o Redis cair, não bloqueia o login.
- **HTTPS opcional:** Nginx gera certificado self-signed no build e serve HTTPS na 443. HTTP continua normal na 80, sem redirect (compatível com o que o professor espera). Headers de segurança (HSTS, X-Content-Type-Options).
- **Timeout global** de 20s por request.
- `trust proxy` habilitado para o rate limit usar o IP real do cliente.

## 4. Regras de negócio

- Aluno só se matricula a si mesmo, em curso ativo, sempre começando com `progresso=0` e `status=ativa` (não dá para se auto-certificar).
- Aluno só avalia curso em que está matriculado (senão 422).
- Regras centralizadas em `app/src/controllers/hooks.business.js`.
- No update, usa-se `forcarDono` (só garante o dono, sem resetar progresso/status indevidamente).

## 5. Banco de dados

- **Índices duplicados eliminados:** o schema era criado por três caminhos (migrations + `indexes` nos models + `sequelize.sync()` no seed). Removido o `sync` do seed e os `indexes` dos models. Migrations viraram a fonte única. Caiu de ~37 índices (com triplicatas) para ~20 limpos.
- Limites de tamanho em campos TEXT (`descricao` 5000, `comentario` 2000).
- SQL parametrizado no `command.js` (sem concatenação de string).
- Pool de conexões ajustado (`max:20, min:2`) + `retry: { max: 3 }` + `connectTimeout`.

## 6. Cache (Redis)

- O Redis passou a ser usado de verdade: cache das listagens `GET /<entidade>` com TTL de 30s e header `X-Cache: HIT/MISS`.
- Invalidação por versionamento de chave (`INCR`), sem o anti-padrão `KEYS`.
- A versão inicializa com timestamp para evitar servir dado velho após restart/eviction do Redis.

## 7. Infraestrutura e escala

- Sem `container_name` fixo: o `app` pode escalar (`docker compose up -d --scale app=3`).
- Nginx com `resolver 127.0.0.11` re-resolvendo o nome `app`, distribuindo entre réplicas.
- Header `X-Served-By` mostra qual réplica respondeu.

## 8. Healthcheck

- `/health` virou readiness real: valida o banco (e reporta o cache no objeto `checks`), retorna 503 se o banco estiver indisponível. O cache é opcional (não derruba a saúde).

## 9. Testes

- Suíte de fumaça com 15 testes (`app/tests/smoke.test.js`): health, login, 401, RBAC, IDOR, ownership, regra de negócio, cache, paginação, 404.
- Rodar: `docker compose exec -e BASE_URL=http://localhost:3000 app npm test`.

## 10. Outros

- Cadastro público `POST /register` (cria sempre `tipo: aluno`).
- Erros de FK mais claros no `error.middleware`.
- `deploy.sh` simplificado e corrigido.
- Paginação com teto (`page` até 10000, `limit` até 100).

## Histórico de commits

```
f654610 readme: ajusta texto das portas expostas (80 e 443)
b99164a remove trava do seed para bater com o readme
5438f31 http na porta 80 sem redirect, https opcional na 443, corrige escape do retry do migrate
5e5d9fb hardening final: HTTPS com redirect e HSTS, rate limit no redis, retry de migrate e de conexao, timeout global
b4889d3 hardening: anti mass-assignment, rate limit, cadastro publico, paginacao/limites, fonte unica de update, pool e erros
e31c3f4 segredo jwt persistido fora do repo, balanceamento real no nginx, bloqueio de auto-certificacao, fonte unica de regra e teste corrigido
c53f63a incorpora regras de negocio, ownership e testes; mantem jwt estavel e cache versionado
b128f2a auto-migrate no boot, corrige IDOR, JWT estavel, swagger RBAC, healthcheck readiness, cache sem KEYS e escala
533a0cb correcoes de seguranca, autorizacao, cache e integridade de schema
2fed002 atualiza deploy.sh e troubleshooting
4f9641e projeto sobe sem precisar de .env manual
92ef5aa ajustes no projeto
471c7ea correcao de escrita no swagger
052c326 ajustes na documentacao
f7ccd24 renomeia containers, redes e volumes de tcc para cursos
829f52f simplifica comentarios no codigo
1a3a5f5 alteracao de texto do projeto
```
