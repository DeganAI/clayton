# Use official Node.js image which already has the node user created
ARG NODE_VER=23.5.0
FROM node:${NODE_VER}

ENV DEBIAN_FRONTEND=noninteractive

# Install necessary build tools and dependencies
RUN apt-get update \
    && apt-get install -y \
    git \
    python3 \
    make \
    g++ \
    nano \
    vim \
    curl \
    wget \
    gnupg \
    lsb-release \
    ca-certificates \
    apt-transport-https \
    software-properties-common \
    libgl1-mesa-dev \
    mesa-utils \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set up for NVIDIA GPU support if available
RUN mkdir -p /etc/OpenCL/vendors && \
    echo "libnvidia-opencl.so.1" > /etc/OpenCL/vendors/nvidia.icd

# Install Node.js development tools
ARG PNPM_VER=9.15.2
RUN npm install -g pnpm@${PNPM_VER} typescript ts-node

# Set Python 3 as the default python
RUN ln -sf /usr/bin/python3 /usr/bin/python

# Create and set working directory
WORKDIR /app

# Set up eliza directory structure
RUN mkdir -p /app/packages/core/src/characters \
    && mkdir -p /app/plugins/plugin-dialpad/src \
    && mkdir -p /app/plugins/plugin-batscrm/src/actions

# Create Clayton character file
RUN mkdir -p /app/packages/core/src/characters \
    && echo '{\
  "name": "Clayton",\
  "username": "clayton",\
  "plugins": [],\
  "modelProvider": "anthropic",\
  "settings": {\
    "model": "claude-3-7-sonnet-20250219",\
    "maxInputTokens": 100000,\
    "maxOutputTokens": 4096,\
    "temperature": 0.7,\
    "secrets": {}\
  },\
  "system": "You are Clayton, an AI auto transport coordinator specializing in managing vehicle shipments. Your primary responsibilities include tracking vehicle shipments, scheduling auto transport pickups, providing delivery estimates, responding to customer inquiries, notifying customers about vehicle status, and coordinating with auto transport carriers. You maintain a professional but friendly tone and understand auto transport terminology and logistics processes."\
}' > /app/packages/core/src/characters/clayton.character.json

# Create entrypoint script
RUN echo '#!/bin/bash\n\
echo "Setting up Clayton Auto Transport Coordinator environment..."\n\
\n\
# Ensure Railway environment variables are properly set\n\
if [ -z "$ANTHROPIC_API_KEY" ]; then\n\
  echo "Warning: ANTHROPIC_API_KEY is not set. Clayton may not function properly."\n\
fi\n\
\n\
# Set required environment variables if not already set\n\
export DAEMON_PROCESS=true\n\
export DISABLE_TERMINAL_CHAT=true\n\
export ELIZA_CHARACTER=clayton\n\
export DISABLE_PLUGIN_INSTALLATION=true\n\
\n\
# Copy character file to proper location if it doesn'\''t exist\n\
if [ ! -d ".eliza/characters" ]; then\n\
  mkdir -p .eliza/characters\n\
  cp /app/packages/core/src/characters/clayton.character.json .eliza/characters/\n\
fi\n\
\n\
# Start ElizaOS\n\
exec "$@"\n\
' > /app/entrypoint.sh \
    && chmod +x /app/entrypoint.sh

# Copy package files
COPY package.json* pnpm-lock.yaml* pnpm-workspace.yaml* ./
COPY packages ./packages
COPY plugins ./plugins

# Install dependencies
RUN pnpm install

# Build the project
RUN pnpm build

# Set environment variables
ENV NODE_ENV=production
ENV ELIZA_CHARACTER=clayton
ENV DISABLE_PLUGIN_INSTALLATION=true
ENV DAEMON_PROCESS=true
ENV DISABLE_TERMINAL_CHAT=true

# Use the node user instead of root
USER node

# Expose the port ElizaOS runs on
EXPOSE 3000

# Set entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["pnpm", "start"]
