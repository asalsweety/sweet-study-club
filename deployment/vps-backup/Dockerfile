FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY server.mjs ./
COPY worker ./worker
COPY migrations ./migrations
USER node
CMD ["node", "server.mjs"]
