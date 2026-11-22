FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --chown=node:node server.mjs ./
COPY --chown=node:node worker ./worker
COPY --chown=node:node migrations ./migrations
USER node
CMD ["node", "server.mjs"]
