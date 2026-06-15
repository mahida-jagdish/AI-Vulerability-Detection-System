from sqlalchemy import text
from sqlalchemy.engine import Engine


def ensure_runtime_schema(engine: Engine) -> None:
    patches = [
        "ALTER TABLE findings ADD COLUMN IF NOT EXISTS owasp_category VARCHAR(128)",
        "ALTER TABLE findings ADD COLUMN IF NOT EXISTS verification_steps TEXT",
    ]
    with engine.begin() as conn:
        for statement in patches:
            conn.execute(text(statement))

