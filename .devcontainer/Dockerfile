FROM mcr.microsoft.com/devcontainers/typescript-node:1-20-bullseye

# Avoid warnings by switching to noninteractive
ENV DEBIAN_FRONTEND=noninteractive

# Configure apt and install packages
RUN apt-get update \
    # Install the bits required for ChromeHeadless tests
    # Using Chromium instead of full Chrome (saves having to add additional download sites which
    # may be blocked in some environments.
    && apt-get install -y chromium chromium-l10n \
    # Clean up
    && apt-get autoremove -y \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

# Switch back to dialog for any ad-hoc use of apt-get
ENV DEBIAN_FRONTEND=
# Set environment variable so we can use chromium instead of chrome headless
ENV CHROME_BIN=/usr/bin/chromium
