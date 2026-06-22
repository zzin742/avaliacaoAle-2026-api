# Guia de Estudo — Avaliação Prática 2º Bimestre 2026

> Documento para **José Henrique**, **Leandro** e **Rafael** estudarem **antes da apresentação**.
> Cobre o projeto inteiro do nível "o que é" até "como responder se o professor perguntar X".
> **Leia tudo pelo menos 1 vez.** Depois decoram só as seções da matéria que cada um vai apresentar.

---

## Índice

1. [Visão geral em 60 segundos](#1-visão-geral-em-60-segundos)
2. [Fluxo completo de uma requisição](#2-fluxo-completo-de-uma-requisição)
3. [Stack tecnológica — o que é cada coisa](#3-stack-tecnológica--o-que-é-cada-coisa-e-por-quê)
4. [Banco de Dados (matéria BD)](#4-banco-de-dados-matéria-bd)
5. [Desenvolvimento Web (matéria DW)](#5-desenvolvimento-web-matéria-dw)
6. [Infraestrutura (matéria Infra — Opção A Docker)](#6-infraestrutura-matéria-infra--opção-a-docker)
7. [Perguntas que o professor pode fazer (FAQ defesa)](#7-perguntas-que-o-professor-pode-fazer-faq-defesa)
8. [Comandos pra demonstrar AO VIVO](#8-comandos-pra-demonstrar-ao-vivo)
9. [Divisão sugerida da apresentação](#9-divisão-sugerida-da-apresentação)
10. [Checklist final antes de gravar o vídeo](#10-checklist-final-antes-de-gravar-o-vídeo)

---

## 1. Visão geral em 60 segundos

**O que o sistema faz:**
É uma **API REST de uma plataforma de cursos online**. Permite cadastrar usuários (alunos e admins), criar cursos organizados por categoria, matricular alunos em cursos (relação N:N), e receber avaliações de 1 a 5 estrelas.

**Quem usa o sistema:**
Outros sistemas/aplicativos (web ou mobile) consomem essa API via HTTP — não tem tela. É uma **API pura**.

**O que entregamos:**
Um único projeto que **mata as 3 disciplinas do bimestre** ao mesmo tempo:
- **Desenvolvimento Web** — APIs REST com Node + Express + Sequelize + JWT + Swagger.
- **Banco de Dados** — 5 tabelas Postgres normalizadas com FKs, índices, queries críticas e seed de 203 registros.
- **Infraestrutura** — 4 containers Docker (Nginx + Node + Postgres + Redis) com redes isoladas, volumes nomeados e Dockerfile multi-stage.

**Como executa:**
```bash
docker compose up --build -d
docker compose exec app node command.js migrate
docker compose exec app node command.js seed
# pronto: http://localhost
```

---

## 2. Fluxo completo de uma requisição

Quando alguém faz `curl http://localhost/cursos` com um token JWT, isto acontece:

```
1. BROWSER/CLIENTE
   GET http://localhost/cursos
   Header: Authorization: Bearer eyJhbGc...
        │
        │ Porta 80 do host (única porta exposta!)
        ▼
2. NGINX (container cursos_nginx)
   - Recebe a requisição na porta 80
   - Vê a rota "/cursos" → faz proxy_pass http://app:3000/cursos
   - "app" é o nome do serviço, resolvido pelo DNS interno do Docker
        │
        ▼
3. NODE.JS / EXPRESS (container cursos_app, porta 3000, sem exposição no host)
   a) Middleware "log" → loga método, URL, timestamp
   b) Middleware "autenticarJWT" → verifica o token
      - Se inválido → retorna 401 e para tudo aqui
      - Se válido → coloca os dados do usuário em req.usuario
   c) Router → rota "GET /cursos" → controller crud.list (Curso)
        │
        ▼
4. SEQUELIZE (ORM dentro do container app)
   - Traduz Model.findAndCountAll() em SQL puro
   - Abre conexão TCP com postgres:5432 (DNS interno)
        │
        ▼
5. POSTGRESQL (container cursos_postgres, porta 5432, sem exposição no host)
   - Executa: SELECT * FROM cursos INNER JOIN categorias ... LIMIT 20
   - Usa os índices (cursos_categoria_idx, etc) pra ser rápido
   - Retorna os dados pro Sequelize
        │
        ▼
6. EXPRESS retorna JSON
   - Sequelize hidrata os objetos Curso com categoria embutida
   - res.json({ dados: [...], paginacao: {...} })
        │
        ▼
7. NGINX devolve a resposta JSON pro cliente
```

**Pontos importantes pra falar na defesa:**
- O cliente **nunca fala direto com a aplicação Node**. Só com o Nginx.
- O Nginx **nunca fala direto com o Postgres**. Só com a aplicação.
- O Postgres e o Redis **só existem dentro da rede interna do Docker** — invisíveis do host e da internet.

---

## 3. Stack tecnológica — o que é cada coisa e por quê

### Node.js 24
Runtime JavaScript pra rodar código fora do navegador (no servidor). Versão 24 é a mais recente LTS, com suporte nativo a recursos modernos do JS (top-level await, fetch nativo, etc).

### Express
**Framework HTTP** mais popular do Node. Cuida de: roteamento, middlewares, parsing de JSON, envio de respostas. Sem ele teríamos que escrever `http.createServer` na mão.

**O básico:**
```javascript
app.get('/rota', (req, res) => res.json({ ok: true }))
```

### Sequelize
**ORM (Object-Relational Mapper)**. Permite manipular tabelas SQL como se fossem classes JavaScript:

```javascript
// Em vez de:  INSERT INTO cursos (titulo) VALUES ('X');
Curso.create({ titulo: 'X' })

// Em vez de:  SELECT * FROM cursos WHERE id = 1;
Curso.findByPk(1)
```

**Vantagens:** segurança contra SQL injection, migrations, validações declarativas, hooks (lifecycle).
**Desvantagens:** abstração tem custo de performance; em queries complexas às vezes vale SQL puro.

### PostgreSQL 17
**SGBD relacional** open-source, robusto, ACID, com índices eficientes e suporte nativo a ENUMs e CHECK constraints. Padrão de mercado pra aplicações sérias.

### Redis 7
**Banco em memória chave-valor**. Aqui usamos como **cache** (atende o critério "3 serviços: App, DB e Cache" da matéria de Infra). Em produção real, salvaria queries quentes (ex: top 10 cursos) por alguns segundos.

### Nginx
**Servidor HTTP de alta performance** usado como **proxy reverso**. Recebe a requisição do mundo externo e encaminha pra aplicação Node. Em produção real, também faz: cache de resposta, terminação SSL, rate limiting, compressão gzip.

### Docker + Docker Compose
**Docker** = ferramenta pra empacotar aplicação + dependências num "container" leve e portátil.
**Compose** = ferramenta pra orquestrar **vários containers juntos** com um único arquivo (`docker-compose.yml`).

### JWT (JSON Web Token)
Forma de autenticação **stateless** (o servidor não precisa guardar sessão). O token tem 3 partes separadas por ponto:

```
HEADER.PAYLOAD.SIGNATURE
eyJhbGciOi.eyJpZCI6MS.2897cnvtToE8TT6DpxpfO96GU_d5
```

- **Header** — algoritmo (HS256) e tipo (JWT)
- **Payload** — dados do usuário (`{ id, email, tipo, exp }`)
- **Signature** — `HMAC_SHA256(header + payload, JWT_SECRET)` — garante que ninguém adulterou

**O servidor confia no token porque:** se alguém modificar o payload, a assinatura não bate mais (porque ele não tem o `JWT_SECRET`).

### bcrypt
Algoritmo de **hash de senha com salt embutido** e custo configurável. NÃO confundir com criptografia (que é reversível) — hash é **uma via só**.

**Como funciona:**
1. Gera um salt aleatório.
2. Combina salt + senha do usuário.
3. Aplica milhares de iterações de hash (custo 10 = 1024 iterações).
4. Salva no banco: `$2b$10$<salt><hash>` — tudo numa string só.

**Por que não MD5/SHA-256?** Esses são rápidos demais — atacante consegue bilhões de tentativas por segundo. Bcrypt é **lento de propósito** (~100ms por hash), inviabilizando força bruta.

### Swagger / OpenAPI
**Documentação interativa de API**. Gera uma tela web onde dá pra ver todos os endpoints, schemas, e até **testar as requisições direto no navegador**. Padrão de mercado pra documentar REST APIs.

---

## 4. Banco de Dados (matéria BD)

### 4.1 As 5 tabelas

| Tabela | Função | Atributos-chave |
|--------|--------|-----------------|
| `usuarios` | Cadastro de alunos/admins | email UNIQUE, senha bcrypt, tipo ENUM(aluno,admin) |
| `categorias` | Agrupar cursos por tema | nome UNIQUE |
| `cursos` | Catálogo | titulo, preco, carga_horaria, categoria_id (FK), ativo |
| `matriculas` | **PIVÔ N:N** usuários↔cursos | usuario_id+curso_id UNIQUE, status, progresso 0..100 |
| `avaliacoes` | Notas dos cursos | usuario_id+curso_id UNIQUE, nota 1..5 |

### 4.2 Por que SQL e não NoSQL?

- O domínio tem **relacionamentos explícitos** (1:N entre categoria/cursos, N:N entre usuários/cursos via matrículas).
- Precisamos de **integridade referencial** (não pode existir matrícula apontando pra usuário inexistente).
- Consultas analíticas (top cursos, média por categoria) são naturais em SQL com JOIN.
- Volume baixo/médio — não justifica complexidade horizontal do NoSQL.
- Transações ACID são importantes (ex: matricular + criar avaliação juntos).

### 4.3 O que é uma TABELA PIVÔ?

É a tabela usada pra resolver um relacionamento **N:N (muitos pra muitos)** num banco relacional, que não consegue representar N:N diretamente.

Exemplo no nosso projeto:
- Um **usuário** pode se matricular em **vários cursos**.
- Um **curso** pode ter **vários usuários** matriculados.

Não dá pra colocar `cursos_id` em `usuarios` (seria lista) nem o contrário. Então criamos uma terceira tabela `matriculas` com 2 FKs: uma pra `usuarios`, outra pra `cursos`. **Cada linha de `matriculas` representa UMA relação entre UM usuário e UM curso.**

Como nossa pivô tem **atributos próprios** (`status`, `progresso`, `data_matricula`), ela é uma **pivô com atributos** (não pura). Isso é importante pra falar na defesa.

### 4.4 Normalização

#### 1FN — Forma Normal Atômica
Cada coluna armazena um único valor (não tem lista, JSON aninhado, valores separados por vírgula).
✅ Atendemos: `usuarios.email` é uma string só, não uma lista.

#### 2FN — Sem dependência parcial
Todas as colunas não-chave dependem da chave primária INTEIRA.
✅ Atendemos automaticamente porque toda PK é simples (`id SERIAL`).

#### 3FN — Sem dependência transitiva
Nenhuma coluna não-chave depende de outra coluna não-chave.
✅ Atendemos: `cursos.preco` depende de `cursos.id`, não de `cursos.titulo`. O nome da categoria não tá duplicado em `cursos` — só em `categorias`.

#### Não desnormalizamos
Mantemos integridade forte no banco e usamos **Redis** pra cache de queries quentes em vez de duplicar dados.

### 4.5 Os 15 índices e por que cada um

Índice = estrutura de dados (no nosso caso, **B-Tree**) que acelera buscas, JOINs e ordenações em uma coluna.

**Sem índice:** banco faz `Seq Scan` (varre tabela inteira) — lento em tabelas grandes.
**Com índice:** banco faz `Index Scan` (busca direta) — rápido.

| Índice | Por que existe |
|--------|---------------|
| `usuarios.email` (UNIQUE) | Login é a operação mais frequente — busca por email tem que ser instantânea. UNIQUE também garante que não existe dois usuários com mesmo email. |
| `usuarios.tipo` | Filtros do tipo "listar todos os admins". |
| `categorias.nome` (UNIQUE) | Busca por nome + impede categorias duplicadas. |
| `cursos.categoria_id` | JOINs com categoria são frequentes (sempre que listamos cursos). |
| `cursos.titulo` | Busca/autocomplete por nome de curso. |
| `cursos.ativo` | Listar apenas cursos disponíveis pra matrícula. |
| `matriculas.usuario_id` | "Quais cursos eu estou matriculado?" |
| `matriculas.curso_id` | "Quais alunos estão neste curso?" |
| `matriculas (usuario_id, curso_id)` UNIQUE | Garante 1 matrícula por (aluno, curso). |
| `matriculas.status` | Relatórios por status (ativas vs concluídas). |
| `matriculas.data_matricula` | Filtros temporais (matrículas do último mês). |
| `avaliacoes.usuario_id` | "Minhas avaliações". |
| `avaliacoes.curso_id` | "Avaliações deste curso". |
| `avaliacoes (usuario_id, curso_id)` UNIQUE | Uma avaliação por par. |
| `avaliacoes.nota` | Filtros do tipo "mostrar só notas >= 4". |

### 4.6 As 6 consultas críticas

Estão em `docs/banco-de-dados/queries/consultas_criticas.sql`. Decora pelo menos uma pra explicar de cabeça:

**Q1 — Top 10 cursos mais matriculados:**
```sql
SELECT c.id, c.titulo, cat.nome AS categoria, COUNT(m.id) AS total_matriculas
FROM cursos c
JOIN categorias cat ON cat.id = c.categoria_id
LEFT JOIN matriculas m ON m.curso_id = c.id
WHERE c.ativo = TRUE
GROUP BY c.id, c.titulo, cat.nome
ORDER BY total_matriculas DESC
LIMIT 10;
```
**Por que é crítica:** é a query da home page. Mais usada do sistema. Usa JOIN de 3 tabelas + agregação. Beneficia dos índices `cursos_ativo_idx`, `cursos_categoria_idx` e `matriculas_curso_idx`.

### 4.7 Constraints especiais

- `CHECK (progresso BETWEEN 0 AND 100)` — o banco impede salvar progresso 150 mesmo se a aplicação tiver bug.
- `CHECK (nota BETWEEN 1 AND 5)` — idem pras notas.
- `ON DELETE RESTRICT` em `cursos.categoria_id` — não dá pra apagar uma categoria que ainda tem cursos. Proteção.
- `ON DELETE CASCADE` em `matriculas` e `avaliacoes` — se apagar um usuário/curso, suas matrículas e avaliações vão junto (faz sentido — não faz sentido manter matrícula órfã).

---

## 5. Desenvolvimento Web (matéria DW)

### 5.1 As 25 rotas REST

5 entidades × 5 operações REST padrão = 25 endpoints:

```
GET    /<entidade>           # lista paginada
GET    /<entidade>/:id       # busca por ID
POST   /<entidade>           # cria
PUT    /<entidade>/:id       # atualiza
DELETE /<entidade>/:id       # remove
```

Mais 2 rotas extras:
- `POST /login` — gera token JWT (única rota PÚBLICA)
- `GET /health` — healthcheck

### 5.2 REST = O que significa?

REST é um **estilo arquitetural** pra APIs HTTP. Princípios:

1. **Recursos identificados por URL** — `/cursos/42` é o curso 42.
2. **Verbos HTTP indicam ação** — GET (ler), POST (criar), PUT (atualizar), DELETE (apagar).
3. **Stateless** — cada requisição é independente. O servidor não guarda contexto entre requisições (por isso usamos JWT — o estado da autenticação vai no token, não na sessão do servidor).
4. **Representação em JSON** — payloads e respostas em JSON.

### 5.3 Middlewares

São funções que rodam **antes do controller** (ou no fim, pra erros). Permitem reutilizar lógica.

Nosso projeto tem 3:

**`log.middleware.js`** (middleware próprio — atende exigência DW):
- Roda em TODA requisição.
- Loga método, URL, status, tempo de resposta.

**`auth.middleware.js`** (`autenticarJWT`):
- Pega o header `Authorization: Bearer <token>`.
- Verifica com `jwt.verify()` usando o `JWT_SECRET`.
- Se OK, coloca `{ id, email, tipo }` em `req.usuario` e chama `next()`.
- Se falhar, retorna 401.

**`error.middleware.js`**:
- Roda quando algum controller dá `next(err)`.
- Captura erros do Sequelize (validação, FK, UNIQUE) e converte em respostas JSON estruturadas.

### 5.4 Como funciona o login + JWT

**No POST /login:**
1. Recebe `{ email, senha }`.
2. Busca o usuário pelo email no banco.
3. Chama `usuario.verificarSenha(senha)` — internamente, `bcrypt.compare(senha, hashSalvo)`.
4. Se senha bater, gera JWT com `jwt.sign({ id, email, tipo }, JWT_SECRET, { expiresIn: '1d' })`.
5. Retorna `{ token, usuario }`.

**Nas próximas requisições:**
1. Cliente manda `Authorization: Bearer <token>` em todas as rotas.
2. Middleware `autenticarJWT` valida o token (a assinatura confirma que não foi adulterado e a `exp` confirma que não expirou).
3. Se OK, segue pro controller.

### 5.5 Padrão de Projeto: Factory

Em vez de escrever 5 controllers iguais (um pra cada entidade), criamos uma **factory** (`crud.factory.js`) que **gera** o controller dinamicamente:

```javascript
const usuariosCRUD = crudFactory(Usuario, { attributes: { exclude: ['senha'] } })
const cursosCRUD = crudFactory(Curso, { include: [{ model: Categoria, as: 'categoria' }] })
```

Isso é **DRY (Don't Repeat Yourself)** — código compartilhado.

### 5.6 Paginação

Implementada na `list` da factory:
- `?page=1&limit=20` retorna os primeiros 20 registros.
- `?page=2&limit=20` retorna os próximos 20.
- Resposta sempre inclui: `{ dados: [...], paginacao: { pagina, por_pagina, total, total_paginas } }`.

**Detalhe importante:** usamos `distinct: true` no `findAndCountAll` pra evitar que JOINs inflem o count (descobrimos isso testando — categorias retornava 25 em vez de 8 porque o JOIN com cursos multiplicava).

---

## 6. Infraestrutura (matéria Infra — Opção A Docker)

### 6.1 Por que escolhemos Opção A (Docker) e não Opção B (AWS)?

- Sem custo financeiro (AWS cobra ~$2/dia mesmo em projeto pequeno).
- Roda em qualquer máquina com Docker — sem depender de conta AWS.
- Atende todos os critérios de produção mesmo localmente: redes isoladas, volumes persistentes, healthchecks, multi-stage builds.
- O conhecimento de Docker é pré-requisito pra entender qualquer cloud moderna (AWS ECS/EKS, GCP Cloud Run, Azure Container Instances).

### 6.2 Multi-stage Build (Dockerfile)

Nosso `Dockerfile` tem **2 estágios**:

```dockerfile
# ESTÁGIO 1: builder
FROM node:24-alpine AS builder
WORKDIR /build
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# ESTÁGIO 2: runtime (imagem FINAL)
FROM node:24-alpine AS runtime
WORKDIR /app
COPY --from=builder /build/node_modules ./node_modules
COPY . .
USER app
CMD ["node", "server.js"]
```

**Por que isso é importante:**
- O estágio `builder` baixa dependências, mas todo o cache do npm e arquivos temporários ficam lá.
- A imagem **final** (`runtime`) só copia o que precisa (`node_modules` + código).
- Resultado: imagem **menor** (sem npm cache) e **mais segura** (menos lixo, sem ferramentas de build expostas).

### 6.3 Layer Caching

Cada `COPY`, `RUN`, etc no Dockerfile vira uma **camada**. Se uma camada não mudou, Docker reaproveita do cache.

**Ordem importa**: dependências mudam pouco (mudam só quando alteramos `package.json`), código muda a toda hora. Por isso colocamos:

```dockerfile
COPY package.json package-lock.json* ./   # camada estável
RUN npm install                            # camada estável (depende da anterior)
COPY . .                                   # camada volátil (vem por último)
```

Resultado: alterar um arquivo `.js` não força reinstalar 200 pacotes npm — só refaz a última camada.

### 6.4 `.dockerignore`

Mesmo papel do `.gitignore`, mas pro Docker. Lista arquivos que **não devem entrar no contexto de build**:

```
node_modules    # gigante, será reinstalado
.env            # tem segredos!
.git            # histórico desnecessário
*.log           # lixo
docs            # documentação não vai pra imagem
```

Sem isso, Docker manda o repo inteiro pro daemon antes do build. Com isso, só os arquivos relevantes vão.

### 6.5 Docker Compose — os 4 serviços

```yaml
services:
  nginx:    # exposto na porta 80 (única externa)
  app:      # Node, SEM ports — invisível do host
  postgres: # SEM ports — invisível
  redis:    # SEM ports — invisível
```

**O que cada serviço faz:**
- **nginx** — porta de entrada. Recebe HTTP do host, faz proxy_pass pro `app`.
- **app** — a aplicação Node.js. Fala com `postgres` e `redis` por DNS interno.
- **postgres** — banco de dados. Volume `cursos_postgres_data` preserva os dados.
- **redis** — cache em memória. Volume `cursos_redis_data` preserva (mesmo Redis, com `appendonly yes`, persiste).

### 6.6 Custom Bridge Network — por que duas redes?

```yaml
networks:
  cursos_public:    # apenas nginx
  cursos_internal:  # nginx + app + postgres + redis
```

- **`cursos_public`** — onde o Nginx escuta. Conectada ao host.
- **`cursos_internal`** — rede isolada onde app/postgres/redis se comunicam.

Como o Postgres está **só na `cursos_internal`** e essa rede **não tem ponte com o host**, é fisicamente impossível alguém fora do Docker conectar nele. Isso é demonstrável: rodando `nc -zv localhost 5432` retorna "connection refused".

### 6.7 DNS interno do Docker

Dentro da `cursos_internal`, cada container pode chamar os outros **pelo nome do serviço**:

```javascript
// dentro do app:
host: 'postgres'  // ← isso resolve pra um IP automaticamente
host: 'redis'
```

```nginx
# dentro do nginx.conf:
upstream node_app {
    server app:3000;   # "app" é resolvido pra IP do container app
}
```

**Por que isso é importante:**
- Não dependemos de IPs estáticos (que mudariam se um container reiniciar).
- Atende o critério da Infra: "uso de IPs estáticos para comunicação inter-contêiner é proibido".

### 6.8 Named Volumes vs Bind Mounts

| Tipo | Onde fica | Quando usar |
|------|-----------|-------------|
| **Bind Mount** | Pasta do host (ex: `./data:/var/lib/postgresql/data`) | Desenvolvimento — pra editar arquivos do host e ver dentro do container. Ruim pra produção (depende do filesystem do host). |
| **Named Volume** | Gerenciado pelo Docker (`cursos_postgres_data`) | Produção — Docker decide onde guardar, otimiza, faz backup. Sobrevive a `docker compose down`. |

**Usamos Named Volumes** porque atende o critério: "Bind mounts devem ser evitados para dados persistentes em produção". E o teste comprovou: rodamos `down` + `up` (sem `-v`) e os 31 usuários continuaram lá.

### 6.9 Healthchecks

Cada container tem um healthcheck. O Docker fica perguntando "você tá bem?" a cada 10-15 segundos:

- **postgres** — `pg_isready -U cursos_user -d cursos_db`
- **redis** — `redis-cli ping` (responde PONG)
- **app** — script Node interno que faz GET `http://localhost:3000/health`

`depends_on` com `condition: service_healthy` faz o Nginx só iniciar **depois** que o app está saudável, e o app só iniciar depois que o Postgres e Redis estão saudáveis. Isso evita "fila quebrada" no boot.

---

## 7. Perguntas que o professor pode fazer (FAQ defesa)

### Sobre Banco de Dados

**"Por que escolheram Postgres e não MongoDB?"**
Porque o domínio é fortemente relacional (5 entidades, 6 FKs), precisamos de integridade referencial, transações ACID e queries com JOIN. MongoDB seria útil se tivéssemos atributos dinâmicos ou escala extrema, o que não é o caso.

**"O que é uma tabela pivô?"**
É a tabela que materializa um relacionamento N:N entre duas outras tabelas, porque bancos relacionais não suportam N:N direto. Aqui, `matriculas` é pivô entre `usuarios` e `cursos`. Como tem atributos próprios (`status`, `progresso`, `data_matricula`), chamamos de "pivô com atributos".

**"Por que `ON DELETE CASCADE` em `matriculas` mas `RESTRICT` em `cursos.categoria_id`?"**
Lógica de negócio: se um usuário é apagado, faz sentido apagar suas matrículas (relação dependente). Mas se alguém tentar apagar uma categoria que ainda tem cursos, isso seria perigoso — bloqueamos com RESTRICT pra forçar a pessoa a apagar/mover os cursos primeiro.

**"Por que o índice em `data_matricula`?"**
Porque uma das consultas críticas filtra "matrículas dos últimos 30 dias". Sem índice nessa coluna, o banco faria seq scan na tabela inteira. Com índice, faz range scan direto na faixa.

**"3FN está atendida?"**
Sim. Nenhuma coluna não-chave depende de outra coluna não-chave. Por exemplo, em `cursos`, `preco` depende só de `id`, não de `titulo`. O nome da categoria não está em `cursos` — está em `categorias` e referenciado por `categoria_id`.

### Sobre Desenvolvimento Web

**"O que é REST?"**
Estilo arquitetural pra APIs onde recursos são identificados por URLs, ações são feitas por verbos HTTP (GET/POST/PUT/DELETE), comunicação é stateless e formato é JSON.

**"Como funciona o JWT?"**
O token tem 3 partes: header, payload e assinatura, separados por ponto. A assinatura é gerada com `HMAC_SHA256(header + payload, JWT_SECRET)`. Quando o servidor recebe o token, recalcula a assinatura com o mesmo segredo — se bater, confia no payload; se não bater, sabe que foi adulterado.

**"Por que bcrypt e não MD5/SHA-256?"**
MD5 e SHA são rápidos demais — atacante pode tentar bilhões de senhas por segundo. Bcrypt é lento de propósito (~100ms por hash) e já vem com salt embutido, inviabilizando rainbow tables.

**"Como vocês evitam que o usuário receba a senha hash nas respostas?"**
Duas camadas: (1) o método `toJSON()` do model remove o campo `senha` automaticamente; (2) nos controllers, passamos `attributes: { exclude: ['senha'] }` pro Sequelize, garantindo que a senha nem é trazida do banco quando o usuário é incluído em outras queries (como em `/matriculas`).

**"Por que todas as rotas estão protegidas com JWT, exceto `/login`?"**
Porque `/login` é onde o usuário pega o token. Se ela exigisse token, ninguém conseguiria fazer login. Padrão de mercado.

### Sobre Infraestrutura

**"Por que multi-stage build?"**
Pra separar o ambiente de build (que tem npm, cache, ferramentas) do ambiente de runtime (que só precisa do código). Resultado: imagem final menor e mais segura. Critério explícito da matéria.

**"Como o Nginx sabe pra onde mandar a requisição?"**
No `nginx.conf` tem `upstream node_app { server app:3000; }`. "app" é o nome do serviço Docker, resolvido pelo DNS interno do Docker. Por isso não usamos IPs estáticos.

**"Por que o Postgres não tem `ports:` no docker-compose?"**
Porque ele não deve ser acessível do host. Sem `ports:`, ele só existe dentro da rede Docker, invisível pra qualquer um que não esteja em outro container conectado à mesma rede. Isso atende o critério "DB em rede isolada" e demonstramos isso com `nc -zv localhost 5432` que falha.

**"O que é Named Volume?"**
É um volume Docker gerenciado, com nome (`cursos_postgres_data`), que sobrevive a `docker compose down`. Os dados ficam num diretório administrado pelo Docker, em vez de num caminho do host. Vantagem: portabilidade e melhor performance.

**"O que aconteceria se vocês rodassem `docker compose down -v`?"**
A flag `-v` apaga os volumes. Perderíamos todos os dados do banco. É **muito diferente** de `docker compose down` sem `-v`, que só para os containers preservando dados.

**"Como o healthcheck funciona?"**
Cada container tem um comando que o Docker executa periodicamente. Se o comando retorna 0, é considerado saudável; se retorna != 0 várias vezes seguidas, o container é marcado como unhealthy. No nosso projeto, o app só sobe depois que postgres+redis tão healthy (via `depends_on.condition: service_healthy`).

**"Por que usar Alpine?"**
Imagem base Linux muito pequena (~5MB vs ~80MB do Debian). Resulta em imagem final menor, build mais rápido, menos superfície de ataque.

### Perguntas-pegadinha

**"E se cair a luz com transações abertas?"**
Postgres é ACID. A propriedade D (Durability) garante que transações commitadas estão no disco (WAL — write-ahead log). Transações não-commitadas são revertidas no boot seguinte.

**"Por que vocês usam pool de conexões no Sequelize?"**
Porque abrir/fechar conexão TCP com o banco é caro. O pool mantém um conjunto de conexões reutilizáveis (max 10 no nosso caso). Quando o app precisa, pega uma do pool; quando termina, devolve.

**"Como vocês garantem que o seed não roda duas vezes acidentalmente?"**
O seed limpa as tabelas antes de inserir (`destroy({ where: {} })`). Em produção, isso seria perigoso — usaríamos verificação de "se tabela vazia, então popula".

---

## 8. Comandos pra demonstrar ao vivo

Cola esses na ordem durante a apresentação:

```bash
# 1. Mostrar que está tudo parado
docker compose ps

# 2. Subir tudo
docker compose up --build -d

# 3. Mostrar containers de pé
docker compose ps
# Esperar todos virarem "healthy"

# 4. Mostrar as redes
docker network ls | grep tcc
docker network inspect cursos_internal --format '{{range .Containers}}{{.Name}} {{end}}'

# 5. Provar isolamento (essas 3 devem FALHAR)
nc -zv localhost 5432  # postgres
nc -zv localhost 6379  # redis
nc -zv localhost 3000  # node
# Mensagem esperada: connection refused

# 6. Provar que Nginx responde
curl http://localhost/health

# 7. Rodar migrations
docker compose exec app node command.js migrate

# 8. Mostrar tabelas criadas
docker compose exec postgres psql -U cursos_user -d cursos_db -c '\dt'

# 9. Mostrar índices criados
docker compose exec postgres psql -U cursos_user -d cursos_db -c '\di'

# 10. Popular com seed
docker compose exec app node command.js seed

# 11. Contar registros
docker compose exec postgres psql -U cursos_user -d cursos_db -c \
  'SELECT
     (SELECT COUNT(*) FROM usuarios) usuarios,
     (SELECT COUNT(*) FROM categorias) categorias,
     (SELECT COUNT(*) FROM cursos) cursos,
     (SELECT COUNT(*) FROM matriculas) matriculas,
     (SELECT COUNT(*) FROM avaliacoes) avaliacoes;'

# 12. Login
TOKEN=$(curl -s -X POST http://localhost/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@cursos.com","senha":"admin123"}' | jq -r .token)
echo "$TOKEN"

# 13. Listar cursos com token
curl -s http://localhost/cursos -H "Authorization: Bearer $TOKEN" | jq

# 14. Sem token (mostra que está protegido)
curl -i http://localhost/cursos
# HTTP/1.1 401 Unauthorized

# 15. Criar usuário
curl -X POST http://localhost/usuarios \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"nome":"Demo Vivo","email":"demo@vivo.com","senha":"123456","tipo":"aluno"}'

# 16. Mostrar Swagger
# Abrir no navegador: http://localhost/api-docs

# 17. Rodar consulta crítica direto no banco
docker compose exec postgres psql -U cursos_user -d cursos_db -c \
  "SELECT c.titulo, cat.nome AS cat, COUNT(m.id) AS matrs
   FROM cursos c
   JOIN categorias cat ON cat.id = c.categoria_id
   LEFT JOIN matriculas m ON m.curso_id = c.id
   GROUP BY c.id, c.titulo, cat.nome
   ORDER BY matrs DESC LIMIT 10;"

# 18. Provar persistência
docker compose down
docker compose up -d
sleep 8
docker compose exec postgres psql -U cursos_user -d cursos_db -c 'SELECT COUNT(*) FROM usuarios;'
# Mesmo número de antes — provando que volume nomeado persistiu

# 19. (Opcional) Mostrar EXPLAIN de uma query
docker compose exec postgres psql -U cursos_user -d cursos_db -c \
  "EXPLAIN ANALYZE SELECT * FROM matriculas WHERE usuario_id = 5;"
# Mostra "Index Scan using matriculas_usuario_idx" — prova que o índice foi usado!
```

---

## 9. Divisão sugerida da apresentação

### **José Henrique** — Banco de Dados + integração geral
- Apresenta o domínio (Plataforma de Cursos Online).
- Mostra o DER e explica as cardinalidades.
- Explica a normalização (1FN, 2FN, 3FN atendidas).
- Demonstra uma consulta crítica e mostra o EXPLAIN com index scan.
- Justifica a escolha SQL/Postgres.

### **Leandro** — Desenvolvimento Web
- Mostra a estrutura de pastas (`app/src/...`).
- Apresenta uma rota REST do começo ao fim (request → middleware → controller → model → DB).
- Demonstra o login + JWT no terminal.
- Mostra o Swagger funcionando.
- Explica o middleware próprio (`log.middleware.js`).

### **Rafael** — Infraestrutura
- Apresenta o `docker-compose.yml` (4 serviços + 2 redes + 2 volumes).
- Mostra o Dockerfile multi-stage e explica os 2 estágios.
- Demonstra o isolamento de rede (`nc -zv localhost 5432` falha).
- Demonstra persistência (down + up + dados preservados).
- Mostra os healthchecks ficando verdes no `docker compose ps`.

> **Importante:** todo mundo precisa **entender o básico das 3 áreas** porque o professor pode perguntar qualquer coisa pra qualquer um. Foco mais nas próprias mas não ignora as outras.

---

## 10. Checklist final antes de gravar o vídeo

- [ ] Docker Desktop rodando
- [ ] Pasta do projeto aberta no VS Code
- [ ] Tela do terminal grande e legível (fonte 16+)
- [ ] Tema claro do terminal (vídeo fica melhor pra ver)
- [ ] `docker compose down -v` antes de começar (subir do zero)
- [ ] Browser aberto em http://localhost/api-docs pra mostrar Swagger
- [ ] Editor aberto no `docker-compose.yml` e `Dockerfile` pra mostrar o código
- [ ] Roteiro: subir → migrate → seed → testar login → mostrar isolamento → mostrar persistência → cleanup
- [ ] Mostrar uma consulta SQL real no Postgres
- [ ] Gravação em 1080p mínimo
- [ ] Áudio claro (microfone testado)
- [ ] Vídeo final: 5-10 minutos é o ideal
- [ ] Salvar em `docs/infraestrutura/video-demo.mp4` OU link do YouTube/Drive no README

---

## Bonus — Glossário relâmpago

| Termo | Tradução simples |
|-------|------------------|
| **ORM** | "Tradutor" que transforma código JS em SQL e vice-versa. |
| **ACID** | Garantias do banco: Atomicidade, Consistência, Isolamento, Durabilidade. |
| **CRUD** | Create, Read, Update, Delete — as 4 operações básicas em qualquer entidade. |
| **N:N** | Muitos pra muitos (vários alunos em vários cursos). |
| **FK** | Foreign Key — chave estrangeira (referência pra outra tabela). |
| **PK** | Primary Key — chave primária (identificador único da linha). |
| **Bcrypt** | Algoritmo de hash de senha. |
| **JWT** | Token de autenticação stateless. |
| **REST** | Estilo de API HTTP. |
| **Endpoint** | URL + verbo HTTP de uma rota. |
| **Middleware** | Função que roda antes (ou no fim) do controller. |
| **Container** | Processo isolado com seu sistema de arquivos próprio. |
| **Imagem** | "Template" que vira um container quando executado. |
| **Volume** | Diretório persistente fora do container. |
| **Proxy reverso** | Servidor que recebe a requisição e repassa pra outro servidor. |
| **DNS interno** | Resolução de nome de serviço dentro da rede Docker. |
| **Healthcheck** | Comando periódico pra verificar se um container está saudável. |
| **Migration** | Script versionado que altera o schema do banco. |
| **Seed** | Script que popula o banco com dados iniciais. |
| **Swagger / OpenAPI** | Padrão pra documentar APIs REST. |

**Bons estudos e boa apresentação!**
