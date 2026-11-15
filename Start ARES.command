#!/bin/zsh
# Start a loopback-only server from this project's own directory.
project_dir="$(cd -- "$(dirname -- "$0")" && pwd)"
exec python3 "$project_dir/serve.py"
