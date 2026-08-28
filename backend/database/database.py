import sqlite3
import os
from pathlib import Path

DB_PATH = os.getenv("DB_PATH", "bharat_sentinel.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS incidents (
            id TEXT PRIMARY KEY,
            threat_type TEXT,
            severity TEXT,
            confidence REAL,
            investigation_summary TEXT,
            root_cause TEXT,
            risk_score REAL,
            risk_level TEXT,
            business_impact TEXT,
            recommendation TEXT,
            status TEXT DEFAULT 'open',
            human_approval TEXT DEFAULT 'pending',
            notion_page_id TEXT,
            raw_event TEXT,
            created_at TEXT,
            updated_at TEXT
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS security_events (
            id TEXT PRIMARY KEY,
            source TEXT,
            event_type TEXT,
            source_ip TEXT,
            destination TEXT,
            username TEXT,
            message TEXT,
            raw_payload TEXT,
            status TEXT DEFAULT 'RECEIVED',
            received_at TEXT
        )
    """)
    conn.commit()
    conn.close()
