FROM node:22-alpine

RUN apk add --no-cache curl

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY src ./src

EXPOSE 3000
CMD ["node", "src/index.js"]
