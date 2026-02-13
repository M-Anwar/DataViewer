from fastapi import FastAPI, Request

from dataviewer.config import ViewArgs, get_config

app = FastAPI(title="Data Viewer")


@app.get("/ping")
async def ping(request: Request) -> ViewArgs:
    return get_config()
