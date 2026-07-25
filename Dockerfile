# Base stage for installing dependencies
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
RUN npm ci

# Development stage
FROM base AS development
COPY . .
EXPOSE 3001 5173
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS build
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
COPY server/package*.json ./server/
RUN npm ci --omit=dev
COPY --from=build /app/server ./server
COPY --from=build /app/client/dist ./client/dist
EXPOSE 3001
CMD ["npm", "start"]
