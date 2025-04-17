ARG NODE_VER=23.5.0
ARG BASE_IMAGE=node:${NODE_VER}
FROM $BASE_IMAGE
ENV DEBIAN_FRONTEND=noninteractive

# Install pnpm globally and install necessary build tools
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
RUN ln -s /usr/bin/python3 /usr/bin/python

# Create and set working directory for Clayton project
WORKDIR /workspace

# Create a non-root user with sudo access
RUN groupadd --gid 1000 node \
    && useradd --uid 1000 --gid node --shell /bin/bash --create-home node \
    && mkdir -p /home/node/.config \
    && chown -R node:node /home/node

# Set up eliza directory structure
RUN mkdir -p /workspace/packages/core/src/characters \
    && mkdir -p /workspace/plugins/plugin-dialpad/src \
    && mkdir -p /workspace/plugins/plugin-batscrm/src/actions

# Create entrypoint script to set up environment
RUN echo '#!/bin/bash\n\
echo "Setting up Clayton Auto Transport Coordinator environment..."\n\
if [ ! -f .env ]; then\n\
  echo "Creating default .env file..."\n\
  echo "ANTHROPIC_API_KEY=your_api_key_here" > .env\n\
  echo "OPENAI_API_KEY=your_api_key_here" >> .env\n\
  echo "DIALPAD_API_KEY=your_api_key_here" >> .env\n\
  echo "DIALPAD_API_SECRET=your_api_secret_here" >> .env\n\
  echo "DIALPAD_ACCOUNT_ID=your_account_id_here" >> .env\n\
  echo "BATSCRM_API_KEY=your_api_key_here" >> .env\n\
  echo "BATSCRM_USERNAME=your_username_here" >> .env\n\
  echo "BATSCRM_PASSWORD=your_password_here" >> .env\n\
  echo "BATSCRM_BASE_URL=https://api.batscrm.com/v1" >> .env\n\
  echo "ELIZA_CHARACTER=clayton" >> .env\n\
fi\n\
\n\
if [ ! -f "package.json" ]; then\n\
  echo "Initializing project..."\n\
  pnpm init\n\
fi\n\
\n\
exec "$@"' > /usr/local/bin/entrypoint.sh \
    && chmod +x /usr/local/bin/entrypoint.sh

# Set environment variables
ENV ELIZA_CHARACTER=clayton
ENV DEBIAN_FRONTEND=dialog
ENV PATH=/workspace/node_modules/.bin:$PATH

# Set entrypoint
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["bash"]
