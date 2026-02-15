from collections.abc import AsyncGenerator
from typing import Annotated

import ibis
import lancedb
from fastapi import Depends
from ibis.backends.duckdb import Backend

GLOBAL_TABLE = "dataset"

ibis_connection: Backend | None = None
lancedb_conn: lancedb.DBConnection | None = None
lancedb_table: lancedb.Table | None = None


async def initialize_connections(cache_path: str, table_hash: str) -> None:
    global ibis_connection, lancedb_conn, lancedb_table
    ibis_connection = ibis.duckdb.connect(database=":memory:", threads=4)
    assert ibis_connection is not None, "Failed to initialize Ibis DuckDB connection"

    lancedb_conn = lancedb.connect(cache_path)
    lancedb_table = lancedb_conn.open_table(table_hash)

    ibis_connection.con.execute("""
        INSTALL lance FROM community;
        LOAD lance;
    """)

    dataset = lancedb_table.to_lance().scanner()
    ibis_connection.con.register(GLOBAL_TABLE, dataset)


async def close_connections() -> None:
    global ibis_connection, lancedb_conn, lancedb_table
    if ibis_connection is not None:
        ibis_connection.con.close()
        ibis_connection = None
    lancedb_table = None


async def get_duckdb_connection() -> AsyncGenerator[Backend, None]:
    global ibis_connection
    if ibis_connection is None:
        raise ValueError("DuckDB connection not initialized")
    yield ibis_connection


async def get_lancedb_table() -> AsyncGenerator[lancedb.Table, None]:
    global lancedb_table
    if lancedb_table is None:
        raise ValueError("LanceDB table not initialized")
    yield lancedb_table


IbisDBDep = Annotated[Backend, Depends(get_duckdb_connection)]
LanceDBDep = Annotated[lancedb.Table, Depends(get_lancedb_table)]
