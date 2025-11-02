# Use lightweight Node.js image
FROM node:20-bullseye

# Install dependencies
RUN apt-get update && \
    apt-get install -y curl ca-certificates git build-essential && \
    rm -rf /var/lib/apt/lists/*

# Install Supabase CLI (replace version if needed)
ARG SUPABASE_CLI_VERSION=2.54.11
RUN curl -L "https://github.com/supabase/cli/releases/download/v${SUPABASE_CLI_VERSION}/supabase_linux_amd64.tar.gz" \
    -o supabase.tar.gz && \
    tar -xzf supabase.tar.gz -C /usr/local/bin && \
    rm supabase.tar.gz

# Set working directory
WORKDIR /app

# Copy package files & install dependencies
COPY package*.json ./
RUN npm install --frozen-lockfile

# Copy all source files
COPY . .

# Default command
CMD ["sh", "-c", "echo 'Container ready. Run migrations & functions here.'"]