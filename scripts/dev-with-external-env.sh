#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Default external secret location:
#   <the folder beside this repo>/Financial-Investment-Tool-env
#
# If another developer keeps env files somewhere else, they do not need to
# edit the project code. Start with:
#
#   npm run dev:env:mac -- --env-dir "/Users/their/Secret/Folder"
#
# Or:
#
#   npm run dev:env:mac -- "/Users/their/Secret/Folder"
ENV_DIR=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --env-dir)
      if [ "$#" -lt 2 ]; then
        echo "Missing value for --env-dir" >&2
        exit 1
      fi
      ENV_DIR="$2"
      shift 2
      ;;
    --env-dir=*)
      ENV_DIR="${1#--env-dir=}"
      shift
      ;;
    *)
      if [ -z "$ENV_DIR" ]; then
        ENV_DIR="$1"
      fi
      shift
      ;;
  esac
done

if [ -z "$ENV_DIR" ]; then
  ENV_DIR="$(cd "$REPO_ROOT/.." && pwd)/Financial-Investment-Tool-env"
fi

trim() {
  printf '%s' "$1" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
}

import_env_file() {
  local file_path="$1"

  if [ ! -f "$file_path" ]; then
    echo "Skipping missing env file: $file_path"
    return
  fi

  echo "Loading env file: $file_path"
  while IFS= read -r line || [ -n "$line" ]; do
    line="$(trim "$line")"
    if [ -z "$line" ] || [ "${line#\#}" != "$line" ]; then
      continue
    fi

    case "$line" in
      export\ *)
        line="${line#export }"
        ;;
    esac

    if [ "${line#*=}" = "$line" ]; then
      continue
    fi

    local name="${line%%=*}"
    local value="${line#*=}"
    name="$(trim "$name")"
    value="$(trim "$value")"

    if ! [[ "$name" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
      continue
    fi

    local first_char="${value:0:1}"
    local last_char="${value: -1}"
    if { [ "$first_char" = '"' ] && [ "$last_char" = '"' ]; } || { [ "$first_char" = "'" ] && [ "$last_char" = "'" ]; }; then
      value="${value:1:${#value}-2}"
    fi

    export "$name=$value"
  done < "$file_path"
}

import_env_file "$ENV_DIR/.env"
import_env_file "$ENV_DIR/.env.local"

cd "$REPO_ROOT"
npm run dev
