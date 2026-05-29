FROM node:20-alpine

WORKDIR /app

COPY shared ./shared
COPY services/order-service ./services/order-service
COPY package.json .

RUN npm install

WORKDIR /app/services/order-service
EXPOSE 4003

CMD ["node", "src/index.js"]
