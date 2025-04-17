# Use Node.js image as base
FROM node:23.5.0

# Set working directory
WORKDIR /app

# Install necessary tools
RUN apt-get update && \
    apt-get install -y \
    git \
    python3 \
    make \
    g++ \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN npm install -g pnpm@9.15.2

# Create character directory
RUN mkdir -p /app/.eliza/characters

# Create Clayton character file
RUN echo '{' > /app/.eliza/characters/clayton.character.json && \
    echo '  "name": "Clayton",' >> /app/.eliza/characters/clayton.character.json && \
    echo '  "username": "clayton",' >> /app/.eliza/characters/clayton.character.json && \
    echo '  "plugins": [],' >> /app/.eliza/characters/clayton.character.json && \
    echo '  "modelProvider": "anthropic",' >> /app/.eliza/characters/clayton.character.json && \
    echo '  "settings": {' >> /app/.eliza/characters/clayton.character.json && \
    echo '    "model": "claude-3-7-sonnet-20250219",' >> /app/.eliza/characters/clayton.character.json && \
    echo '    "maxInputTokens": 100000,' >> /app/.eliza/characters/clayton.character.json && \
    echo '    "maxOutputTokens": 4096,' >> /app/.eliza/characters/clayton.character.json && \
    echo '    "temperature": 0.7,' >> /app/.eliza/characters/clayton.character.json && \
    echo '    "secrets": {}' >> /app/.eliza/characters/clayton.character.json && \
    echo '  },' >> /app/.eliza/characters/clayton.character.json && \
    echo '  "system": "You are Clayton, an AI auto transport coordinator specializing in managing vehicle shipments. Your primary responsibilities include tracking vehicle shipments, scheduling auto transport pickups, providing delivery estimates, responding to customer inquiries, notifying customers about vehicle status, and coordinating with auto transport carriers. You maintain a professional but friendly tone and understand auto transport terminology and logistics processes."' >> /app/.eliza/characters/clayton.character.json && \
    echo '}' >> /app/.eliza/characters/clayton.character.json

# Set environment variables
ENV NODE_ENV=production
ENV DAEMON_PROCESS=true
ENV DISABLE_TERMINAL_CHAT=true
ENV ELIZA_CHARACTER=clayton
ENV DISABLE_PLUGIN_INSTALLATION=true

# Copy package.json and install dependencies
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Expose the port
EXPOSE 3000

# Start the application
CMD ["pnpm", "start"]
