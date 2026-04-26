#!/usr/bin/env bash
# Reads a Claude PostToolUse hook event from stdin and runs tests
# only for the service that owns the modified file.

INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

[[ -z "$FILE" ]] && exit 0

# Skip non-source files
case "$FILE" in
  *.md|*.json|*.env*|*.yml|*.yaml|*.css|*.scss|*.svg|*.png|*.ico|*.txt) exit 0 ;;
  *.test.ts|*.test.tsx|*.spec.ts|*.spec.tsx) exit 0 ;;
  */__tests__/*) exit 0 ;;
esac

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ "$FILE" == */frontend/* ]]; then
  FILTER="frontend"
elif [[ "$FILE" == */backend/auth-service/* ]]; then
  FILTER="auth-service"
elif [[ "$FILE" == */backend/text-service/* ]]; then
  FILTER="text-service"
elif [[ "$FILE" == */backend/audio-service/* ]]; then
  FILTER="audio-service"
elif [[ "$FILE" == */backend/stats-service/* ]]; then
  FILTER="stats-service"
elif [[ "$FILE" == */backend/ai-orchestrator/* ]]; then
  FILTER="ai-orchestrator"
elif [[ "$FILE" == */backend/api-gateway/* ]]; then
  FILTER="api-gateway"
else
  exit 0
fi

echo "▶ Running tests for $FILTER (triggered by $(basename "$FILE"))..."
cd "$REPO_ROOT"
pnpm --filter "$FILTER" test 2>&1
