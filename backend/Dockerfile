# Production-ready slim base image for Python backend
FROM python:3.11-slim

# Set environment keys
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Set workspace directory
WORKDIR /app

# Install system libraries required by psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Expose API port
EXPOSE 8000

# Start FastAPI application using uvicorn
CMD ["uvicorn", "main:app", "---host", "0.0.0.0", "---port", "8000"]
