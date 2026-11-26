"""Code excerpts taken straight from the repository (so documents always match the real code)."""
from render import code_from

AND = "android-app/app/src/main/java/org/smartpothole/app/"

DETECT = code_from(AND + "ai/PotholeDetector.kt", between=("fun detect(bitmap", "    private fun applyNms"))
NMS = code_from(AND + "ai/PotholeDetector.kt", between=("private fun applyNms", "    fun close()"))
HANDLE = code_from(AND + "detect/DetectionController.kt", between=("private fun handle(", "    fun report("))
ANALYZE = code_from(AND + "detect/DetectionController.kt", between=("private fun analyze(", "    private fun handle("))
REPORT = code_from(AND + "detect/DetectionController.kt", between=("fun report(result", "    private fun vibrate"))
CONSTS = code_from(AND + "detect/DetectionController.kt", between=("companion object {", "the-end-marker-not-present"))
SUBMIT = code_from(AND + "report/ReportSubmitter.kt", between=("    suspend fun submit(", "the-end-marker-not-present"))
SYNC = code_from(AND + "sync/SyncWorker.kt", between=("    override suspend fun doWork", "    companion object"))
DEDUP = code_from(AND + "sync/SmartPotholeDeduplicator.kt", between=("    suspend fun submitDetection", "Bounded query"))
DEDUP_MATCH = code_from(AND + "sync/SmartPotholeDeduplicator.kt", between=("    suspend fun findNearestActiveReport", "the-end"))
WARN = code_from(AND + "warning/LocalPotholeWarningManager.kt", between=("    fun triggerInstantWarning(", "    /** User preference"))
SESSION = code_from(AND + "session/LiveSessionManager.kt", between=("    fun createSession(", "    /** Join an active session"))
ENTITY = code_from(AND + "database/PotholeReportEntity.kt")
DAO = code_from(AND + "database/PotholeReportDao.kt")
LOCATION = code_from(AND + "location/LocationTracker.kt")
WEB_WORKFLOW = code_from("web-dashboard/lib/firebase.ts", between=("export async function updateReportWorkflow", "/** Submit a citizen report"))
WEB_LOGIN = code_from("web-dashboard/lib/firebase.ts", between=("export async function login(", "export async function registerCitizen"))
GUARD = code_from("web-dashboard/components/RequireRole.tsx", between=("export function RequireRole", "the-end"))
FUNC = code_from("firebase/functions/index.js", between=("exports.resolveUsernameLogin", "the-end"))
EXPORT_PY = code_from("ai-model/scripts/export_and_benchmark.py", between=("# Export to ONNX", "# Inspect ONNX Model"))


def rules_excerpt():
    import json
    import os
    from render import ROOT
    with open(os.path.join(ROOT, "firebase/database.rules.json")) as f:
        rules = json.load(f)["rules"]
    users = rules["users"]
    role = users["$uid"]["role"][".validate"]
    rep = rules["reports"]["$reportId"]
    keep = {
        "users/$uid/role/.validate": role,
        "reports/$reportId/.validate": rep[".validate"],
        "reports/$reportId/status/.validate": rep["status"][".validate"],
        "reports/$reportId/totalDetections/.write": rep["totalDetections"][".write"],
    }
    return "\n\n".join(f'"{k}":\n  {v}' for k, v in keep.items())


RULES = rules_excerpt()


def find_quantize():
    import glob
    import os
    from render import ROOT
    for p in sorted(glob.glob(os.path.join(ROOT, "ai-model/scripts/*.py"))):
        txt = open(p).read()
        if "quantize_dynamic" in txt:
            rel = os.path.relpath(p, ROOT)
            lines = txt.splitlines()
            i = next(k for k, l in enumerate(lines) if "quantize_dynamic" in l)
            return rel, "\n".join(lines[max(0, i - 4): i + 8])
    return None, None


QUANT_FILE, QUANT = find_quantize()
