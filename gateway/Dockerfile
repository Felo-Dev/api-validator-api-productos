FROM node:20-alpine

WORKDIR /app

COPY shared ./shared
COPY gateway ./gateway
COPY package.json .

RUN npm install

WORKDIR /app/gateway
EXPOSE 4000

CMD ["node", "src/index.js"]
