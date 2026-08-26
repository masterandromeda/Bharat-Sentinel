from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class SecurityEvent(BaseModel):
    event_type: str = Field(..., description="Type of security event")
    description: str = Field(..., description="Event description")
    source_ip: Optional[str] = None
    target_user: Optional[str] = None
    location: Optional[str] = None
    timestamp: Optional[str] = None
    additional_context: Optional[dict] = None


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
