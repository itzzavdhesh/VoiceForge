FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

# Install dependencies
RUN npm install

# Copy all other source code
COPY . .

# Expose ports for client (Vite) and server (Express)
EXPOSE 5173
EXPOSE 3001

# Start the dev server
CMD ["npm", "run", "dev"]
