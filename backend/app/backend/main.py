from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.backend.preview_api import router as preview_router
from app.backend.timeline_api import router as timeline_router
from app.backend.command_api import router as command_router
from app.backend.upload_api import router as upload_router

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/")
def read_root():
    return {"status": "ok"}

# Include the preview API router
app.include_router(preview_router, prefix="/api")

# Include the timeline API router
app.include_router(timeline_router, prefix="/api")

# Include the command API router
app.include_router(command_router, prefix="/api")

# Include the upload API router
app.include_router(upload_router, prefix="/api") 