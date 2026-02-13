### Project is WIP

## Installation (editable)
```bash
pip install -e .
```
Installing in editable mode keeps the `dataviewer` CLI wired up to your working tree so code changes are reflected the next time you run a command.

## CLI usage
- Start the UI for a dataset:
	```bash
	dataviewer view --dataset-path hello.parquet
	```
- Generate a starter config file you can tweak and pass via `--config`:
	```bash
	dataviewer generate-config ./example_config.json
	```