# ── Build stage ──────────────────────────────────────────
FROM node:20-slim AS build

WORKDIR /app

# Install root deps
COPY package.json ./
RUN npm install

# Install server deps
COPY server/package.json server/
RUN cd server && npm install

# Install client deps + build
COPY client/package.json client/
RUN cd client && npm install
COPY client/ client/
RUN cd client && npm run build

# ── Production stage ─────────────────────────────────────
FROM node:20-slim

WORKDIR /app

COPY server/package.json server/
RUN cd server && npm install --omit=dev

COPY server/ server/
COPY --from=build /app/client/dist client/dist

ENV NODE_ENV=production
ENV PORT=10000
EXPOSE 10000

CMD ["node", "server/src/index.js"]
