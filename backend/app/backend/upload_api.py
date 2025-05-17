from fastapi import APIRouter, File, UploadFile
import os
from fastapi.responses import JSONResponse

router = APIRouter()

UPLOAD_DIR = "uploaded_videos"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    file_location = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_location, "wb") as f:
        f.write(await file.read())
    # Return a relative path for use in the asset store and timeline
    return JSONResponse({"file_path": f"{UPLOAD_DIR}/{file.filename}"}) 