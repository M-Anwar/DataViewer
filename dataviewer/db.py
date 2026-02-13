from collections.abc import AsyncGenerator
from typing import Annotated

import duckdb
import lancedb
from fastapi import Depends

duckdb_conn: duckdb.DuckDBPyConnection | None = None
lancedb_conn: lancedb.DBConnection | None = None
lancedb_table: lancedb.Table | None = None


async def initialize_connections(cache_path: str, table_hash: str) -> None:
    global duckdb_conn, lancedb_conn, lancedb_table
    duckdb_conn = duckdb.connect(database=":memory:", config={"threads": 4})
    lancedb_conn = lancedb.connect(cache_path)
    lancedb_table = lancedb_conn.open_table(table_hash)

    duckdb_conn.execute("""
        INSTALL lance FROM community;
        LOAD lance;
    """)

    dataset = lancedb_table.to_lance()
    duckdb_conn.register("dataset", dataset)


async def close_connections() -> None:
    global duckdb_conn, lancedb_conn, lancedb_table
    if duckdb_conn is not None:
        duckdb_conn.close()
        duckdb_conn = None
    lancedb_table = None


async def get_duckdb_connection() -> AsyncGenerator[duckdb.DuckDBPyConnection, None]:
    global duckdb_conn
    if duckdb_conn is None:
        raise ValueError("DuckDB connection not initialized")
    cursor = duckdb_conn.cursor()
    try:
        yield cursor
    finally:
        cursor.close()


async def get_lancedb_table() -> AsyncGenerator[lancedb.Table, None]:
    global lancedb_table
    if lancedb_table is None:
        raise ValueError("LanceDB table not initialized")
    yield lancedb_table


DuckDBDep = Annotated[duckdb.DuckDBPyConnection, Depends(get_duckdb_connection)]
LanceDBDep = Annotated[lancedb.Table, Depends(get_lancedb_table)]
