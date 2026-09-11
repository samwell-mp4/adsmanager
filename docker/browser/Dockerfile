FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies, display server, window manager, VNC, noVNC, websockify, fonts and Node.js
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    wget \
    gnupg \
    xvfb \
    x11vnc \
    fluxbox \
    dbus-x11 \
    procps \
    curl \
    unzip \
    fonts-liberation \
    fonts-noto-color-emoji \
    novnc \
    websockify \
    nodejs \
    && rm -rf /var/lib/apt/lists/*

# Add Google Chrome repository and install google-chrome-stable
RUN wget -qO- https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google.gpg && \
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list && \
    apt-get update && apt-get install -y --no-install-recommends google-chrome-stable && \
    rm -rf /var/lib/apt/lists/*

# Create dedicated browser user
RUN useradd -m -u 1000 -s /bin/bash browser && \
    mkdir -p /home/browser/profile /tmp/runtime && \
    chown -R browser:browser /home/browser /tmp/runtime

# Copy proxy forwarder helper and entrypoint script
COPY proxy-forwarder.js /usr/local/bin/proxy-forwarder.js
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh /usr/local/bin/proxy-forwarder.js

USER browser
ENV HOME=/home/browser

# Expose VNC (5900), noVNC (6080), CDP Remote Debugging (9222)
EXPOSE 5900 6080 9222

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
