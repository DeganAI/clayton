# Use Node.js image as base
FROM node:23.5.0-slim

WORKDIR /app

# Install essential dependencies only
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    git \
    python3 \
    make \
    g++ \
    ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN npm install -g pnpm@9.15.2 typescript ts-node

# Create character directory
RUN mkdir -p /app/.eliza/characters

# Create character file
RUN echo '{"name":"Clayton","username":"clayton","plugins":[],"modelProvider":"anthropic","settings":{"model":"claude-3-7-sonnet-20250219","maxInputTokens":100000,"maxOutputTokens":4096,"temperature":0.7,"secrets":{}},"system":"You are Clayton, an AI auto transport coordinator specializing in managing vehicle shipments. Your primary responsibilities include tracking vehicle shipments, scheduling auto transport pickups, providing delivery estimates, responding to customer inquiries, notifying customers about vehicle status, and coordinating with auto transport carriers. You maintain a professional but friendly tone and understand auto transport terminology and logistics processes."}' > /app/.eliza/characters/clayton.character.json

# Copy project files
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY packages ./packages
COPY plugins ./plugins

# Install dependencies
RUN pnpm install

# Build project
RUN pnpm build

# Environment variables for Railway
ENV NODE_ENV=production
ENV DAEMON_PROCESS=true
ENV DISABLE_TERMINAL_CHAT=true
ENV ELIZA_CHARACTER=clayton
ENV DISABLE_PLUGIN_INSTALLATION=true

# Expose port
EXPOSE 3000

# Start command
CMD ["pnpm", "start"]
