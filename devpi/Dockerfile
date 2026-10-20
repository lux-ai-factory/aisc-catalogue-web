FROM python:3.12-slim

# Install curl so the entrypoint script can check server status
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Install devpi-server and common plugins
# devpi-web provides the search UI and better API support
RUN pip install --no-cache-dir \
    "devpi-server>=6.19.2" \
    "devpi-web>=5.0.2" \
    "devpi-client>=7.2.1"

# Set the data directory
ENV DEVPISERVER_SERVERDIR=/data
RUN mkdir -p $DEVPISERVER_SERVERDIR

# Initialize the devpi state during build
RUN devpi-init --serverdir $DEVPISERVER_SERVERDIR --no-root-pypi

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3141

ENTRYPOINT ["/entrypoint.sh"]