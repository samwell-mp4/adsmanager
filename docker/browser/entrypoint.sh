#!/bin/bash

echo "[browser-container] Starting profile runtime..."

export DISPLAY=:99
export SCREEN_WIDTH=${SCREEN_WIDTH:-1920}
export SCREEN_HEIGHT=${SCREEN_HEIGHT:-1080}
export SCREEN_DEPTH=${SCREEN_DEPTH:-24}
export LOCALE=${LOCALE:-pt-BR}
export TZ=${TIMEZONE:-America/Sao_Paulo}

# Ensure profile directory has proper permissions regardless of host volume UID
mkdir -p /home/browser/profile
mkdir -p /tmp/runtime
chown -R browser:browser /home/browser /tmp/runtime 2>/dev/null || true
chmod -R 777 /home/browser/profile /tmp/runtime 2>/dev/null || true

# 1. Start Xvfb
echo "[browser-container] Starting Xvfb on :99 (${SCREEN_WIDTH}x${SCREEN_HEIGHT}x${SCREEN_DEPTH})..."
Xvfb :99 -screen 0 ${SCREEN_WIDTH}x${SCREEN_HEIGHT}x${SCREEN_DEPTH} -ac +extension RANDR > /tmp/runtime/xvfb.log 2>&1 &
XVFB_PID=$!
sleep 1

# 2. Start Window Manager (Fluxbox)
echo "[browser-container] Starting Fluxbox..."
fluxbox > /tmp/runtime/fluxbox.log 2>&1 &
FLUXBOX_PID=$!
sleep 1

# 3. Start x11vnc on internal port 5900
echo "[browser-container] Starting x11vnc on port 5900..."
x11vnc -display :99 -forever -shared -rfbport 5900 -nopw -listen 0.0.0.0 > /tmp/runtime/x11vnc.log 2>&1 &
X11VNC_PID=$!
sleep 1

# 4. Start noVNC (websockify) on internal port 6080
echo "[browser-container] Starting noVNC websockify on port 6080..."
websockify --web /usr/share/novnc/ 6080 localhost:5900 > /tmp/runtime/novnc.log 2>&1 &
NOVNC_PID=$!
sleep 1

# 5. Local Proxy Handler (if upstream proxy configured)
CHROME_PROXY_ARGS=""
if [ -n "$PROXY_HOST" ]; then
    if [ -n "$PROXY_USER" ] || [ "$PROXY_TYPE" = "socks5" ] || [ "$PROXY_TYPE" = "socks4" ]; then
        echo "[browser-container] Starting local proxy bridge for authenticated/socks proxy..."
        LOCAL_PROXY_PORT=8888 node /usr/local/bin/proxy-forwarder.js > /tmp/runtime/proxy.log 2>&1 &
        PROXY_PID=$!
        sleep 1
        CHROME_PROXY_ARGS="--proxy-server=http://127.0.0.1:8888 --proxy-bypass-list=<-loopback>;localhost;127.0.0.1;::1 --disable-quic"
    else
        echo "[browser-container] Using direct unauthenticated proxy -> ${PROXY_TYPE}://${PROXY_HOST}:${PROXY_PORT}"
        CHROME_PROXY_ARGS="--proxy-server=${PROXY_TYPE}://${PROXY_HOST}:${PROXY_PORT} --proxy-bypass-list=<-loopback>;localhost;127.0.0.1;::1 --disable-quic"
    fi
fi

# Trap signals for graceful shutdown
cleanup() {
    echo "[browser-container] Received shutdown signal. Gracefully closing Chromium..."
    if [ -n "$CHROME_PID" ]; then
        kill -TERM "$CHROME_PID" 2>/dev/null || true
        wait "$CHROME_PID" 2>/dev/null || true
    fi
    echo "[browser-container] Stopping auxiliary services..."
    [ -n "$PROXY_PID" ] && kill -TERM "$PROXY_PID" 2>/dev/null || true
    [ -n "$NOVNC_PID" ] && kill -TERM "$NOVNC_PID" 2>/dev/null || true
    [ -n "$X11VNC_PID" ] && kill -TERM "$X11VNC_PID" 2>/dev/null || true
    [ -n "$FLUXBOX_PID" ] && kill -TERM "$FLUXBOX_PID" 2>/dev/null || true
    [ -n "$XVFB_PID" ] && kill -TERM "$XVFB_PID" 2>/dev/null || true
    echo "[browser-container] Shutdown complete."
    exit 0
}

trap cleanup SIGTERM SIGINT SIGHUP

# 6. Detect custom extensions
CUSTOM_EXTS=""
if [ -d "/home/browser/profile/custom_extensions" ]; then
    for ext_dir in /home/browser/profile/custom_extensions/*; do
        if [ -d "$ext_dir" ] && [ -f "$ext_dir/manifest.json" ]; then
            echo "[browser-container] Found extension: $ext_dir"
            if [ -z "$CUSTOM_EXTS" ]; then
                CUSTOM_EXTS="$ext_dir"
            else
                CUSTOM_EXTS="$CUSTOM_EXTS,$ext_dir"
            fi
        fi
    done
fi

LOAD_EXT_FLAG=""
if [ -n "$CUSTOM_EXTS" ]; then
    echo "[browser-container] Enabling extensions: $CUSTOM_EXTS"
    LOAD_EXT_FLAG="--load-extension=$CUSTOM_EXTS"
fi

# 7. Start Google Chrome Stable
echo "[browser-container] Starting Google Chrome with CDP on port 9222..."
google-chrome-stable \
    --no-sandbox \
    --disable-dev-shm-usage \
    --disable-gpu \
    --disable-software-rasterizer \
    --password-store=basic \
    --use-mock-keychain \
    --disable-background-networking \
    --disable-default-apps \
    --disable-sync \
    --disable-translate \
    --window-size=${SCREEN_WIDTH},${SCREEN_HEIGHT} \
    --start-maximized \
    --user-data-dir=/home/browser/profile \
    --remote-debugging-port=9222 \
    --remote-debugging-address=0.0.0.0 \
    --no-first-run \
    --no-default-browser-check \
    --lang=${LOCALE} \
    ${LOAD_EXT_FLAG} \
    ${CHROME_PROXY_ARGS} \
    "about:blank" &

CHROME_PID=$!

# Wait for Chrome to exit or monitor
wait $CHROME_PID
CHROME_EXIT=$?
echo "[browser-container] Chrome exited with code: $CHROME_EXIT"

# Print logs for diagnostics if Chrome crashed
if [ "$CHROME_EXIT" -ne 0 ]; then
    echo "=== /tmp/runtime/proxy.log ==="
    cat /tmp/runtime/proxy.log 2>/dev/null || true
    echo "=== /tmp/runtime/xvfb.log ==="
    cat /tmp/runtime/xvfb.log 2>/dev/null || true
    echo "=== /tmp/runtime/x11vnc.log ==="
    cat /tmp/runtime/x11vnc.log 2>/dev/null || true
    echo "=== /tmp/runtime/novnc.log ==="
    cat /tmp/runtime/novnc.log 2>/dev/null || true
fi

cleanup
