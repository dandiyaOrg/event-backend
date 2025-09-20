FROM node:20-alpine AS builder

# Set working dir
WORKDIR /app

# Add apk packages needed for building native deps if any (optional)
RUN apk add --no-cache python3 make g++ 

# Copy package files and install production deps
COPY package*.json ./
# install only production dependencies to keep image small
RUN npm ci --only=production

# Copy source
COPY . .

# runtime stage: smaller, with curl for healthchecks
FROM node:20-alpine AS runtime
WORKDIR /app

# install runtime utilities (curl for healthcheck)
RUN apk add --no-cache curl

# create logs dir for Winston & ensure permissions
RUN mkdir -p /app/logs && chown -R node:node /app/logs

# create public directory for storing images and all
RUN mkdir -p /public/tmp && chown -R node:node /public/tmp

# copy app and node_modules from builder stage
COPY --from=builder --chown=node:node /app . 

# use non-root user for runtime
USER node

ENV NODE_ENV=production
EXPOSE 3000

# Use npm start (respects package.json start script)
CMD ["npm", "start"]
