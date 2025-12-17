# Dockerfile for MFRM R Backend
# Multi-stage build for optimized image size

# Base image with R
FROM r-base:4.3.2

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev \
    libcurl4-openssl-dev \
    libssl-dev \
    libxml2-dev \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install R packages
RUN R -e "install.packages(c(\
    'plumber', \
    'TAM', \
    'RPostgreSQL', \
    'jsonlite', \
    'dplyr', \
    'dotenv' \
    ), repos='https://cran.rstudio.com/')"

# Copy application files
COPY *.R ./
COPY .env.example ./

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the API
CMD ["R", "-e", "pr <- plumber::plumb('fluber.R'); pr$run(host='0.0.0.0', port=8000)"]

