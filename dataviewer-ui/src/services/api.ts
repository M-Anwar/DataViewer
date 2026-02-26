export type SchemaField = {
  name: string
  type: string
  nullable: boolean
}

export type DatasetInfo = {
  num_rows: number
  num_columns: number
  full_schema: SchemaField[]
}

export type PingResponse = {
  configuration: Record<string, unknown>
  dataset_info: DatasetInfo
}

export type FacetValue = {
  value: string | number | boolean | null
  count: number
}

export type Facet = {
  column: string
  values: FacetValue[]
}

export type FacetResponse = {
  facets: Facet[]
}

export type Operator =
  | ">"
  | "<"
  | "=="
  | "!="
  | ">="
  | "<="
  | "in"
  | "not in"
  | "between"

export const OPERATOR_OPTIONS: Operator[] = [
  ">",
  "<",
  "==",
  "!=",
  ">=",
  "<=",
  "in",
  "not in",
  "between",
]

export type Filter = {
  column: string
  operator: Operator
  value: string | null | Array<string | null>
  is_column?: boolean
}

export type Sort = {
  column: string
  descending?: boolean
}

export type SearchRequest = {
  page?: number
  page_size?: number
  filters?: Filter[]
  sorts?: Sort[]
  raw_query?: string | null
  coerce_types?: boolean
}

export type SearchResponse = {
  data: Array<Record<string, unknown>>
  schema: SchemaField[]
  total_rows: number
  execution_time_ms: number
}

export type SelectResponse = Record<string, unknown> | { error: string }

export type VisualizationRequest = {
  id: string
  plugin_settings?: Record<string, unknown> | null
}

export type VisualizationResponse = { html: string } | { error: string }

export type ApiConfig = {
  baseUrl?: string
  fetchFn?: typeof fetch
}

const DEFAULT_BASE_URL = "/api"

const parseErrorMessage = async (response: Response): Promise<string> => {
  const contentType = response.headers.get("content-type") ?? ""

  if (contentType.includes("application/json")) {
    try {
      const payload = (await response.json()) as Record<string, unknown>
      const candidates = [payload.error, payload.detail, payload.message]
      const message = candidates.find(
        (value): value is string => typeof value === "string" && value.trim().length > 0,
      )

      if (message) {
        return message.trim()
      }

      return JSON.stringify(payload)
    } catch {
      return ""
    }
  }

  try {
    return (await response.text()).trim()
  } catch {
    return ""
  }
}

const request = async <T>(
  path: string,
  options: RequestInit,
  config?: ApiConfig,
): Promise<T> => {
  const baseUrl = config?.baseUrl ?? DEFAULT_BASE_URL
  const fetchFn = config?.fetchFn ?? fetch

  const response = await fetchFn(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.headers ?? {}),
    },
  })

  if (!response.ok) {
    const text = await parseErrorMessage(response)
    throw new Error(
      `Request failed: ${response.status} ${response.statusText}${text ? ` - ${text}` : ""}`,
    )
  }

  return (await response.json()) as T
}

export const api = {
  ping(config?: ApiConfig): Promise<PingResponse> {
    return request<PingResponse>("/ping", { method: "GET" }, config)
  },

  facets(config?: ApiConfig): Promise<FacetResponse> {
    return request<FacetResponse>("/facets", { method: "GET" }, config)
  },

  search(body: SearchRequest, config?: ApiConfig): Promise<SearchResponse> {
    body.coerce_types = true; // Always coerce types as JS types are all strings
    return request<SearchResponse>(
      "/search",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
      config,
    )
  },

  select(id: string, config?: ApiConfig): Promise<SelectResponse> {
    const params = new URLSearchParams({ id })
    return request<SelectResponse>(`/select?${params.toString()}`, { method: "GET" }, config)
  },

  getRowVisualization(
    body: VisualizationRequest,
    config?: ApiConfig,
  ): Promise<VisualizationResponse> {
    return request<VisualizationResponse>(
      "/get_row_visualization",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
      config,
    )
  },
}
