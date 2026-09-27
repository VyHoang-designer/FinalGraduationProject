from database import engine
from sqlalchemy import text
with engine.begin() as conn:
    try:
        conn.execute(text("ALTER TABLE job_descriptions ADD COLUMN custom_criteria JSON DEFAULT '[]'::json;"))
        print('Added custom_criteria')
    except Exception as e:
        print('custom_criteria error:', e)
    try:
        conn.execute(text("ALTER TABLE match_results ADD COLUMN custom_criteria_results JSON DEFAULT '[]'::json;"))
        print('Added custom_criteria_results')
    except Exception as e:
        print('custom_criteria_results error:', e)
