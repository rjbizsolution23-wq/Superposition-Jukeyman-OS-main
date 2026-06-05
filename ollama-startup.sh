#!/bin/bash
# Ollama startup script for GCP VM

# Install NVIDIA drivers
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update
sudo apt-get install -y nvidia-driver-535 nvidia-container-toolkit

# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama service
sudo systemctl enable ollama
sudo systemctl start ollama

# Pull popular models
ollama pull llama3.1:70b
ollama pull llama3.1:8b
ollama pull codellama:34b
ollama pull mistral:7b
ollama pull phi3:14b
ollama pull qwen2:72b

# Create systemd service for Ollama API
sudo tee /etc/systemd/system/ollama-api.service > /dev/null <<EOF
[Unit]
Description=Ollama API Server
After=network.target

[Service]
Type=simple
User=ollama
Group=ollama
ExecStart=/usr/local/bin/ollama serve
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable ollama-api
sudo systemctl start ollama-api

# Open port 11434
sudo ufw allow 11434

echo "Ollama server ready with GPU acceleration"