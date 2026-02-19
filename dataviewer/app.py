import base64
import json
import math
import time
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum

import ibis
import ibis.expr.datatypes as dt
import pyarrow as pa
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from ibis.expr.types.relations import Table
from pydantic import BaseModel

from dataviewer.config import get_config
from dataviewer.data_indexing import get_dataset_name, infer_format
from dataviewer.db import (
    GLOBAL_TABLE,
    IbisDBDep,
    LanceDBDep,
    close_connections,
    initialize_connections,
)


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


class Base64JSONResponse(JSONResponse):
    def render(self, content: object) -> bytes:
        def sanitize(value: object) -> object:
            if isinstance(value, float) and not math.isfinite(value):
                return None
            if isinstance(value, dict):
                return {key: sanitize(val) for key, val in value.items()}
            if isinstance(value, (list, tuple, set)):
                return [sanitize(item) for item in value]
            return value

        def default(obj: object) -> object:
            if isinstance(obj, (bytes, bytearray, memoryview)):
                return base64.b64encode(bytes(obj)).decode("utf-8")
            if isinstance(obj, (datetime, date)):
                return obj.isoformat()
            if isinstance(obj, Decimal):
                return str(obj)
            raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")

        return json.dumps(
            sanitize(content),
            ensure_ascii=False,
            allow_nan=False,
            separators=(",", ":"),
            default=default,
        ).encode("utf-8")


app = FastAPI(title="Data Viewer", lifespan=lifespan)


@app.get("/ping", response_class=Base64JSONResponse, response_model=None)
async def ping(request: Request, lance_table: LanceDBDep) -> Base64JSONResponse:
    schema: pa.Schema = lance_table.schema

    full_schema = [
        {"name": field.name, "type": str(field.type), "nullable": field.nullable}
        for field in schema
    ]

    config = get_config()
    dataset_name = (
        get_dataset_name(config.dataset_path) if config.dataset_path else "Unknown Dataset"
    )
    dataset_format = infer_format(config.dataset_path).value if config.dataset_path else "unknown"

    response = {
        "configuration": {
            **config.model_dump(),
            "dataset_name": dataset_name,
            "dataset_format": dataset_format,
        },
        "dataset_info": {
            "num_rows": lance_table.count_rows(),
            "num_columns": len(lance_table.schema.names),
            "full_schema": full_schema,
        },
    }
    return Base64JSONResponse(content=response)


class FacetValue(BaseModel):
    value: str | int | float | bool | None
    count: int


class Facet(BaseModel):
    column: str
    values: list[FacetValue]


class FacetResponse(BaseModel):
    facets: list[Facet]


_FACETS_CACHE: FacetResponse | None = None


@app.get("/facets", response_model=FacetResponse)
async def get_facets(ibis: IbisDBDep) -> FacetResponse:
    """Get facet information for pre-configured facet columns."""
    global _FACETS_CACHE

    if _FACETS_CACHE is not None:
        return _FACETS_CACHE

    table = ibis.table(GLOBAL_TABLE)
    config = get_config()

    if not config.facet_columns:
        _FACETS_CACHE = FacetResponse(facets=[])
        return _FACETS_CACHE

    facets = []
    for facet_column in config.facet_columns:
        facet_counts = (
            table.group_by(facet_column).aggregate(count=table[facet_column].count()).execute()
        )
        values = []
        for _, row in facet_counts.iterrows():
            raw_value = row[facet_column]
            value = (
                None if isinstance(raw_value, float) and not math.isfinite(raw_value) else raw_value
            )
            values.append(FacetValue(value=value, count=row["count"]))  # type: ignore

        facets.append(Facet(column=facet_column, values=values))

    _FACETS_CACHE = FacetResponse(facets=facets)
    return _FACETS_CACHE


class Operator(StrEnum):
    GREATER_THAN = ">"
    LESS_THAN = "<"
    EQUALS = "=="
    NOT_EQUALS = "!="
    GREATER_THAN_OR_EQUALS = ">="
    LESS_THAN_OR_EQUALS = "<="
    IS_IN = "in"
    NOT_IN = "not in"
    BETWEEN = "between"


type CoercibleValue = str | int | float | bool | None | list[str | int | float | bool | None]


