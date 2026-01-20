# ./client/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Копируем зависимости и устанавливаем их
COPY package*.json ./
RUN npm ci --only=production

# Копируем весь код
COPY . .

# СОБИРАЕМ ПРОДАКШН-ВЕРСИЮ (ключевой шаг!)
RUN npm run build

# Финальный образ — минимальный
FROM node:18-alpine

WORKDIR /app

# Копируем только собранную версию из этапа builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package*.json ./

# Устанавливаем только продакшн-зависимости (повторно — для безопасности)
RUN npm ci --only=production

EXPOSE 3000

CMD ["npm", "start"]