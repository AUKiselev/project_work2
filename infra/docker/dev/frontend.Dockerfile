# Dev-образ Nuxt 4: исходники монтируются томом, команда запуска задаётся в compose.

FROM node:22-alpine
WORKDIR /opt/app
ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000 24678
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
