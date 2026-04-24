# Dev-образ Strapi 5: исходники монтируются томом, команда запуска задаётся в compose.

FROM node:22-alpine
WORKDIR /opt/app
RUN apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev vips-dev git > /dev/null 2>&1
EXPOSE 1337
CMD ["npm", "run", "develop"]
