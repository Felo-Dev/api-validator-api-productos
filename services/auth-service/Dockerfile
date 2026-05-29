FROM node:20-alpine

WORKDIR /app

COPY shared ./shared
COPY services/auth-service ./services/auth-service
COPY package.json .

RUN npm install

WORKDIR /app/services/auth-service
EXPOSE 4001

CMD ["node", "src/index.js"]
