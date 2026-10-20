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

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3141

ENTRYPOINT ["/entrypoint.sh"]