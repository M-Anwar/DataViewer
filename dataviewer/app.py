from fastapi import FastAPI, Request

from dataviewer.config import get_config

app = FastAPI(title="Data Viewer")


@app.get("/ping")
async def ping(request: Request):
    return get_config()