class Filter(BaseModel):
    column: str
    operator: Operator
    value: CoercibleValue
    is_column: bool = False

    def _coerce_value(self, value: str, type: dt.DataType) -> CoercibleValue:
        """Coerces a string value to the appropriate type based on the column type."""
        if isinstance(type, dt.Boolean):
            return value.lower() in ("true", "1", "yes")
        if isinstance(type, dt.Integer):
            return int(value)
        if isinstance(type, dt.Floating | dt.Decimal):
            return float(value)
        return value

    def get_filter(self, table: Table, coerce_types: bool = False) -> ibis.expr.types.BooleanColumn:
        col = table[self.column]
        value = table[self.value] if self.is_column else self.value  # type: ignore
        if coerce_types and not self.is_column:
            value = self._coerce_value(str(value), col.type())

        if not isinstance(value, list):
            if self.operator == Operator.GREATER_THAN:
                return col > value  # type: ignore
            elif self.operator == Operator.LESS_THAN:
                return col < value  # type: ignore
            elif self.operator == Operator.EQUALS:
                return col == value
            elif self.operator == Operator.NOT_EQUALS:
                return col != value
            elif self.operator == Operator.GREATER_THAN_OR_EQUALS:
                return col >= value  # type: ignore
            elif self.operator == Operator.LESS_THAN_OR_EQUALS:
                return col <= value  # type: ignore
        elif isinstance(value, list):
            if self.operator == Operator.IS_IN:
                return col.isin(value)  # type: ignore
            elif self.operator == Operator.NOT_IN:
                return ~col.isin(value)  # type: ignore
            elif self.operator == Operator.BETWEEN:
                assert isinstance(value, list) and len(value) == 2, (
                    "Value for 'between' operator must be a list of two elements"
                )
                return col.between(value[0], value[1])  # type: ignore
        else:
            raise ValueError(f"Unsupported operator: {self.operator}")


class Sort(BaseModel):
    column: str
    descending: bool = False


class SearchRequest(BaseModel):
    page: int = 0
    page_size: int = 10
    filters: list[Filter] | None = None
    sorts: list[Sort] | None = None
    raw_query: str | None = None
    coerce_types: bool = False


@app.post("/search", response_class=Base64JSONResponse, response_model=None)
async def search(request: SearchRequest, ibis: IbisDBDep) -> Base64JSONResponse:
    table = ibis.table(GLOBAL_TABLE)

    # For a raw query, we ignore filters, sorts, and pagination and just execute the query as is
    if not request.raw_query:
        filter_clauses = [
            x.get_filter(table, coerce_types=request.coerce_types) for x in request.filters or []
        ]
        sort_clauses = [
            table[x.column].desc() if x.descending else table[x.column].asc()
            for x in request.sorts or []
        ]

        if filter_clauses:
            table = table.filter(*filter_clauses)

        result_size = table.count()

        if sort_clauses:
            table = table.order_by(sort_clauses)

        table = table.limit(request.page_size, offset=request.page * request.page_size)
    else:
        table = ibis.sql(request.raw_query)
        result_size = table.count()

    schema: pa.Schema = table.schema().to_pyarrow()
    full_schema = [
        {"name": field.name, "type": str(field.type), "nullable": field.nullable}
        for field in schema
    ]

    start_time = time.perf_counter()
    results = table.to_polars().to_dicts()
    full_result_size = result_size.execute()
    execution_time_ms = (time.perf_counter() - start_time) * 1000

    return Base64JSONResponse(
        content={
            "data": results,
            "schema": full_schema,
            "total_rows": full_result_size,
            "execution_time_ms": execution_time_ms,
        }
    )


@app.get("/select", response_class=Base64JSONResponse, response_model=None)
async def select_by_id(id: str, ibis: IbisDBDep) -> Base64JSONResponse:
    config = get_config()
    if not config.id_column:
        return Base64JSONResponse(content={"error": "ID column not configured"}, status_code=400)

    table = ibis.table(GLOBAL_TABLE)
    result = table.filter(table[config.id_column] == id).execute()
    if result.empty:
        return Base64JSONResponse(content={"error": "Row not found"}, status_code=404)

    return Base64JSONResponse(content=result.iloc[0].to_dict())
