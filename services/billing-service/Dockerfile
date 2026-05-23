FROM node:20-alpine

WORKDIR /app

COPY shared ./shared
COPY services/billing-service ./services/billing-service
COPY package.json .

RUN npm install

WORKDIR /app/services/billing-service
EXPOSE 4005

CMD ["node", "src/index.js"]
