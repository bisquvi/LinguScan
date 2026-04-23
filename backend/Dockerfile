FROM python:3.11-slim-bookworm

WORKDIR /app

# Install system dependencies for OpenCV and EasyOCR
RUN apt-get -o Acquire::ForceIPv4=true update && apt-get -o Acquire::ForceIPv4=true install -y --no-install-recommends \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
# Also install torch separately to keep the image lightweight if needed, 
# but easyocr will install its own torch. We'll let easyocr do it.
# Added --default-timeout=1000 to prevent timeout on large packages like torch
RUN pip install --default-timeout=1000 --no-cache-dir -r requirements.txt

# Copy backend code
COPY . .

# Expose FastAPI port
EXPOSE 8000

# Run Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
