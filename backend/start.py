# ==============================================================================
# FILE: backend/start.py
# MÔ TẢ: Khởi chạy Uvicorn server cho Render.com & Production Deployment
# ==============================================================================
import os
import sys
import uvicorn

if __name__ == "__main__":
    # Render tự động gán biến PORT (mặc định 10000)
    port = int(os.environ.get("PORT", 10000))
    host = "0.0.0.0"
    
    print("=" * 60, flush=True)
    print(f"🚀 [Render Startup] Khởi động Uvicorn server tại {host}:{port}", flush=True)
    print(f"🐍 Python version: {sys.version}", flush=True)
    print("=" * 60, flush=True)

    uvicorn.run("api:app", host=host, port=port, log_level="info")
