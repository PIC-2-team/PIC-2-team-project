#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <local|dev|prod> <command> [args...]" >&2
  exit 2
fi

environment="$1"
shift

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

case "$environment" in
  local|dev|prod) ;;
  *) echo "Unknown environment: $environment (use local, dev, or prod)" >&2; exit 2 ;;
esac

env_file="${script_dir}/.env.${environment}"
if [[ ! -f "$env_file" ]]; then
  echo "Missing $env_file. Copy ${env_file}.example and fill in local values." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$env_file"
set +a

exec "$@"
