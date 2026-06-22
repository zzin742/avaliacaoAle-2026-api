# Plataforma de Cursos Online — API REST

Avaliação Prática do 2º Bimestre 2026 — UniFAAT — Análise e Desenvolvimento de Sistemas

**Caminho escolhido: Opção A — Docker / Orquestração Local**

## Integrantes

| RA | Nome |
|----|------|
| 3225002 | José Henrique Teixeira Luiz |
| 6325072 | Leandro Duarte Gulias |
| 6322006 | Rafael Nogueira Maruca |

## Sobre o projeto

API REST de uma plataforma de cursos online com autenticação JWT. Permite cadastrar usuários, criar cursos por categoria, matricular alunos e registrar avaliações.

A infraestrutura usa Docker com quatro containers: Nginx na porta 80 como proxy reverso, Node.js com Express, PostgreSQL 17 e Redis 7. O banco e o cache ficam em rede interna isolada, sem acesso externo direto.

## Pré-requisitos

- Docker Desktop com Compose v2 (Windows/Mac) ou Docker Engine (Linux)
- Git

Não é necessário instalar Node.js, PostgreSQL ou Redis na máquina — tudo roda nos containers.

## Como rodar

```bash
git clone https://github.com/rafadical/avaliacaoAle-2026-api.git
cd avaliacaoAle-2026-api

cp .env.example .env
cp app/.env.example app/.env
```

Subir com o script de deploy (recomendado):

```bash
bash deploy.sh --seed
```

Ou manualmente:

```bash
docker compose up --build -d
docker compose exec app node command.js migrate
docker compose exec app node command.js seed
```

## Detalhamento Técnico

**Otimização de Imagens**

O Dockerfile usa multi-stage build: o estágio `builder` instala as dependências e o estágio `runtime` gera a imagem final baseada em `node:24-alpine`. A ordem das instruções é otimizada para cache — o `package.json` é copiado antes do código-fonte. O `.dockerignore` exclui `node_modules`, `.env`, `.git` e logs.

**Persistência**

Os dados do PostgreSQL ficam no volume nomeado `cursos_postgres_data` e os do Redis em `cursos_redis_data`. Os volumes sobrevivem ao `docker compose down` e só são removidos com `docker compose down -v`.

**Rede e Comunicação**

Duas redes custom bridge: `cursos_public` (só o Nginx) e `cursos_internal` (Nginx, app, postgres e redis). O app, o banco e o Redis não têm portas mapeadas no host. A comunicação entre containers é feita pelo nome do serviço (`postgres:5432`, `redis:6379`), sem IPs fixos.

**Segurança**

As credenciais ficam no `.env` que não vai para o repositório. O container da aplicação roda com usuário não-root. O banco e o Redis estão na rede interna e são inacessíveis diretamente pelo host.

## Gestão de Segredos

As variáveis de ambiente ficam em dois arquivos `.env` que **não são versionados**. Copie os templates antes de subir:

```bash
cp .env.example .env
cp app/.env.example app/.env
```

O `.env` na raiz define as credenciais do PostgreSQL usadas pelo `docker-compose.yml`. O `app/.env` define a configuração da aplicação Node (host do banco, JWT secret, etc.).

**Nunca commite senhas reais no repositório.** Os arquivos `.env` estão no `.gitignore`.

## Evidências e Validação

URL de acesso: `http://localhost`

A forma mais direta de ver o isolamento é o `docker compose ps`. Só o nginx mostra `0.0.0.0:80->80`. Postgres, redis e app aparecem só com a porta interna (ex: `5432/tcp`), sem `0.0.0.0` na frente — ou seja, não estão expostos no host.

```bash
docker compose ps
curl http://localhost/health
docker network inspect cursos_internal
```

Para tentar acessar o banco direto do host (deve falhar):

No Git Bash, Linux ou Mac:

```bash
curl -s --max-time 2 http://localhost:5432 || echo "POSTGRES inacessivel do host (correto)"
```

No PowerShell (Windows):

```powershell
Test-NetConnection localhost -Port 5432 -InformationLevel Quiet
```

O retorno `False` no PowerShell significa que a porta está fechada — que é o esperado.

Swagger: `http://localhost/api-docs`

## Documentação por disciplina

- Desenvolvimento Web: [docs/desenvolvimento-web/README.md](docs/desenvolvimento-web/README.md)
- Banco de Dados: [docs/banco-de-dados/README.md](docs/banco-de-dados/README.md)
- Infraestrutura (Opção A): [docs/infraestrutura/README.md](docs/infraestrutura/README.md)

## Troubleshooting e Limpeza

Se o app não subir, veja `docker compose logs app`. O erro mais comum é senha divergente no `.env` — rode `docker compose down -v` e suba de novo.

Se a porta 80 estiver ocupada, troque `"80:80"` por `"8080:80"` no `docker-compose.yml`.

Para limpar tudo após a avaliação:

```bash
docker compose down -v
docker image rm cursos-api-app
```
