import time
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request

from dataviewer.config import get_config
from dataviewer.db import LanceDBDep, close_connections, initialize_connections


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    print("Initializing database connections...")
    config = get_config()
    assert config.cache_path is not None, "Cache path must be set in config"
    assert config.table_hash is not None, "Table hash must be set in config"
    start = time.perf_counter()
    await initialize_connections(config.cache_path, config.table_hash)
    elapsed = time.perf_counter() - start
    print(f"Database connections initialized in {elapsed:.3f}s")
    yield
    print("Closing database connections...")
    await close_connections()


app = FastAPI(title="Data Viewer", lifespan=lifespan)


@app.get("/ping")
async def ping(request: Request, lance_table: LanceDBDep) -> dict:
    response = {
        "configuration": get_config().model_dump(),
        "dataset_info": {
            "num_rows": lance_table.count_rows(),
            "num_columns": len(lance_table.schema.names),
        },
    }
    return response
