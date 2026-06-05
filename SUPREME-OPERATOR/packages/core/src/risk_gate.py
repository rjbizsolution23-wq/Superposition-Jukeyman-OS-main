# packages/core/src/risk_gate.py — the load-bearing primitive

from enum import Enum
from typing import Literal, Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone

class RiskTier(str, Enum):
    GREEN = "green"    # Auto-execute
    YELLOW = "yellow"  # Auto-execute + log to daily digest
    RED = "red"        # HARD STOP — Rick must approve

class Action(BaseModel):
    """Every agent action is wrapped in this contract."""
    action_id: str = Field(..., description="UUID v7 for time-ordering")
    agent_role: str
    intent: str = Field(..., description="Natural-language goal of this action")
    tool: str = Field(..., description="MCP tool name")
    args: dict = Field(default_factory=dict)
    target: Optional[str] = Field(None, description="File path, URL, app name")
    reversible: bool = Field(..., description="Can we undo this in <60s?")
    blast_radius: int = Field(..., ge=1, le=5, description="1=this session only; 5=org-wide")
    spend_estimate_usd: float = Field(default=0.0)
    pii_touched: bool = Field(default=False)
    network_egress: bool = Field(default=False)
    requires_credentials: bool = Field(default=False)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Hardcoded Red triggers — non-negotiable. Adding to this list = Rick-approved PR only.
RED_TRIGGERS = {
    "tools": {
        "shell.exec_admin",
        "stripe.*_create", "stripe.*_update", "stripe.*_delete",
        "dns.*", "domain.purchase", "github.repo.make_public",
        "filesystem.delete", "database.drop_*", "database.alter_*",
        "auth.modify", "secrets.write_production",
        "terraform.destroy", "wrangler.deploy --env production",
    },
    "patterns": [
        ("network_egress", "pii_touched"),                # data exfil shape
        ("spend_estimate_usd", lambda v: v > 0.50),       # ANY real money
        ("blast_radius", lambda v: v >= 4),
        ("target", lambda t: t and t.startswith("https://api.stripe.com/v1/charges")),
    ],
}

YELLOW_TRIGGERS = {
    "tools": {
        "shell.exec", "filesystem.write", "github.pr.create",
        "package.install", "schema.migrate_dev",
    },
}

def classify(action: Action) -> RiskTier:
    """Pure function. Same input → same tier, every time."""
    # Red wins ties — fail-safe direction is conservative
    for trigger_tool in RED_TRIGGERS["tools"]:
        if action.tool == trigger_tool or (
            trigger_tool.endswith("*") and action.tool.startswith(trigger_tool[:-1])
        ):
            return RiskTier.RED
    
    for field, pred in RED_TRIGGERS["patterns"]:
        val = getattr(action, field, None)
        if callable(pred) and pred(val):
            return RiskTier.RED
        elif isinstance(pred, str) and val == pred:
            return RiskTier.RED
    
    if action.tool in YELLOW_TRIGGERS["tools"]:
        return RiskTier.YELLOW
    if not action.reversible or action.blast_radius >= 3:
        return RiskTier.YELLOW
    
    return RiskTier.GREEN

async def execute(action: Action, *, approver=None) -> dict:
    """The ONE chokepoint every action passes through."""
    tier = classify(action)
    await audit_log.write(action=action, tier=tier, phase="classified")
    
    if tier == RiskTier.RED:
        if not approver:
            raise BlockedByGate(f"RED action {action.tool} requires approval")
        approval = await approver.request(action)  # Slack/SMS/UI to Rick
        if not approval.granted:
            await audit_log.write(action=action, tier=tier, phase="denied")
            raise ApprovalDenied(approval.reason)
        await audit_log.write(action=action, tier=tier, phase="approved",
                              approver=approval.approver_id)
    
    # Snapshot before execute (Yellow + Red)
    if tier in (RiskTier.YELLOW, RiskTier.RED):
        snapshot_id = await snapshot.take(action)
    
    try:
        result = await tool_bus.invoke(action.tool, action.args)
        await audit_log.write(action=action, tier=tier, phase="executed", result=result)
        if tier in (RiskTier.YELLOW, RiskTier.RED):
            await verify.check(action, result)  # Post-action probe
        return result
    except Exception as e:
        await audit_log.write(action=action, tier=tier, phase="failed", error=str(e))
        if tier in (RiskTier.YELLOW, RiskTier.RED):
            await snapshot.rollback(snapshot_id)
        raise