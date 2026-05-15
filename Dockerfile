# Imagem oficial do Playwright v1.59.1 (versão EXATA do package-lock.json)
# Já inclui Chromium + todas as dependências Linux pré-instaladas
FROM mcr.microsoft.com/playwright:v1.59.1-noble

USER root
WORKDIR /app

# Copia todos os arquivos do projeto (respeitando o .dockerignore)
COPY . .

# Instala dependências Node
# PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1: usa o Chromium da imagem base (já instalado)
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN apt-get update && apt-get install -y openssl curl gnupg ca-certificates && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /usr/share/postgresql-common/pgdg \
  && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
  | gpg --dearmor -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.gpg \
  && echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.gpg] http://apt.postgresql.org/pub/repos/apt noble-pgdg main" \
  > /etc/apt/sources.list.d/pgdg.list \
  && apt-get update \
  && apt-get install -y postgresql-client-17 \
  && rm -rf /var/lib/apt/lists/*
RUN npm ci

# Gera o Prisma Client com log detalhado caso dê erro
RUN npx prisma -v
RUN npx prisma generate --schema ./prisma/schema.prisma

# Build TypeScript
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["/bin/sh", "-c", "npx prisma migrate deploy --schema ./prisma/schema.prisma && node dist/server.js"]

