FROM node:20 AS builder
WORKDIR /app
ARG VITE_SENTRY_DSN
ENV VITE_SENTRY_DSN=${VITE_SENTRY_DSN}
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM caddy:alpine
COPY --from=builder /app/dist /usr/share/caddy
COPY Caddyfile /etc/caddy/Caddyfile
EXPOSE 80 443
