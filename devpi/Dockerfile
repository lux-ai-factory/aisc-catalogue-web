FROM python:3.12.15-slim

# Install curl so the entrypoint script can check server status
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# devpi-server, with devpi-web for its search pages and API. Exact versions: the entrypoint scripts
# against their login and PATCH /root behaviour, which a new release could change.
RUN pip install --no-cache-dir \
    "devpi-server==6.20.3" \
    "devpi-web==5.1.1" \
    "devpi-client==7.3.0"

# Set the data directory
ENV DEVPISERVER_SERVERDIR=/data
RUN mkdir -p $DEVPISERVER_SERVERDIR

# Initialize the devpi state during build
RUN devpi-init --serverdir $DEVPISERVER_SERVERDIR --no-root-pypi

# The server runs as this user, never as root, and the image starts as it. A volume an older image filled as root
# is handed to it by the stack's one-shot devpi-data-owner (the entrypoint does the same when started as root).
RUN groupadd --system --gid 10001 devpi \
    && useradd --system --uid 10001 --gid devpi --home-dir /nonexistent --no-create-home --shell /usr/sbin/nologin devpi \
    && chown -R devpi:devpi $DEVPISERVER_SERVERDIR

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
USER devpi

EXPOSE 3141

ENTRYPOINT ["/entrypoint.sh"]