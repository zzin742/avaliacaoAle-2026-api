# syntax=docker/dockerfile:1.7

# ============================================================
# Estagio 1: BUILD - instala dependencias com cache otimizado
# ============================================================
FROM node:24-alpine AS builder

WORKDIR /build

# Camada menos mutavel: copia apenas package.json + lock pra explorar cache
COPY package.json package-lock.json* ./

# Instala apenas dependencias de producao
RUN npm install --omit=dev --no-audit --no-fund && \
    npm cache clean --force

# ============================================================
# Estagio 2: RUNTIME - imagem final minima e segura
# ============================================================
FROM node:24-alpine AS runtime

# Cria usuario nao-root pra reduzir superficie de ataque
RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

# Copia node_modules ja instalado do estagio de build
COPY --from=builder --chown=app:app /build/node_modules ./node_modules

# Copia o codigo-fonte (camada mais mutavel - vem por ultimo)
COPY --chown=app:app . .

# Diretorio onde o segredo do JWT e persistido (montado como volume).
# Criado com dono app para o usuario nao-root conseguir escrever.
RUN mkdir -p /app/.secrets && chown app:app /app/.secrets

USER app

EXPOSE 3000

# Healthcheck simples — o /health responde JSON (usa node, evita depender de wget/curl)
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]
