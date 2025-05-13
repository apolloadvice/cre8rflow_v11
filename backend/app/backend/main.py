from fastapi import FastAPI
from src.backend.preview_api import router as preview_router

app = FastAPI()

# Health check endpoint
@app.get("/")
def read_root():
    return {"status": "ok"}

# Include the preview API router
app.include_router(preview_router, prefix="/api") 