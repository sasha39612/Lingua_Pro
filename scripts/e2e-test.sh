#!/usr/bin/env bash
# End-to-end smoke test: text/audio submission → AI → stats
# Usage:
#   ./scripts/e2e-test.sh                    # uses defaults (localhost ports)
#   GW_URL=http://my-host:8080 ./scripts/e2e-test.sh
#
# Requires: curl, jq
# Services must be running (docker compose up -d)

set -euo pipefail

GW_URL="${GW_URL:-http://localhost:8080}"
TEXT_URL="${TEXT_URL:-http://localhost:4002}"
AUDIO_URL="${AUDIO_URL:-http://localhost:4003}"
STATS_URL="${STATS_URL:-http://localhost:4004}"
AI_URL="${AI_URL:-http://localhost:4005}"
AUTH_URL="${AUTH_URL:-http://localhost:4001}"
FE_URL="${FE_URL:-http://localhost:3000}"

PASS=0
FAIL=0
LANGUAGE="English"

# ─── Colour helpers ───────────────────────────────────────────────────────────
GREEN='\033[0;32m'; RED='\033[0;31m'; CYAN='\033[0;36m'; RESET='\033[0m'
ok()   { echo -e "${GREEN}  ✓ $1${RESET}"; (( PASS++ )); }
fail() { echo -e "${RED}  ✗ $1${RESET}"; (( FAIL++ )); }
section() { echo -e "\n${CYAN}▶ $1${RESET}"; }

assert_key() {
  local label="$1" json="$2" key="$3"
  if echo "$json" | jq -e "$key" > /dev/null 2>&1; then
    ok "$label"
  else
    fail "$label (key '$key' missing in: $(echo "$json" | head -c 200))"
  fi
}

assert_status() {
  local label="$1" code="$2" expected="${3:-200}"
  if [[ "$code" == "$expected" ]]; then ok "$label (HTTP $code)"; else fail "$label (expected $expected, got $code)"; fi
}

# ─── 0. Frontend availability ─────────────────────────────────────────────────
section "0. Frontend availability"

FE_CODE=$(curl -s -L -o /dev/null -w "%{http_code}" "${FE_URL}" 2>/dev/null || echo "000")
assert_status "frontend / (Next.js)" "$FE_CODE" "200"

GQL_PROXY=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "${FE_URL}/api/graphql" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}' 2>/dev/null || echo "000")
assert_status "frontend /api/graphql proxy" "$GQL_PROXY" "200"

# ─── 1. Health checks ─────────────────────────────────────────────────────────
section "1. Health checks"

for svc in \
  "api-gateway|${GW_URL}/health" \
  "auth-service|${AUTH_URL}/health" \
  "text-service|${TEXT_URL}/health" \
  "audio-service|${AUDIO_URL}/health" \
  "stats-service|${STATS_URL}/health" \
  "ai-orchestrator|${AI_URL}/health"
do
  name="${svc%%|*}"; url="${svc##*|}"
  code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
  assert_status "$name /health" "$code" "200"
done

# ─── 2. Register + Login (auth via API Gateway GraphQL) ───────────────────────
section "2. Auth – register, login, me & refreshToken"

EMAIL="e2e_test_$(date +%s)@lingua.test"
PASSWORD="Test1234!"

