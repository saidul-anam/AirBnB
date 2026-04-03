# ================================
# Stage 1: Build React App
# ================================
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files first for dependency caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --silent

# Copy source code
COPY . .

# Build arguments for environment variables at build time
ARG REACT_APP_API_BASE_URL=http://localhost:8080
ARG REACT_APP_ENV=production

ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL
ENV REACT_APP_ENV=$REACT_APP_ENV

# Build the React app
RUN npm run build

# ================================
# Stage 2: Serve with Nginx
# ================================
FROM nginx:1.25-alpine

# Remove default nginx static files
RUN rm -rf /usr/share/nginx/html/*

# Copy built React app from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Add a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /usr/share/nginx/html \
    && chown -R appuser:appgroup /var/cache/nginx \
    && chown -R appuser:appgroup /var/log/nginx \
    && touch /var/run/nginx.pid \
    && chown appuser:appgroup /var/run/nginx.pid

USER appuser

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80 || exit 1

CMD ["nginx", "-g", "daemon off;"]
