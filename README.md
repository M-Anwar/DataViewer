### Project is WIP

[![Unit Tests](https://github.com/M-Anwar/DataViewer/actions/workflows/pre-commit.yml/badge.svg?branch=main)](https://github.com/M-Anwar/DataViewer/actions/workflows/pre-commit.yml)

## Installation Instructions

### Option 1: Install with `uv tool` directly from GitHub

```bash
uv tool install git+https://github.com/M-Anwar/DataViewer.git
```

Then run:

```bash
dataviewer --help
```

### Option 2: Install from source

1. Clone the repository:

   ```bash
   git clone https://github.com/M-Anwar/DataViewer.git
   cd DataViewer
   ```

2. Install as a `uv` tool from the local source checkout:

   ```bash
   uv tool install .
   ```

3. Verify installation:

   ```bash
   dataviewer --help
   ```

## Development

1. Clone the repo.
2. Install dependencies with uv:
   ```bash
   uv sync
   ```
3. Install pre-commit hooks:
   ```bash
   pre-commit install
   ```
