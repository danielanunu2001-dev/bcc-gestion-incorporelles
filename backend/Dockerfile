# backend/Dockerfile
FROM node:18-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

RUN npm install bcrypt

COPY . .

RUN mkdir -p uploads logs archives

EXPOSE 5000

CMD ["node", "src/app.js"]