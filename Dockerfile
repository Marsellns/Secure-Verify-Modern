# Use lightweight Node.js 18 image based on Alpine Linux
FROM node:18-alpine

# Security: Create non-root user and group
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Set working directory
WORKDIR /usr/src/app

# Copy package info
COPY package*.json ./

# Install dependencies securely (ignoring dev dependencies)
RUN npm ci --only=production

# Copy source maps and code
COPY . .

# Adjust permissions for non-root user
RUN chown -R appuser:appgroup /usr/src/app

# Switch to non-root user
USER appuser

# Expose typical API port
EXPOSE 3000

# Run project
CMD ["npm", "start"]
