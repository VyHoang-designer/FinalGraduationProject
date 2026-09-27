import os
import sys

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from database import engine
from sqlalchemy import text

with engine.begin() as conn:
    conn.execute(text("UPDATE job_descriptions SET image = '/images/hochiminh.png' WHERE location LIKE '%Hồ Chí Minh%'"))
    conn.execute(text("UPDATE job_descriptions SET image = '/images/DaNang.png' WHERE location LIKE '%Đà Nẵng%'"))
    conn.execute(text("UPDATE job_descriptions SET image = '/images/hanoi.png' WHERE location LIKE '%Hà Nội%'"))
    print('Updated existing JDs with images')
