param(
  [string]$EnvDir = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
if ([string]::IsNullOrWhiteSpace($EnvDir)) {
  # Default external secret location:
  #   <the folder beside this repo>\Financial-Investment-Tool-env
  #
  # If another developer keeps env files somewhere else, they do not need to
  # edit the project code. Start with:
  #
  #   npm run dev:env -- -EnvDir "D:\Their\Secret\Folder"
  #
  # Or change only the folder name below if the team agrees on a new default.
  $EnvDir = Join-Path (Split-Path $repoRoot -Parent) "Financial-Investment-Tool-env"
}

function Import-EnvFile {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    Write-Host "Skipping missing env file: $Path"
    return
  }

  Get-Content -LiteralPath $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) {
      return
    }
    if ($line -notmatch "^\s*([^=]+?)\s*=\s*(.*)\s*$") {
      return
    }

    $name = $matches[1].Trim()
    $value = $matches[2].Trim()
    if (
      ($value.StartsWith('"') -and $value.EndsWith('"')) -or
      ($value.StartsWith("'") -and $value.EndsWith("'"))
    ) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    [Environment]::SetEnvironmentVariable($name, $value, "Process")
  }
}

Import-EnvFile (Join-Path $EnvDir ".env")
Import-EnvFile (Join-Path $EnvDir ".env.local")

Set-Location $repoRoot
npm run dev
