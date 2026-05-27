FROM mcr.microsoft.com/devcontainers/typescript-node:4-24-trixie

COPY --chmod=0755 post-start.sh /usr/local/bin/devcontainer-post-start

# Avoid warnings by switching to noninteractive
ENV DEBIAN_FRONTEND=noninteractive

# Configure apt and install packages
RUN apt-get update \
    # Install the bits required for ChromeHeadless tests
    # Using Chromium instead of full Chrome (saves having to add additional download sites which
    # may be blocked in some environments.
    && apt-get install -y --no-install-recommends chromium chromium-l10n python3-pip pipx \
    # Install Commitizen so release configuration can be validated locally.
    && PIPX_HOME=/opt/pipx PIPX_BIN_DIR=/usr/local/bin pipx install commitizen \
    # Clean up
    && apt-get autoremove -y \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

# Switch back to dialog for any ad-hoc use of apt-get
ENV DEBIAN_FRONTEND=
# Set environment variable so we can use chromium instead of chrome headless
ENV CHROME_BIN=/usr/bin/chromium
