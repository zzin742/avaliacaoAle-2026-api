# Infraestrutura de Sistemas Web — Opção A (Docker)

## 2.1 Dockerfile

O Dockerfile usa multi-stage build com dois estágios. O estágio `builder` instala as dependências de produção com `npm install --omit=dev`. O estágio `runtime` é a imagem final baseada em `node:24-alpine` com um usuário não-root criado via `addgroup`/`adduser`.

A ordem das instruções otimiza o cache: `package.json` é copiado e as dependências instaladas antes do código-fonte. Assim, mudar o código não invalida o cache do `npm install`.

O `.dockerignore` exclui `node_modules`, `.env`, `.git`, logs e a pasta `docs`.

## 2.2 docker-compose.yml

Quatro serviços: `nginx`, `app`, `postgres`, `redis`. Todos com `restart: unless-stopped` e healthcheck configurado. O `depends_on` com `condition: service_healthy` garante que o app só inicia depois que o banco e o Redis passam no healthcheck, e o Nginx só sobe depois do app.

## 2.3 Redes

Duas redes custom bridge: `cursos_public` (só o Nginx) e `cursos_internal` (Nginx + app + postgres + redis). O app, Postgres e Redis não têm `ports:` mapeadas no host — apenas o Nginx expõe a porta 80.

A comunicação entre containers usa o nome do serviço como DNS (`postgres:5432`, `redis:6379`), sem IPs estáticos.

## 2.4 Persistência

Volumes nomeados `cursos_postgres_data` e `cursos_redis_data`. Os dados sobrevivem ao `docker compose down` e só são removidos com `docker compose down -v`.

## Evidências (Seção 6 do guia)

### Código-fonte
- `app/Dockerfile`
- `docker-compose.yml`
- `nginx/nginx.conf`
- `deploy.sh`

### Prova de domínio CLI

```bash
docker compose ps
docker network inspect cursos_internal
docker compose exec app sh -c 'getent hosts postgres'
```

### Isolamento de rede

```bash
curl --max-time 2 http://localhost:5432 || echo "postgres inacessivel do host"
curl --max-time 2 http://localhost:6379 || echo "redis inacessivel do host"
curl --max-time 2 http://localhost:3000 || echo "node inacessivel do host"
curl http://localhost/health
```

### Persistência

```bash
docker compose exec postgres psql -U cursos_user -d cursos_db -t -c 'SELECT COUNT(*) FROM usuarios;'
docker compose down
docker compose up -d
docker compose exec postgres psql -U cursos_user -d cursos_db -t -c 'SELECT COUNT(*) FROM usuarios;'
```

### Automação — deploy.sh

O `deploy.sh` sobe toda a infraestrutura em um comando, cobrindo: verificação do Docker, cópia dos `.env`, build da imagem, `docker compose up -d`, aguarda healthcheck e roda migrations.

```bash
bash deploy.sh --seed
```

## Matriz de avaliação

| Critério | Peso | Como atende |
|----------|------|-------------|
| Eficiência da Imagem | 20% | Multi-stage + Alpine + `.dockerignore` + cache ordering |
| Arquitetura de Rede | 25% | Custom bridge com DNS interno, banco sem acesso externo |
| Persistência de Dados | 20% | Named volumes (`cursos_postgres_data`, `cursos_redis_data`) |
| Segurança | 20% | Redes isoladas, usuário não-root no container, `.env` fora do repo |
| Automação (CI/CD) | 15% | `deploy.sh` automatiza build, up, healthcheck e migrations |
