from fastapi import FastAPI
from app.backend.preview_api import router as preview_router
from app.backend.timeline_api import router as timeline_router

app = FastAPI()

# Health check endpoint
@app.get("/")
def read_root():
    return {"status": "ok"}

# Include the preview API router
app.include_router(preview_router, prefix="/api")

# Include the timeline API router
app.include_router(timeline_router, prefix="/api") 