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

Um único comando. As migrations e a carga inicial de dados rodam automaticamente na primeira subida (serviço `migrate`), então não há passo manual.

```bash
git clone https://github.com/rafadical/avaliacaoAle-2026-api.git
cd avaliacaoAle-2026-api
docker compose up --build
```

Pronto. A API responde em `http://localhost` e a documentação em `http://localhost/api-docs`. As credenciais do admin (`admin@cursos.com` / `admin123`) já estão disponíveis.

Para subir em segundo plano, use `docker compose up --build -d`.

### Como funciona a inicialização

O serviço `migrate` sobe antes do `app`, roda as migrations, popula o banco apenas se ele estiver vazio (`seed:if-empty`) e gera o segredo do JWT no volume. O `app` só inicia depois que esse serviço termina com sucesso (`depends_on: service_completed_successfully`). Em reinicializações, o seed é pulado e os dados são preservados.

No `docker compose ps` o serviço `migrate` aparece como `Exited (0)` — isso é esperado: ele é um passo único de inicialização que roda e encerra com sucesso, não um serviço de longa duração.

### Entrypoints

A aplicação tem dois entrypoints, na raiz do projeto Node (pasta `app/`, que é a raiz `/app` dentro do container):

- `server.js` — servidor web (HTTP/Express).
- `command.js` — comandos de linha de comando (`migrate`, `seed`, `seed:if-empty`).

## Login e uso do token JWT

Todas as rotas exigem token JWT, exceto `POST /login`. Primeiro faça login para obter o token:

```bash
curl -X POST http://localhost/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@cursos.com","senha":"admin123"}'
```

A resposta traz `{ "token": "...", "usuario": {...} }`. Use o token no cabeçalho `Authorization` das demais rotas:

```bash
curl http://localhost/cursos -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

Sem o token, a API responde `401 Token nao fornecido`.

As rotas de leitura (`GET`) ficam disponíveis para qualquer usuário autenticado. Já as escritas administrativas — criar, editar e remover `usuarios`, `categorias` e `cursos` — exigem um usuário do tipo `admin`; um `aluno` recebe `403`. Matrículas e avaliações podem ser criadas pelo próprio usuário autenticado.

## Migrations pelo command

As migrations rodam automaticamente na subida (serviço `migrate`). Mas o entrypoint CLI `command.js` também permite rodá-las manualmente:

```bash
docker compose exec app node command.js migrate        # cria/atualiza as tabelas
docker compose exec app node command.js seed           # repopula (apaga e recria os dados)
docker compose exec app node command.js seed:if-empty  # popula só se o banco estiver vazio
```

## Detalhamento Técnico

**Otimização de Imagens**

O Dockerfile usa multi-stage build: o estágio `builder` instala as dependências e o estágio `runtime` gera a imagem final baseada em `node:24-alpine`. A ordem das instruções é otimizada para cache — o `package.json` é copiado antes do código-fonte. O `.dockerignore` exclui `node_modules`, `.env`, `.git` e logs.

**Persistência**

Os dados do PostgreSQL ficam no volume nomeado `cursos_postgres_data` e os do Redis em `cursos_redis_data`. Os volumes sobrevivem ao `docker compose down` e só são removidos com `docker compose down -v`.

**Rede e Comunicação**

Duas redes custom bridge: `cursos_public` (só o Nginx) e `cursos_internal` (Nginx, app, postgres e redis). O app, o banco e o Redis não têm portas mapeadas no host. A comunicação entre containers é feita pelo nome do serviço (`postgres:5432`, `redis:6379`), sem IPs fixos.

Os serviços não usam `container_name` fixo, então o `app` pode ser escalado com `docker compose up -d --scale app=3`. O Nginx usa o resolver do DNS interno do Docker (`127.0.0.11`) e re-resolve o nome `app` a cada poucos segundos, distribuindo as requisições entre as réplicas. O header `X-Served-By` na resposta mostra qual réplica respondeu, o que permite verificar o balanceamento.

**Segurança**

As credenciais podem ser sobrescritas por um `.env` que não vai para o repositório. O `JWT_SECRET` não fica no código: se não for definido no ambiente, é gerado aleatoriamente na primeira subida e persistido num volume (`cursos_app_secrets`), permanecendo estável entre reinicializações e compartilhado entre réplicas. O container da aplicação roda com usuário não-root. O banco e o Redis estão na rede interna e são inacessíveis diretamente pelo host. As rotas administrativas são protegidas por verificação de papel (`admin`), e PUT/DELETE de matrículas e avaliações exigem ser o dono do registro ou admin.

**Cache**

O Redis é usado como cache das listagens (`GET /<entidade>`), com expiração de 30 segundos e invalidação automática a cada escrita. O cabeçalho `X-Cache: HIT/MISS` indica se a resposta veio do cache.

## Gestão de Segredos

O `docker-compose.yml` já traz valores padrão para desenvolvimento, então o projeto sobe sem nenhum arquivo `.env`. Para usar credenciais próprias, crie um `.env` na raiz a partir do modelo:

```bash
cp .env.example .env
```

Esse `.env` sobrescreve as senhas do PostgreSQL e o segredo do JWT tanto para o banco quanto para a aplicação. Há também o `app/.env.example` para quem quiser rodar o Node fora do Docker.

**Nunca commite senhas reais no repositório.** Os arquivos `.env` estão no `.gitignore` — só os modelos `.env.example` vão para o repositório.

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

## Testes

Há testes de fumaça cobrindo health, login/JWT, proteção de rota e autorização. Com o ambiente no ar:

```bash
docker compose exec -e BASE_URL=http://localhost:3000 app npm test
```

## Documentação por disciplina

- Desenvolvimento Web: [docs/desenvolvimento-web/README.md](docs/desenvolvimento-web/README.md)
- Banco de Dados: [docs/banco-de-dados/README.md](docs/banco-de-dados/README.md)
- Infraestrutura (Opção A): [docs/infraestrutura/README.md](docs/infraestrutura/README.md)

## Troubleshooting e Limpeza

Se o app não subir, veja `docker compose logs app`. Em caso de estado inconsistente do banco, rode `docker compose down -v` e suba de novo para começar do zero.

Se a porta 80 estiver ocupada, troque `"80:80"` por `"8080:80"` no `docker-compose.yml`.

Para limpar tudo após a avaliação:

```bash
docker compose down -v
docker image rm cursos-api-app
```
