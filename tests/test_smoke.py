def test_import_dataviewer() -> None:
    import dataviewer

    assert dataviewer.__name__ == "dataviewer"


def test_cli_help() -> None:
    from click.testing import CliRunner

    from dataviewer.cli import main

    runner = CliRunner()
    result = runner.invoke(main, ["--help"])

    assert result.exit_code == 0
    assert "Dataviewer" in result.output
