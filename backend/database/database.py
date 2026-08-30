import sqlite3
import os
import uuid
from datetime import datetime

DB_PATH = os.getenv("DB_PATH", "bharat_sentinel.db")

# Demo account — created automatically on first startup
DEMO_EMAIL    = "demo@bharatsentinel.in"
DEMO_PASSWORD = "Demo@2026"


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            hashed_password TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
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

    # Seed demo account if it doesn't exist yet
    _seed_demo_user(conn)

    conn.close()


def _seed_demo_user(conn):
    """Insert the demo account on first run. Safe to call every startup — skips if exists."""
    existing = conn.execute(
        "SELECT id FROM users WHERE email = ?", (DEMO_EMAIL,)
    ).fetchone()
    if existing:
        return

    try:
        import bcrypt as _bcrypt
        hashed = _bcrypt.hashpw(
            DEMO_PASSWORD.encode("utf-8"), _bcrypt.gensalt()
        ).decode("utf-8")
    except ImportError:
        # bcrypt not available — skip seeding (user can register manually)
        return

    now = datetime.utcnow().isoformat()
    conn.execute(
        "INSERT INTO users (id, email, hashed_password, created_at, updated_at) VALUES (?,?,?,?,?)",
        (str(uuid.uuid4()), DEMO_EMAIL, hashed, now, now),
    )
    conn.commit()
