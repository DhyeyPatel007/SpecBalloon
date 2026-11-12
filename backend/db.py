# backend/db.py
from __future__ import annotations

import json
import os
import sqlite3
from pathlib import Path
from typing import Any

DB_PATH = os.getenv("SQLITE_DB_PATH", os.path.join(os.path.dirname(__file__), "specballoon.db"))
UPLOAD_TMP_DIR = os.getenv("UPLOAD_TMP_DIR", "/tmp/specballoon_uploads")


def get_db_connection() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(os.path.abspath(DB_PATH)), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


def init_db() -> None:
    conn = get_db_connection()
    try:
        with conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS drawings (
                    id TEXT PRIMARY KEY,
                    part_number TEXT,
                    part_name TEXT,
                    revision TEXT,
                    page_count INTEGER DEFAULT 1,
                    width REAL DEFAULT 842.0,
                    height REAL DEFAULT 595.0,
                    is_sample INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS characteristics (
                    id TEXT PRIMARY KEY,
                    drawing_id TEXT NOT NULL REFERENCES drawings(id) ON DELETE CASCADE,
                    char_no INTEGER NOT NULL,
                    zone TEXT,
                    designator TEXT,
                    raw_callout TEXT NOT NULL,
                    nominal REAL,
                    plus_tol REAL,
                    minus_tol REAL,
                    lsl REAL,
                    usl REAL,
                    units TEXT DEFAULT 'mm',
                    gauge TEXT,
                    status TEXT DEFAULT 'in_spec',
                    confidence REAL DEFAULT 100.0,
                    needs_review INTEGER DEFAULT 0,
                    review_reasons TEXT,
                    bbox_json TEXT,
                    position_json TEXT,
                    crop_base64 TEXT,
                    measured_value REAL,
                    lot_measurements_json TEXT
                );
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_chars_drawing_id ON characteristics(drawing_id);"
            )
    finally:
        conn.close()


def save_drawing(drawing: dict[str, Any]) -> None:
    conn = get_db_connection()
    try:
        with conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO drawings (
                    id, part_number, part_name, revision, page_count, width, height, is_sample
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    drawing["id"],
                    drawing.get("part_number", drawing.get("partNumber", "")),
                    drawing.get("part_name", drawing.get("partName", "")),
                    drawing.get("revision", "REV A"),
                    drawing.get("page_count", drawing.get("pageCount", 1)),
                    drawing.get("width", 842.0),
                    drawing.get("height", 595.0),
                    1 if drawing.get("is_sample", drawing.get("isDemo", False)) else 0,
                ),
            )
    finally:
        conn.close()


def get_drawing(drawing_id: str) -> dict[str, Any] | None:
    conn = get_db_connection()
    try:
        cur = conn.execute("SELECT * FROM drawings WHERE id = ?", (drawing_id,))
        row = cur.fetchone()
        if not row:
            return None
        return dict(row)
    finally:
        conn.close()


