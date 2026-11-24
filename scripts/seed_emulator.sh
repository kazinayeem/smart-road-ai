#!/usr/bin/env bash
# Seeds the LOCAL Firebase emulators (auth :9099, database :9000) with one account per role.
# Test-only credentials; never run against production.
set -euo pipefail
AUTH="http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-key"
DB="http://127.0.0.1:9000"
NS="ns=cryptro-default-rtdb"
mk() { # email password -> uid
  curl -s -X POST "$AUTH" -H 'Content-Type: application/json' \
    --data "{\"email\":\"$1\",\"password\":\"$2\",\"returnSecureToken\":true}" | python3 -c 'import sys,json;print(json.load(sys.stdin)["localId"])'
}
CITY=$(mk city.test@example.com 'TestCity#2026')
CON=$(mk contractor.test@example.com 'TestContractor#2026')
put() { curl -s -X PUT "$DB/$1.json?$NS" -H 'Authorization: Bearer owner' --data "$2" > /dev/null; }
put "users/$CITY" "{\"uid\":\"$CITY\",\"name\":\"Test City Engineer\",\"email\":\"city.test@example.com\",\"role\":\"CITY_CORPORATION\",\"createdAt\":1}"
put "users/$CON" "{\"uid\":\"$CON\",\"name\":\"Test Contractor\",\"companyName\":\"Test Roads Ltd\",\"email\":\"contractor.test@example.com\",\"role\":\"CONTRACTOR\",\"createdAt\":1}"
put "contractors/$CON" "{\"id\":\"$CON\",\"companyName\":\"Test Roads Ltd\",\"contactPerson\":\"Test Contractor\",\"email\":\"contractor.test@example.com\",\"phone\":\"\",\"active\":true,\"assignedTasksCount\":0,\"completedTasksCount\":0,\"rating\":0}"
echo "city=$CITY contractor=$CON"
