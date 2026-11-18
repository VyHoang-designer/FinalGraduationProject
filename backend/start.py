# ==============================================================================
# FILE: backend/start.py
# MÔ TẢ: Khởi chạy Uvicorn server cho môi trường cục bộ (Local Development)
# ==============================================================================
import os
import sys
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "127.0.0.1")
    
    print("=" * 60, flush=True)
    print(f"🚀 [Local Startup] Khởi động Uvicorn server tại http://{host}:{port}", flush=True)
    print(f"🐍 Python version: {sys.version}", flush=True)
    print("=" * 60, flush=True)

    uvicorn.run("api:app", host=host, port=port, reload=True, log_level="info")

