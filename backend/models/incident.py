from pydantic import BaseModel, Field, model_validator
from typing import Optional, List, Any
from datetime import datetime


class SecurityEvent(BaseModel):
    event_type: str = Field(..., description="Type of security event")
    description: Optional[str] = Field(None, description="Event description")
    source_ip: Optional[str] = None
    target_user: Optional[str] = None
    # Accept "user" as an alias for target_user (common in real event payloads)
    user: Optional[str] = None
    location: Optional[str] = None
    timestamp: Optional[str] = None
    failed_attempts: Optional[int] = None
    additional_context: Optional[dict] = None

    @model_validator(mode="after")
    def _normalise(self) -> "SecurityEvent":
        # Promote "user" to target_user if target_user not set
        if self.user and not self.target_user:
            self.target_user = self.user
        # Build a description from structured fields when none is provided
        if not self.description:
            parts = [f"Security event type: {self.event_type}"]
            if self.target_user:
                parts.append(f"targeted account: {self.target_user}")
            if self.source_ip:
                parts.append(f"source IP: {self.source_ip}")
            if self.location:
                parts.append(f"location: {self.location}")
            if self.failed_attempts is not None:
                parts.append(f"failed attempts: {self.failed_attempts}")
            if self.additional_context:
                for k, v in self.additional_context.items():
                    parts.append(f"{k}: {v}")
            self.description = "; ".join(parts)
        return self


class ThreatDetectionResult(BaseModel):
    threat_detected: bool
    threat_type: str
    severity: str  # low|medium|high|critical
    confidence: float  # 0-100
    reason: str


class InvestigationResult(BaseModel):
    incident_summary: str
    root_cause: str
    evidence: List[str]
    attack_pattern: str
    recommended_action: str


class RiskAssessmentResult(BaseModel):
    risk_score: float  # 0-100
    risk_level: str  # low|medium|high|critical
    business_impact: str
    recommendation: str


class IncidentResponse(BaseModel):
    id: str
    threat_type: str
    severity: str
    confidence: float
    investigation_summary: str
    root_cause: str
    risk_score: float
    risk_level: str
    business_impact: str
    recommendation: str
    status: str
    human_approval: str
    notion_page_id: Optional[str]
    created_at: str
    updated_at: str


class AnalyzeRequest(BaseModel):
    event: SecurityEvent


class ApprovalRequest(BaseModel):
    notes: Optional[str] = None


class ReportRequest(BaseModel):
    incident_id: Optional[str] = None
    include_all: bool = True
