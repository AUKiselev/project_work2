# Prod-образ Strapi 5.

FROM node:22-alpine AS deps
WORKDIR /opt/app
RUN apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev vips-dev git > /dev/null 2>&1
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /opt/app
RUN apk add --no-cache vips-dev > /dev/null 2>&1
COPY --from=deps /opt/app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /opt/app
ENV NODE_ENV=production
RUN apk add --no-cache vips > /dev/null 2>&1
COPY --from=build /opt/app ./
EXPOSE 1337
CMD ["npm", "run", "start"]
