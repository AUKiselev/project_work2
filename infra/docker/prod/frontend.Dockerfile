# Prod-образ Nuxt 4: сборка и запуск Node-сервера Nitro.
# На этапе генерации приложения Nuxt CLI положит сюда package.json и исходники.

FROM node:24-alpine AS deps
WORKDIR /opt/app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /opt/app
COPY --from=deps /opt/app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /opt/app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
COPY --from=build /opt/app/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
