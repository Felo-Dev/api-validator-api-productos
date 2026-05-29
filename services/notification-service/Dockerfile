FROM node:20-alpine

WORKDIR /app

COPY shared ./shared
COPY services/notification-service ./services/notification-service
COPY package.json .

RUN npm install

WORKDIR /app/services/notification-service
EXPOSE 4004

CMD ["node", "src/index.js"]
