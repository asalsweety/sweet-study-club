FROM node:22-bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --chown=node:node server.mjs ./
COPY --chown=node:node worker ./worker
COPY --chown=node:node migrations ./migrations
USER node
CMD ["node", "server.mjs"]
