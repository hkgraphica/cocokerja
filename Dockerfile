FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
RUN npm prune --omit=dev && npm i --no-save tsx
USER node
EXPOSE 3000
# Web (landing + webhook): npm start  |  Worker (polling + tick): npx tsx scripts/worker.ts
CMD ["npm", "start"]