REGISTER=$(curl -s -X POST "${GW_URL}/graphql" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation { register(email: \\\"${EMAIL}\\\", password: \\\"${PASSWORD}\\\") { token user { id email } } }\"}")
assert_key "register returns token" "$REGISTER" '.data.register.token'
assert_key "register returns user.id" "$REGISTER" '.data.register.user.id'

TOKEN=$(echo "$REGISTER" | jq -r '.data.register.token')
USER_ID=$(echo "$REGISTER" | jq -r '.data.register.user.id')

LOGIN=$(curl -s -X POST "${GW_URL}/graphql" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation { login(email: \\\"${EMAIL}\\\", password: \\\"${PASSWORD}\\\") { token } }\"}")
assert_key "login returns token" "$LOGIN" '.data.login.token'

ME=$(curl -s -X POST "${GW_URL}/graphql" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"query":"{ me { id email } }"}')
assert_key "me query returns id"    "$ME" '.data.me.id'
assert_key "me query returns email" "$ME" '.data.me.email'

REFRESH=$(curl -s -X POST "${GW_URL}/graphql" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation { refreshToken(token: \\\"${TOKEN}\\\") { token } }\"}")
assert_key "refreshToken returns new token" "$REFRESH" '.data.refreshToken.token'

# ─── 3. Text submission → AI analysis ────────────────────────────────────────
section "3. Text submission → AI analysis"

TEXT_SUBMIT=$(curl -s -X POST "${GW_URL}/graphql" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{\"query\":\"mutation { submitText(userId: \\\"${USER_ID}\\\", language: \\\"${LANGUAGE}\\\", text: \\\"I am studing english every day and my grammar is improving slow.\\\") { id userId language originalText correctedText textScore feedback createdAt } }\"}")

assert_key "submitText returns id"            "$TEXT_SUBMIT" '.data.submitText.id'
assert_key "submitText returns originalText"  "$TEXT_SUBMIT" '.data.submitText.originalText'
assert_key "submitText returns correctedText" "$TEXT_SUBMIT" '.data.submitText.correctedText'
assert_key "submitText returns textScore"     "$TEXT_SUBMIT" '.data.submitText.textScore'
assert_key "submitText returns feedback"      "$TEXT_SUBMIT" '.data.submitText.feedback'

TEXT_ID=$(echo "$TEXT_SUBMIT" | jq -r '.data.submitText.id')
TEXT_SCORE=$(echo "$TEXT_SUBMIT" | jq -r '.data.submitText.textScore')
echo "    text_score=${TEXT_SCORE}  (id=${TEXT_ID})"

# Validate score is in 0-1 range
if [[ -n "$TEXT_SCORE" ]] && (( $(echo "$TEXT_SCORE >= 0 && $TEXT_SCORE <= 1" | bc -l 2>/dev/null || echo 0) )); then
  ok "textScore is in [0, 1]"
else
  fail "textScore '$TEXT_SCORE' is not in [0, 1]"
fi

# ─── 4. Text REST endpoint /text/by-language ─────────────────────────────────
section "4. text-service GET /text/by-language"

LANG_LOWER=$(echo "$LANGUAGE" | tr '[:upper:]' '[:lower:]')
BY_LANG=$(curl -s "${TEXT_URL}/text/by-language?language=${LANG_LOWER}")
assert_key "by-language returns texts array" "$BY_LANG" '.texts'
COUNT=$(echo "$BY_LANG" | jq '.texts | length')
echo "    ${COUNT} text record(s) found for language='${LANG_LOWER}'"
if [[ "$COUNT" -ge 1 ]]; then
  ok "at least 1 text record persisted"
else
  fail "expected ≥1 text record after submitText"
fi

# ─── 5. AI Orchestrator direct text analysis ─────────────────────────────────
section "5. ai-orchestrator POST /text/analyze"

ANALYZE=$(curl -s -X POST "${AI_URL}/text/analyze" \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"She go to the store yesterday.\", \"language\": \"${LANGUAGE}\"}")
assert_key "analyze returns correctedText"  "$ANALYZE" '.correctedText'
assert_key "analyze returns feedback"       "$ANALYZE" '.feedback'
assert_key "analyze returns textScore"      "$ANALYZE" '.textScore'

# ─── 6. AI Orchestrator task generation ──────────────────────────────────────
section "6. ai-orchestrator POST /tasks/generate"

TASKS=$(curl -s -X POST "${AI_URL}/tasks/generate" \
  -H "Content-Type: application/json" \
  -d "{\"language\": \"${LANGUAGE}\", \"level\": \"B1\", \"skill\": \"writing\"}")
assert_key "tasks.generate returns tasks array"    "$TASKS" '.tasks'
TASK_COUNT=$(echo "$TASKS" | jq '.tasks | length')
if [[ "$TASK_COUNT" -ge 1 ]]; then ok "at least 1 task generated"; else fail "no tasks returned"; fi

# ─── 7. Text tasks via GraphQL ────────────────────────────────────────────────
section "7. text-service tasks via GraphQL"

GQL_TASKS=$(curl -s -X POST "${GW_URL}/graphql" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{\"query\":\"{ tasks(language: \\\"${LANGUAGE}\\\", level: \\\"B1\\\", skill: \\\"writing\\\") { id language level skill prompt } }\"}")
assert_key "tasks query returns array" "$GQL_TASKS" '.data.tasks'

# ─── 8. Audio service: comprehension evaluation ──────────────────────────────
section "8. audio-service POST /audio/comprehension/evaluate"

EVAL_CORRECT=$(curl -s -X POST "${AUDIO_URL}/audio/comprehension/evaluate" \
  -H "Content-Type: application/json" \
  -d '{"userAnswer": "Berlin", "correctAnswer": "Berlin"}')
assert_key "evaluate returns isCorrect" "$EVAL_CORRECT" '.isCorrect'
if [[ "$(echo "$EVAL_CORRECT" | jq -r '.isCorrect')" == "true" ]]; then
  ok "correct answer → isCorrect=true"
else
  fail "correct answer should return isCorrect=true"
fi

EVAL_WRONG=$(curl -s -X POST "${AUDIO_URL}/audio/comprehension/evaluate" \
  -H "Content-Type: application/json" \
  -d '{"userAnswer": "Munich", "correctAnswer": "Berlin"}')
if [[ "$(echo "$EVAL_WRONG" | jq -r '.isCorrect')" == "false" ]]; then
  ok "wrong answer → isCorrect=false"
else
  fail "wrong answer should return isCorrect=false"
fi

# ─── 9. Stats aggregation ────────────────────────────────────────────────────
section "9. stats-service GET /stats"

STATS=$(curl -s "${STATS_URL}/stats?language=${LANGUAGE}&period=all")
assert_key "stats returns language"                  "$STATS" '.language'
assert_key "stats returns avg_text_score"            "$STATS" '.avg_text_score'
assert_key "stats returns avg_pronunciation_score"   "$STATS" '.avg_pronunciation_score'
assert_key "stats returns mistakes_total"            "$STATS" '.mistakes_total'
assert_key "stats returns history array"             "$STATS" '.history'
assert_key "stats returns charts.mistakesByType"     "$STATS" '.charts.mistakesByType'
assert_key "stats returns charts.progressOverTime"   "$STATS" '.charts.progressOverTime'

AVG_TEXT=$(echo "$STATS" | jq -r '.avg_text_score')
echo "    avg_text_score=${AVG_TEXT}"
if (( $(echo "$AVG_TEXT > 0" | bc -l 2>/dev/null || echo 0) )); then
  ok "avg_text_score > 0 (text submission reflected in stats)"
else
  fail "avg_text_score should be > 0 after text submission"
fi

for period in week month; do
  P_STATS=$(curl -s "${STATS_URL}/stats?language=${LANGUAGE}&period=${period}")
  assert_key "stats[period=${period}] returns language" "$P_STATS" '.language'
  assert_key "stats[period=${period}] returns history"  "$P_STATS" '.history'
done

# ─── 10. Auth – logout + session revocation ───────────────────────────────────
section "10. Auth – logout + session revocation"

LOGOUT=$(curl -s -X POST "${GW_URL}/graphql" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"query":"mutation { logout }"}')
if [[ "$(echo "$LOGOUT" | jq -r '.data.logout')" == "true" ]]; then
  ok "logout returns true"
else
  fail "logout should return true"
fi

AFTER_LOGOUT=$(curl -s -X POST "${GW_URL}/graphql" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"query":"{ me { id } }"}')
if echo "$AFTER_LOGOUT" | jq -e '.data.me == null' > /dev/null 2>&1; then
  ok "me returns null after logout (session revoked)"
else
  fail "me should return null after logout"
fi

# ─── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "Results: ${GREEN}${PASS} passed${RESET}  ${RED}${FAIL} failed${RESET}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

[[ $FAIL -eq 0 ]]
