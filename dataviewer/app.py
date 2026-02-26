import base64
import json
import math
import time
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum
from pathlib import Path

import ibis
import ibis.expr.datatypes as dt
import pyarrow as pa
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, RedirectResponse
from ibis.expr.types.relations import Table
from pydantic import BaseModel
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import Response
from starlette.staticfiles import StaticFiles

from dataviewer.config import get_config
from dataviewer.data_indexing import get_dataset_name, infer_format
from dataviewer.db import (
    GLOBAL_TABLE,
    IbisDBDep,
    LanceDBDep,
    close_connections,
    initialize_connections,
)
from dataviewer.row_visualizer_plugin import RowVisualizerPlugin, load_plugin

row_visualizer_plugin: RowVisualizerPlugin[BaseModel] | None = None

FRONTEND_BUILD_DIR = Path(__file__).resolve().parent / "webui"
FRONTEND_INDEX_FILE = FRONTEND_BUILD_DIR / "index.html"


class SPAStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope: dict[str, object]) -> Response:  # type: ignore[override]
        if path == "api" or path.startswith("api/"):
            raise StarletteHTTPException(status_code=404)

        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            if exc.status_code != 404 or not FRONTEND_INDEX_FILE.exists():
                raise
            return await super().get_response("index.html", scope)


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

    if config.plugin_path:
        print(f"Loading plugin from {config.plugin_path}...")
        global row_visualizer_plugin
        row_visualizer_plugin = load_plugin(config.plugin_path)
        print(f"Plugin '{row_visualizer_plugin.__class__.__name__}' loaded successfully")

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


app = FastAPI(
    title="Data Viewer",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)


@app.get("/api/ping", response_class=Base64JSONResponse, response_model=None)
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


@app.get("/api/facets", response_model=FacetResponse)
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


@app.post("/api/search", response_class=Base64JSONResponse, response_model=None)
async def search(request: SearchRequest, ibis: IbisDBDep) -> Base64JSONResponse:
    try:
        table = ibis.table(GLOBAL_TABLE)

        # For a raw query, we ignore filters, sorts, and pagination and just execute the query as is
        if not request.raw_query:
            filter_clauses = [
                x.get_filter(table, coerce_types=request.coerce_types)
                for x in request.filters or []
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
    except Exception as exc:
        message = str(exc).strip()
        error_message = (
            f"{exc.__class__.__name__}: {message}" if message else exc.__class__.__name__
        )
        return Base64JSONResponse(
            content={"error": error_message},
            status_code=500,
        )


@app.get("/api/select", response_class=Base64JSONResponse, response_model=None)
async def select_by_id(id: str, ibis: IbisDBDep) -> Base64JSONResponse:
    config = get_config()
    if not config.id_column:
        return Base64JSONResponse(content={"error": "ID column not configured"}, status_code=400)

    table = ibis.table(GLOBAL_TABLE)
    result = table.filter(table[config.id_column] == id).limit(1).execute()
    if result.empty:
        return Base64JSONResponse(content={"error": "Row not found"}, status_code=404)

    return Base64JSONResponse(content=result.iloc[0].to_dict())


class VisualizationRequest(BaseModel):
    id: str
    plugin_settings: dict | None = None


@app.post("/api/get_row_visualization", response_class=Base64JSONResponse, response_model=None)
async def get_row_visualization(
    request: VisualizationRequest, ibis: IbisDBDep
) -> Base64JSONResponse:
    global row_visualizer_plugin

    config = get_config()
    if config.reload_plugin:
        if not config.plugin_path:
            return Base64JSONResponse(
                content={"error": "No visualization plugin configured"}, status_code=400
            )
        try:
            row_visualizer_plugin = load_plugin(config.plugin_path)
        except Exception as exc:
            return Base64JSONResponse(
                content={"error": f"Failed to reload plugin: {exc}"}, status_code=500
            )

    if row_visualizer_plugin is None:
        return Base64JSONResponse(
            content={"error": "No visualization plugin configured"}, status_code=400
        )

    if not config.id_column:
        return Base64JSONResponse(content={"error": "ID column not configured"}, status_code=400)

    # Update settings based on request parameters if provided,
    # otherwise use defaults from the plugin
    settings = row_visualizer_plugin.plugin_settings()
    if request.plugin_settings:
        try:
            settings = settings.model_copy(update=request.plugin_settings)
        except Exception as exc:
            return Base64JSONResponse(
                content={"error": f"Invalid plugin settings: {exc}"}, status_code=400
            )

    table = ibis.table(GLOBAL_TABLE)
    result = table.filter(table[config.id_column] == request.id).limit(1).execute()
    if result.empty:
        return Base64JSONResponse(content={"error": "Row not found"}, status_code=404)

    row_data = result.iloc[0].to_dict()

    html = row_visualizer_plugin.get_row_html(row_data, settings, config)
    return Base64JSONResponse(content={"html": html})


@app.get("/docs", include_in_schema=False, response_model=None)
async def redirect_docs() -> RedirectResponse:
    return RedirectResponse(url="/api/docs")


@app.get("/redoc", include_in_schema=False, response_model=None)
async def redirect_redoc() -> RedirectResponse:
    return RedirectResponse(url="/api/redoc")


@app.get("/openapi.json", include_in_schema=False, response_model=None)
async def redirect_openapi() -> RedirectResponse:
    return RedirectResponse(url="/api/openapi.json")


app.mount(
    "/",
    SPAStaticFiles(directory=str(FRONTEND_BUILD_DIR), html=True, check_dir=False),
    name="frontend",
)
