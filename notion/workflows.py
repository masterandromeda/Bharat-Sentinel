"""
Notion workflow helpers — higher-level wrappers around notion_client.
"""
from notion.notion_client import create_incident_page, update_incident_status

__all__ = ["create_incident_page", "update_incident_status"]
