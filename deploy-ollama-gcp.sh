#!/usr/bin/env bash
# Deploy Ollama on Google Cloud Compute Engine with GPU support
# Run this on your local machine with gcloud CLI installed

# Set variables
PROJECT_ID="596791791098"
ZONE="us-central1-a"
MACHINE_TYPE="n1-standard-8"
GPU_TYPE="nvidia-tesla-t4"
GPU_COUNT="1"
DISK_SIZE="200GB"
IMAGE_FAMILY="ubuntu-2204-lts"
IMAGE_PROJECT="ubuntu-os-cloud"
BOOT_DISK_TYPE="pd-ssd"

# Create VM with GPU
gcloud compute instances create ollama-server \
  --project=$PROJECT_ID \
  --zone=$ZONE \
  --machine-type=$MACHINE_TYPE \
  --accelerator=type=$GPU_TYPE,count=$GPU_COUNT \
  --boot-disk-size=$DISK_SIZE \
  --boot-disk-type=$BOOT_DISK_TYPE \
  --image-family=$IMAGE_FAMILY \
  --image-project=$IMAGE_PROJECT \
  --maintenance-policy=TERMINATE \
  --restart-on-failure \
  --tags=ollama \
  --metadata-from-file=startup-script=ollama-startup.sh

# Create firewall rule for Ollama API
gcloud compute firewall-rules create allow-ollama \
  --project=$PROJECT_ID \
  --allow=tcp:11434 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=ollama \
  --description="Allow Ollama API access"

echo "Ollama server deployed. External IP:"
gcloud compute instances describe ollama-server \
  --project=$PROJECT_ID \
  --zone=$ZONE \
  --format="get(networkInterfaces[0].accessConfigs[0].natIP)"