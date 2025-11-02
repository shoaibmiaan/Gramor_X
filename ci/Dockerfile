FROM node:20-bullseye

RUN apt-get update && \
    apt-get install -y curl ca-certificates git build-essential && \
    rm -rf /var/lib/apt/lists/*

ARG SUPABASE_CLI_VERSION=1.56.0
RUN curl -L "https://github.com/supabase/cli/releases/download/v${SUPABASE_CLI_VERSION}/supabase_${SUPABASE_CLI_VERSION}_linux_amd64.tar.gz" \
  | tar -xz -C /usr/local/bin

WORKDIR /workspace
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
COPY ci/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENV PATH="/workspace/node_modules/.bin:${PATH}"
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