def save_characteristics(drawing_id: str, chars: list[dict[str, Any]]) -> None:
    conn = get_db_connection()
    try:
        with conn:
            for c in chars:
                bbox_json = json.dumps(c.get("bbox", {})) if isinstance(c.get("bbox"), (dict, list)) else c.get("bbox_json", "{}")
                pos_json = json.dumps(c.get("balloonPosition", {})) if isinstance(c.get("balloonPosition"), (dict, list)) else c.get("position_json", "{}")
                reasons = json.dumps(c.get("review_reasons", [])) if isinstance(c.get("review_reasons"), list) else c.get("review_reasons", "[]")
                lot = json.dumps(c.get("lotMeasurements", [])) if isinstance(c.get("lotMeasurements"), list) else c.get("lot_measurements_json", "[]")

                conn.execute(
                    """
                    INSERT OR REPLACE INTO characteristics (
                        id, drawing_id, char_no, zone, designator, raw_callout,
                        nominal, plus_tol, minus_tol, lsl, usl, units, gauge,
                        status, confidence, needs_review, review_reasons,
                        bbox_json, position_json, crop_base64, measured_value, lot_measurements_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        c["id"],
                        drawing_id,
                        c.get("char_no", c.get("balloonNumber", 1)),
                        c.get("zone", "A1"),
                        c.get("designator", "Standard"),
                        c.get("raw_callout", c.get("rawCallout", "")),
                        c.get("nominal", c.get("nominal_value")),
                        c.get("plus_tol", c.get("plusTolerance")),
                        c.get("minus_tol", c.get("minusTolerance")),
                        c.get("lsl"),
                        c.get("usl"),
                        c.get("units", "mm"),
                        c.get("gauge", c.get("instrument", "")),
                        c.get("status", "in_spec"),
                        c.get("confidence", 100.0),
                        1 if c.get("needs_review", False) else 0,
                        reasons,
                        bbox_json,
                        pos_json,
                        c.get("crop_base64", ""),
                        c.get("measured_value", c.get("measuredValue")),
                        lot,
                    ),
                )
    finally:
        conn.close()


def get_characteristics(drawing_id: str) -> list[dict[str, Any]]:
    conn = get_db_connection()
    try:
        cur = conn.execute(
            "SELECT * FROM characteristics WHERE drawing_id = ? ORDER BY char_no ASC",
            (drawing_id,),
        )
        rows = cur.fetchall()
        result: list[dict[str, Any]] = []
        for r in rows:
            d = dict(r)
            try:
                d["bbox"] = json.loads(d.pop("bbox_json", "{}"))
            except Exception:
                d["bbox"] = {}
            try:
                d["balloonPosition"] = json.loads(d.pop("position_json", "{}"))
            except Exception:
                d["balloonPosition"] = {}
            try:
                d["review_reasons"] = json.loads(d.pop("review_reasons", "[]"))
            except Exception:
                d["review_reasons"] = []
            try:
                d["lotMeasurements"] = json.loads(d.pop("lot_measurements_json", "[]"))
            except Exception:
                d["lotMeasurements"] = []
            d["needs_review"] = bool(d["needs_review"])
            # Aliases for frontend compatibility
            d["balloonNumber"] = d["char_no"]
            d["rawCallout"] = d["raw_callout"]
            d["plusTolerance"] = d["plus_tol"]
            d["minusTolerance"] = d["minus_tol"]
            d["instrument"] = d["gauge"]
            d["measuredValue"] = d["measured_value"]
            result.append(d)
        return result
    finally:
        conn.close()


def update_characteristic(drawing_id: str, char_id: str, updates: dict[str, Any]) -> dict[str, Any] | None:
    conn = get_db_connection()
    try:
        cur = conn.execute(
            "SELECT * FROM characteristics WHERE drawing_id = ? AND id = ?",
            (drawing_id, char_id),
        )
        row = cur.fetchone()
        if not row:
            return None

        # Build dynamic update statement
        allowed_cols = {
            "char_no", "zone", "designator", "raw_callout", "nominal", "plus_tol",
            "minus_tol", "lsl", "usl", "units", "gauge", "status", "confidence",
            "needs_review", "measured_value"
        }
        mapped_updates: dict[str, Any] = {}
        for k, v in updates.items():
            col = k
            if k == "balloonNumber":
                col = "char_no"
            elif k == "rawCallout":
                col = "raw_callout"
            elif k == "plusTolerance":
                col = "plus_tol"
            elif k == "minusTolerance":
                col = "minus_tol"
            elif k == "instrument":
                col = "gauge"
            elif k == "measuredValue":
                col = "measured_value"
            elif k == "bbox":
                mapped_updates["bbox_json"] = json.dumps(v)
                continue
            elif k == "balloonPosition":
                mapped_updates["position_json"] = json.dumps(v)
                continue
            elif k == "review_reasons":
                mapped_updates["review_reasons"] = json.dumps(v)
                continue
            elif k == "lotMeasurements":
                mapped_updates["lot_measurements_json"] = json.dumps(v)
                continue

            if col in allowed_cols:
                if col == "needs_review":
                    mapped_updates[col] = 1 if v else 0
                else:
                    mapped_updates[col] = v

        if mapped_updates:
            set_clauses = [f"{col} = ?" for col in mapped_updates.keys()]
            values = list(mapped_updates.values()) + [drawing_id, char_id]
            with conn:
                conn.execute(
                    f"UPDATE characteristics SET {', '.join(set_clauses)} WHERE drawing_id = ? AND id = ?",
                    values,
                )

        chars = get_characteristics(drawing_id)
        for c in chars:
            if c["id"] == char_id:
                return c
        return None
    finally:
        conn.close()


def update_characteristic_by_id(char_id: str, updates: dict[str, Any]) -> dict[str, Any] | None:
    conn = get_db_connection()
    try:
        cur = conn.execute(
            "SELECT drawing_id FROM characteristics WHERE id = ?",
            (char_id,),
        )
        row = cur.fetchone()
        if not row:
            return None
        drawing_id = row["drawing_id"]
        return update_characteristic(drawing_id, char_id, updates)
    finally:
        conn.close()


init_db()
