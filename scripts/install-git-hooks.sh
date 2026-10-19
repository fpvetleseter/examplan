#!/bin/sh
set -eu
# Run after git init, from repository root. Never overwrite an existing hook.
root=$(git rev-parse --show-toplevel)
cd "$root"
hook=$(git rev-parse --git-path hooks/pre-push)
if [ -e "$hook" ]; then echo 'Existing pre-push hook found; merge manually.' >&2; exit 1; fi
mkdir -p "$(dirname "$hook")"
cat > "$hook" <<'HOOK'
#!/bin/sh
set -eu
cd "$(git rev-parse --show-toplevel)"
exec node scripts/verify.mjs
HOOK
chmod +x "$hook"
echo 'Installed local pre-push verification gate. Requires running app and fresh approved QA config.'
