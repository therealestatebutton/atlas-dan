FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Create data directory for SQLite
RUN mkdir -p data

# Expose port
EXPOSE 5000

# Start the application
CMD ["node", "dist/server/index.js"]
