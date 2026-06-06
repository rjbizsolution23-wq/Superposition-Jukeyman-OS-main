#!/usr/bin/env bash
# Deploy GPU Media Server on Google Cloud Compute Engine with GPU support
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

# Read HF Token from .env.local if present
HF_TOKEN=""
if [ -f "SUPREME-OPERATOR/.env.local" ]; then
  HF_TOKEN=$(grep HUGGINGFACE_TOKEN SUPREME-OPERATOR/.env.local | cut -d '=' -f2)
fi

echo "Deploying GPU Media Server on GCP..."
echo "Project: $PROJECT_ID"
echo "Zone: $ZONE"

# Create VM with GPU and startup script
gcloud compute instances create gpu-media-server \
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
  --tags=gpu-media-server \
  --metadata-from-file=startup-script=media-startup.sh \
  --metadata=hf-token="$HF_TOKEN"

# Create firewall rule for GPU Media API
gcloud compute firewall-rules create allow-gpu-media \
  --project=$PROJECT_ID \
  --allow=tcp:8000 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=gpu-media-server \
  --description="Allow GPU Media Server API access"

echo "Deployment submitted successfully. Server will be active in 5-10 minutes."
echo "External IP:"
gcloud compute instances describe gpu-media-server \
  --project=$PROJECT_ID \
  --zone=$ZONE \
  --format="get(networkInterfaces[0].accessConfigs[0].natIP)"
