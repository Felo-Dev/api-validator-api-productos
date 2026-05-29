FROM node:20-alpine

WORKDIR /app

COPY shared ./shared
COPY services/product-service ./services/product-service
COPY package.json .

RUN npm install

WORKDIR /app/services/product-service
EXPOSE 4002

CMD ["node", "src/index.js"]
