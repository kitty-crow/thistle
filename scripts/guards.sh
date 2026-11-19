#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
root="$PWD"
scope="$(mktemp -d)"
trap 'rm -rf -- "$scope"' EXIT

# An isolated document tree prevents recursive Markdown discovery from
# entering submodules. Their source stays available for import resolution.
while IFS= read -r -d '' file; do
    mkdir -p "$scope/$(dirname "$file")"
    if [[ -d "$file" ]]; then
        ln -s "$root/$file" "$scope/$file"
    else
        cp -a -- "$file" "$scope/$file"
    fi
done < <(git ls-files --cached --others --exclude-standard -z | sort -zu)

ln -s "$root/node_modules" "$scope/node_modules"
git ls-files --cached --others --exclude-standard -z > "$scope/.guard-files"
# Disable native ONNX telemetry before the semantic runtime is loaded.
export ORT_DISABLE_TELEMETRY=1
bun "$root/scripts/guards.mts" "$scope"
