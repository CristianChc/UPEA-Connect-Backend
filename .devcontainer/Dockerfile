FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

# 1. Utilidades del sistema
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    tmux \
    fzf \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    libpq-dev \
    build-essential \
    httpie \
    sudo \
    ca-certificates \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# 2. Usuario "vscode": Codespaces requiere este nombre exacto para poder conectarse
RUN useradd -m -s /bin/bash vscode && echo "vscode ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# 3. Neovim (nombre de asset vigente: nvim-linux-x86_64, ya no nvim-linux64)
RUN curl -LO https://github.com/neovim/neovim/releases/latest/download/nvim-linux-x86_64.tar.gz \
    && tar -C /usr/local -xzf nvim-linux-x86_64.tar.gz \
    && ln -s /usr/local/nvim-linux-x86_64/bin/nvim /usr/local/bin/nvim \
    && rm nvim-linux-x86_64.tar.gz

# 4. Lazygit (versión fija, evita el rate-limit de la API anónima de GitHub)
RUN LAZYGIT_VERSION="0.44.1" \
    && curl -Lo lazygit.tar.gz "https://github.com/jesseduffield/lazygit/releases/download/v${LAZYGIT_VERSION}/lazygit_${LAZYGIT_VERSION}_Linux_x86_64.tar.gz" \
    && tar -xf lazygit.tar.gz lazygit \
    && install lazygit /usr/local/bin \
    && rm lazygit.tar.gz lazygit

# 5. OpenCode: el instalador oficial coloca el binario en $HOME/.opencode/bin
RUN mkdir -p /home/vscode/.opencode/bin \
    && chown -R vscode:vscode /home/vscode/.opencode/bin \
    &J& HOME=/home/vscode /bin/su -s /bin/bash vscode -c 'curl -fsSL https://opencode.ai/install | bash -s -- --no-modify-path' \
    && ln -sf /home/vscode/.opencode/bin/opencode /usr/local/bin/opencode

# 6. Entorno Python para pgcli, como usuario vscode
USER vscode
ENV VIRTUAL_ENV=/home/vscode/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:/home/vscode/.opencode/bin:$PATH"

RUN pip install --no-cache-dir pgcli
