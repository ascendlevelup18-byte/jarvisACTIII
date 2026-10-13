// Static guards for operator scripts that touch credentials or the live demo (PowerShell is not
// available in CI, so the smoke test is checked structurally; the demo verifier runs for real elsewhere).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

const root = new URL("../../../", import.meta.url);
const ps = readFileSync(new URL("scripts/tokenfactory-smoke.ps1", root), "utf8");
const verify = readFileSync(new URL("scripts/verify-demo.mjs", root), "utf8");
const code = ps.replace(/<#[\s\S]*?#>/, "").replace(/^\s*#.*$/gm, "");

describe("tokenfactory-smoke.ps1", () => {
  test("reads the key as a SecureString and releases it in finally", () => {
    assert.match(code, /Read-Host[^\n]*-AsSecureString/);
    assert.match(code, /finally\s*\{[\s\S]*ZeroFreeBSTR\(\$bstr\)[\s\S]*Remove-Variable/);
  });

  test("never prints or writes the key, headers or bearer value", () => {
    for (const line of code.split("\n").filter((l) => /Write-(Host|Output)|Out-File|Set-Content|Add-Content|Export-|Tee-Object/.test(l))) {
      assert.doesNotMatch(line, /\$headers|\$secure|\$bstr|Bearer|Authorization|PtrToStringBSTR/, line.trim());
    }
    assert.doesNotMatch(code, /Out-File|Set-Content|Add-Content|Export-Clixml|Tee-Object/);
    assert.doesNotMatch(code, /\$env:JARVIS_MODEL_API_KEY\s*=/);
  });

  test("hardcodes no endpoint host; the base URL is a mandatory parameter", () => {
    assert.match(code, /\[Parameter\(Mandatory = \$true\)\]\[string\]\$BaseUrl/);
    assert.doesNotMatch(code, /https?:\/\/(?!\.\+|\(localhost)[a-z0-9-]+\.[a-z]/i);
  });

  test("OpenAI-compatible calls with timeouts, model discovery and TLS 1.2 on Windows PowerShell 5.1", () => {
    assert.match(code, /"\$BaseUrl\/models"/);
    assert.match(code, /"\$BaseUrl\/chat\/completions"/);
    assert.equal((code.match(/-TimeoutSec \d+/g) ?? []).length, 3);
    assert.match(code, /-cnotcontains \$Model/);
    assert.match(code, /Tls12/);
    assert.doesNotMatch(code, /(?<!\{)\$Model:/, "a bare \"$Model:\" is a parse error in PowerShell; use ${Model}:");
  });
});

describe("verify-demo.mjs", () => {
  test("never prints the bypass secret and only sends the public demo requests", () => {
    assert.doesNotMatch(verify, /console\.(log|error)\([^)]*(extra|BYPASS)/);
    assert.match(verify, /supportRequest\.message/);
    assert.doesNotMatch(verify, /JARVIS_CASES_TOKEN|Authorization/);
  });
});
