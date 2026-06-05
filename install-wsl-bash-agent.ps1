#!/usr/bin/env bash
# =============================================================================
# WSL2 INSTALLATION + MASTER BASH AGENT SETUP
# Built by RJ Business Solutions | rickjeffersonsolutions.com
# Date: March 19, 2026
# =============================================================================
# This script installs WSL2 on Windows, sets up Ubuntu, and installs the Master Bash Agent
# Run this in PowerShell as Administrator: .\install-wsl-bash-agent.ps1
# =============================================================================

set -euo pipefail

# ── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

# ── Functions ───────────────────────────────────────────────────────────────
log() { echo -e "${GREEN}[INFO]${RESET} $*" >&2; }
warn() { echo -e "${YELLOW}[WARN]${RESET} $*" >&2; }
err() { echo -e "${RED}[ERROR]${RESET} $*" >&2; exit 1; }

# ── Check if running on Windows ──────────────────────────────────────────────
check_windows() {
  if [[ "$OSTYPE" != "msys" ]] && [[ "$OSTYPE" != "cygwin" ]]; then
    err "This script must be run on Windows (PowerShell or cmd)"
  fi
  log "Running on Windows ✓"
}

# ── Enable WSL feature ───────────────────────────────────────────────────────
enable_wsl_feature() {
  log "Enabling WSL feature..."
  dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart || true
  dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart || true
  log "WSL features enabled (restart may be required)"
}

# ── Install WSL2 kernel ──────────────────────────────────────────────────────
install_wsl_kernel() {
  local kernel_url="https://wslstorestorage.blob.core.windows.net/wslblob/wsl_update_x64.msi"
  local kernel_file="$TEMP/wsl_update_x64.msi"

  log "Downloading WSL2 kernel update..."
  curl -L -o "$kernel_file" "$kernel_url" || err "Failed to download WSL2 kernel"

  log "Installing WSL2 kernel..."
  msiexec /i "$kernel_file" /quiet /norestart || err "Failed to install WSL2 kernel"

  log "WSL2 kernel installed ✓"
}

# ── Set WSL2 as default ──────────────────────────────────────────────────────
set_wsl2_default() {
  log "Setting WSL2 as default version..."
  wsl --set-default-version 2 || warn "Failed to set WSL2 as default"
}

# ── Install Ubuntu ───────────────────────────────────────────────────────────
install_ubuntu() {
  log "Installing Ubuntu..."
  wsl --install -d Ubuntu || err "Failed to install Ubuntu"

  log "Ubuntu installed. Please set up your username and password when prompted."
  log "Then run: wsl -d Ubuntu"
}

# ── Copy Bash Agent to WSL ───────────────────────────────────────────────────
copy_bash_agent() {
  local wsl_home="/home/$(whoami)"
  local agent_source="./bash-agent.sh"
  local agent_dest="$wsl_home/bash-agent.sh"

  if [[ ! -f "$agent_source" ]]; then
    err "bash-agent.sh not found in current directory"
  fi

  log "Copying bash-agent.sh to WSL..."
  # Copy to WSL filesystem
  cp "$agent_source" "/mnt/c/Users/$(whoami)/bash-agent.sh" || err "Failed to copy agent"

  log "Agent copied to WSL ✓"
}

# ── Setup instructions ───────────────────────────────────────────────────────
show_setup_instructions() {
  cat << EOF
${CYAN}${BOLD}WSL2 + Master Bash Agent Setup Complete!${RESET}

Next steps:
1. ${YELLOW}Restart your computer${RESET} if prompted during WSL installation
2. Open Ubuntu from Start Menu (or run: wsl -d Ubuntu)
3. Set up your username and password when prompted
4. Run the following commands in Ubuntu:

   ${GREEN}# Update system${RESET}
   sudo apt update && sudo apt upgrade -y

   ${GREEN}# Install additional tools${RESET}
   sudo apt install -y curl wget git unzip

   ${GREEN}# Copy and setup the Master Bash Agent${RESET}
   cp /mnt/c/Users/$(whoami)/bash-agent.sh ~/
   chmod +x ~/bash-agent.sh

   ${GREEN}# Run the agent${RESET}
   ~/bash-agent.sh

${CYAN}${BOLD}The Master Bash Agent will guide you through:${RESET}
• Node.js + pnpm setup
• Python + virtualenv setup
• Docker + compose setup
• Git + GitHub SSH setup
• Full dev environment configuration
• Server monitoring scripts
• And much more!

${FIRE}Happy Bash scripting! 🔥${RESET}
EOF
}

# ── Main ────────────────────────────────────────────────────────────────────
main() {
  log "Starting WSL2 + Master Bash Agent installation..."

  check_windows
  enable_wsl_feature
  install_wsl_kernel
  set_wsl2_default
  install_ubuntu
  copy_bash_agent
  show_setup_instructions

  log "Installation complete! Please restart and set up Ubuntu."
}

main "$@"