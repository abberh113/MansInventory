FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install uvicorn

# Copy the rest of the application
COPY . .

# Create uploads directory (it will be created by main.py but good to have here)
RUN mkdir -p uploads/products

# Expose port (Cloud Run sets PORT env var)
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
