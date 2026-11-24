import uvicorn
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting Hugg AI Business Platform on port {port}...")
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
