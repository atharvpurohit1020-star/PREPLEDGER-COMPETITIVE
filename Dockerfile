# PrepLedger production image: API + built client + Chromium for server-side PDF export.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=4000
COPY package.json package-lock.json ./
# tsx runs the TypeScript server directly; playwright provides Chromium for /api/pdf
RUN npm ci && npx playwright install --with-deps chromium && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY server ./server
COPY shared ./shared
COPY migrations ./migrations
COPY data ./data
COPY scripts ./scripts
COPY public ./public
COPY tsconfig.json ./
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:4000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["npx", "tsx", "server/index.ts"]
