# Dev-образ Strapi 5: ставим зависимости в образ, исходники монтируются томом.

FROM node:24-alpine
WORKDIR /opt/app
RUN apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev vips-dev git > /dev/null 2>&1
COPY package*.json ./
RUN npm ci
EXPOSE 1337
CMD ["npm", "run", "develop"]
