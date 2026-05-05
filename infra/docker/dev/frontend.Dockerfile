# Dev-образ Nuxt 4: ставим зависимости в образ, исходники монтируются томом.
# Анонимный volume на /opt/app/node_modules в compose сохранит установленные
# пакеты при бинд-маунте host-директории поверх /opt/app.

FROM node:24-alpine
WORKDIR /opt/app
ENV HOST=0.0.0.0
ENV PORT=3000
COPY package*.json ./
RUN npm ci
EXPOSE 3000 24678
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
