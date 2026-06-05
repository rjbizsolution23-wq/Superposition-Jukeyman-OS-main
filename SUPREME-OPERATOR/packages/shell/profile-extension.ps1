# packages/shell/profile-extension.ps1 — Enhanced PowerShell profile with agent hooks

# ── RJ Business Solutions — Supreme Operator Environment ──────────────────────

# Load PSAI + custom modules
Import-Module PSAI -ErrorAction Stop
Import-Module SupremeOperator.Shell -ErrorAction Stop  # our module

# ── Strict Mode ───────────────────────────────────────────────────────────────
$ErrorActionPreference = "Stop"
Set-StrictMode -Version 3.0

# ── Always require explicit confirmation for destructive operations ──────────
$ConfirmPreference = "High"

# ── Environment Variables ─────────────────────────────────────────────────────
$env:SUPREME_OPERATOR_LOG = "$env:LOCALAPPDATA\SupremeOperator\agent.log"
$env:SUPREME_OPERATOR_DB = "postgresql://operator:changeme123@localhost:5432/supreme_operator"
$env:SUPREME_OPERATOR_REDIS = "redis://:changeme123@localhost:6379"

# ── Logging Function ──────────────────────────────────────────────────────────
function Write-AgentLog {
    param([string]$Message, [string]$Level = "INFO")
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogEntry = "[$Timestamp] [$Level] $Message"
    Add-Content -Path $env:SUPREME_OPERATOR_LOG -Value $LogEntry
}

# ── Risk-Tiered Command Execution ─────────────────────────────────────────────
function Invoke-AgentCommand {
    [CmdletBinding(SupportsShouldProcess, ConfirmImpact='High')]
    param(
        [Parameter(Mandatory)] [string] $Command,
        [Parameter(Mandatory)] [ValidateSet('green','yellow','red')] [string] $RiskTier,
        [Parameter(Mandatory)] [string] $ActionId,
        [string] $Reason = "agent-driven"
    )
    # Audit before execute
    $entry = @{
        action_id = $ActionId
        command   = $Command
        risk      = $RiskTier
        reason    = $Reason
        user      = $env:USERNAME
        ts        = (Get-Date -Format o)
    } | ConvertTo-Json -Compress
    Add-Content -Path "$env:LOCALAPPDATA\SupremeOperator\audit.jsonl" -Value $entry

    # Red-tier requires explicit approval token
    if ($RiskTier -eq 'red') {
        $token = Read-Host "RED-tier command. Paste approval token from UI"
        if (-not (Test-ApprovalToken -Token $token -ActionId $ActionId)) {
            throw "Approval token invalid or expired"
        }
    }

    # Snapshot before execute (Yellow + Red)
    if ($RiskTier -in @('yellow','red')) {
        $snap = New-AgentSnapshot -ActionId $ActionId
    }

    if ($PSCmdlet.ShouldProcess($Command, "execute under risk=$RiskTier")) {
        try {
            $result = Invoke-Expression $Command 2>&1
            Write-AgentLog "Executed: $Command" "SUCCESS"
            return $result
        } catch {
            Write-AgentLog "Failed: $Command - $($_.Exception.Message)" "ERROR"
            if ($snap) { Restore-AgentSnapshot -SnapshotId $snap }
            throw
        }
    }
}

# ── Agent Hooks on Command Execution ──────────────────────────────────────────
$ExecutionContext.InvokeCommand.CommandNotFoundAction = {
    param($commandName, $eventArgs)
    Write-AgentLog "Command not found: $commandName" "DEBUG"
    # Log for agent learning
}

# ── Custom Prompt with Agent Status ──────────────────────────────────────────
function prompt {
    $agent_status = if (Get-Module PSAI -ErrorAction SilentlyContinue) { "🤖" } else { "" }
    "$agent_status PS $($executionContext.SessionState.Path.CurrentLocation)> "
}

# ── AI Shell Integration ──────────────────────────────────────────────────────
Set-Alias askai Invoke-AIShell

# ── Utility Aliases ──────────────────────────────────────────────────────────
Set-Alias ll Get-ChildItem
Set-Alias la Get-ChildItem -Force
Set-Alias l Get-ChildItem -Directory
Set-Alias .. Set-Location ..
Set-Alias ... Set-Location ../..
Set-Alias gs git status
Set-Alias ga git add .
Set-Alias gc git commit -m
Set-Alias gp git push
Set-Alias gl git log --oneline --graph --decorate -15
Set-Alias dk docker
Set-Alias dkc docker compose
Set-Alias tf terraform
Set-Alias wr wrangler

# ── Welcome Message ──────────────────────────────────────────────────────────
Write-Host "🤖 Supreme Operator v1.0 — RJ Business Solutions" -ForegroundColor Cyan
Write-Host "🔥 Risk-Gated Autonomous Agent Environment Active" -ForegroundColor Yellow
Write-Host "💡 Type 'help' for available commands" -ForegroundColor Green
Write-Host ""

# ── Auto-Start Critical Services ─────────────────────────────────────────────
# Only if not already running
if (-not (Get-Process -Name "SupremeOperator" -ErrorAction SilentlyContinue)) {
    Write-AgentLog "Starting Supreme Operator services..." "INFO"
    # Start background services
    Start-Job -ScriptBlock {
        # Monitor for agent commands
        while ($true) {
            Start-Sleep -Seconds 60
            # Health check logic here
        }
    } -Name "SupremeOperatorMonitor"
}

Write-AgentLog "Profile loaded successfully" "INFO"