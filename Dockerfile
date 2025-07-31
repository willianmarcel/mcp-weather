# ===========================================
# Dockerfile - Otimizado para TypeScript
# ===========================================
FROM node:18-alpine AS base

# Instalar dependências do sistema
RUN apk add --no-cache \
    curl \
    tini \
    && rm -rf /var/cache/apk/*

# Criar usuário não-root
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

WORKDIR /app

# Etapa de build
FROM base AS builder

# Copiar arquivos de dependências
COPY package*.json ./
COPY tsconfig.json ./

# Instalar dependências (incluindo dev)
RUN npm ci

# Copiar código fonte
COPY src/ ./src/

# Build da aplicação
RUN npm run build && \
    npm prune --production

# Etapa de produção
FROM base AS production

# Copiar apenas arquivos necessários
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Criar diretórios necessários
RUN mkdir -p /app/cache /app/logs /tmp && \
    chown -R appuser:appgroup /app /tmp

# Adicionar health check script
RUN cat > /app/healthcheck.js << 'EOF'
const http = require('http');

const options = {
  host: 'localhost',
  port: process.env.HEALTH_CHECK_PORT || 8080,
  path: '/health',
  timeout: 2000,
};

const request = http.request(options, (res) => {
  console.log('Health check status:', res.statusCode);
  process.exit(res.statusCode === 200 ? 0 : 1);
});

request.on('error', (err) => {
  console.log('Health check failed:', err.message);
  process.exit(1);
});

request.end();
EOF

# Mudar para usuário não-root
USER appuser:appgroup

# Expor portas
EXPOSE 8080 8081

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node /app/healthcheck.js

# Usar tini como init
ENTRYPOINT ["/sbin/tini", "--"]

# Comando de execução
CMD ["node", "dist/index.js"]
