#Requires -Version 7.0
# Secrets are stored in the current Windows user's Credential Manager. Only the
# selected child process receives them; this script does not change user/machine
# environment variables or write a credential file.
$ErrorActionPreference = 'Stop'

function Stop-Profile([string] $Code) {
    [Console]::Error.WriteLine("Workflow Board profile: $Code")
    exit 2
}

if (-not $IsWindows) { Stop-Profile 'windows_required' }
if ($args.Count -lt 2) {
    [Console]::Error.WriteLine('Usage: windows-cli.ps1 run|status|configure|remove PROFILE [CLI arguments]')
    exit 2
}
$action = [string]$args[0]
$profile = [string]$args[1]
if ($action -cnotin @('run', 'status', 'configure', 'remove')) { Stop-Profile 'invalid_action' }
if ($profile -cnotmatch '^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$') { Stop-Profile 'invalid_profile' }
$target = "WorkflowBoard:$profile"
$remaining = @($args | Select-Object -Skip 2)
if ($action -ne 'run' -and $remaining.Count -gt 0 -and
    -not ($action -eq 'configure' -and $remaining.Count -eq 1 -and $remaining[0] -ceq '--stdin')) {
    Stop-Profile 'unexpected_arguments'
}

try {
    if (-not ('WorkflowBoardCredentialVault' -as [type])) {
        Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class WorkflowBoardCredentialVault {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct Credential {
        public uint Flags, Type;
        public string TargetName, Comment;
        public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
        public uint CredentialBlobSize;
        public IntPtr CredentialBlob;
        public uint Persist, AttributeCount;
        public IntPtr Attributes;
        public string TargetAlias, UserName;
    }
    [DllImport("advapi32.dll", EntryPoint = "CredWriteW", CharSet = CharSet.Unicode, SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool WriteNative(ref Credential credential, uint flags);
    [DllImport("advapi32.dll", EntryPoint = "CredReadW", CharSet = CharSet.Unicode, SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool ReadNative(string target, uint type, uint flags, out IntPtr credential);
    [DllImport("advapi32.dll", EntryPoint = "CredDeleteW", CharSet = CharSet.Unicode, SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool DeleteNative(string target, uint type, uint flags);
    [DllImport("advapi32.dll")]
    private static extern void CredFree(IntPtr buffer);

    private static Exception Failure(string operation) =>
        new InvalidOperationException(operation + "_failed_" + Marshal.GetLastWin32Error());

    public static void Write(string target, string json) {
        byte[] bytes = Encoding.UTF8.GetBytes(json);
        if (bytes.Length > 2560) throw new InvalidOperationException("credential_too_large");
        IntPtr blob = Marshal.AllocCoTaskMem(bytes.Length);
        try {
            Marshal.Copy(bytes, 0, blob, bytes.Length);
            var value = new Credential {
                Type = 1, TargetName = target, Comment = "Workflow Board CLI service credentials",
                CredentialBlobSize = (uint)bytes.Length, CredentialBlob = blob,
                Persist = 2, UserName = "Workflow Board service"
            };
            if (!WriteNative(ref value, 0)) throw Failure("credential_write");
        } finally {
            for (int i = 0; i < bytes.Length; i++) Marshal.WriteByte(blob, i, 0);
            Marshal.FreeCoTaskMem(blob);
            Array.Clear(bytes, 0, bytes.Length);
        }
    }

    public static string Read(string target) {
        IntPtr ptr;
        if (!ReadNative(target, 1, 0, out ptr)) throw Failure("credential_read");
        try {
            var value = Marshal.PtrToStructure<Credential>(ptr);
            if (value.CredentialBlobSize > 2560) throw new InvalidOperationException("credential_too_large");
            byte[] bytes = new byte[value.CredentialBlobSize];
            try {
                Marshal.Copy(value.CredentialBlob, bytes, 0, bytes.Length);
                return new UTF8Encoding(false, true).GetString(bytes);
            } finally { Array.Clear(bytes, 0, bytes.Length); }
        } finally { CredFree(ptr); }
    }

    public static void Delete(string target) {
        if (!DeleteNative(target, 1, 0)) throw Failure("credential_delete");
    }
}
'@
    }
} catch { Stop-Profile 'credential_api_unavailable' }

function Read-ProfileJson([string] $Json) {
    $document = [System.Text.Json.JsonDocument]::Parse($Json)
    try {
        if ($document.RootElement.ValueKind -ne [System.Text.Json.JsonValueKind]::Object) {
            throw 'invalid_profile_data'
        }
        $value = @{}
        foreach ($property in $document.RootElement.EnumerateObject()) {
            if ($value.ContainsKey($property.Name)) { throw 'duplicate_profile_field' }
            if ($property.Name -ceq 'version') {
                if ($property.Value.ValueKind -ne [System.Text.Json.JsonValueKind]::Number) {
                    throw 'invalid_profile_version'
                }
                $value[$property.Name] = $property.Value.GetInt32()
            } else {
                if ($property.Value.ValueKind -ne [System.Text.Json.JsonValueKind]::String) {
                    throw 'invalid_profile_value'
                }
                $value[$property.Name] = $property.Value.GetString()
            }
        }
        return $value
    } finally { $document.Dispose() }
}

function Test-Profile($Value) {
    if ($Value -isnot [System.Collections.IDictionary]) { throw 'invalid_profile_data' }
    $expected = @('version', 'endpoint', 'store', 'namespace', 'board_token', 'sites_token', 'expires_at')
    if ($Value.Count -ne $expected.Count -or @($Value.Keys | Where-Object { $_ -cnotin $expected }).Count) {
        throw 'invalid_profile_fields'
    }
    if ($Value.version -isnot [long] -and $Value.version -isnot [int]) { throw 'invalid_profile_version' }
    if ($Value.version -ne 1) { throw 'invalid_profile_version' }
    foreach ($key in $expected | Where-Object { $_ -ne 'version' }) {
        if ($Value[$key] -isnot [string] -or [string]::IsNullOrWhiteSpace($Value[$key]) -or
            $Value[$key] -match '[\r\n\x00]') { throw 'invalid_profile_value' }
    }
    $uri = [uri]$Value.endpoint
    if (-not $uri.IsAbsoluteUri -or $uri.Scheme -cne 'https' -or $uri.UserInfo -or
        $uri.Query -or $uri.Fragment -or $uri.AbsolutePath -ne '/' -or $uri.IsLoopback) {
        throw 'invalid_endpoint'
    }
    if ($Value.endpoint.TrimEnd('/') -cne $uri.GetLeftPart([System.UriPartial]::Authority)) {
        throw 'endpoint_must_be_canonical_origin'
    }
    if ($Value.namespace -cne 'personal' -or $Value.store -notmatch '^\S+$') { throw 'invalid_scope' }
    if ($Value.board_token -cnotmatch '^wb1\.[A-Za-z0-9_-]{1,64}\.[A-Za-z0-9_-]{43}$' -or
        $Value.sites_token -notmatch '^\S+$') { throw 'invalid_credential' }
    $expiry = [DateTimeOffset]::MinValue
    if (-not [DateTimeOffset]::TryParse($Value.expires_at, [ref]$expiry)) { throw 'invalid_expiry' }
    return $Value
}

function Show-Profile($Value) {
    [ordered]@{
        profile = $profile
        credential_target = $target
        endpoint = $Value.endpoint
        store = $Value.store
        namespace = $Value.namespace
        credential_id = $Value.board_token.Split('.')[1]
        expires_at = $Value.expires_at
        expired = [DateTimeOffset]::Parse($Value.expires_at) -le [DateTimeOffset]::UtcNow
    } | ConvertTo-Json -Compress
}

try {
    switch -CaseSensitive ($action) {
        'configure' {
            if ($remaining.Count -eq 1) {
                if (-not [Console]::IsInputRedirected) { throw 'stdin_must_be_redirected' }
                # Automation supplies an in-memory pipe. Never put this JSON in a file.
                $value = Read-ProfileJson ([Console]::In.ReadToEnd())
            } else {
                $value = @{
                    version = 1
                    endpoint = Read-Host 'HTTPS origin'
                    store = Read-Host 'Store ID'
                    namespace = 'personal'
                    expires_at = Read-Host 'Board credential expiry (UTC ISO 8601)'
                }
                foreach ($pair in @(@('board_token', 'Board service token'), @('sites_token', 'Sites service token'))) {
                    $secure = Read-Host $pair[1] -AsSecureString
                    $value[$pair[0]] = [System.Net.NetworkCredential]::new('', $secure).Password
                    $secure.Dispose()
                }
            }
            $value = Test-Profile $value
            if ([DateTimeOffset]::Parse($value.expires_at) -le [DateTimeOffset]::UtcNow) { throw 'credential_expired' }
            [WorkflowBoardCredentialVault]::Write($target, ($value | ConvertTo-Json -Compress))
            Show-Profile $value
            exit 0
        }
        'remove' {
            [WorkflowBoardCredentialVault]::Delete($target)
            @{ profile = $profile; removed = $true } | ConvertTo-Json -Compress
            exit 0
        }
        default {
            $value = Test-Profile (Read-ProfileJson ([WorkflowBoardCredentialVault]::Read($target)))
            if ($action -eq 'status') { Show-Profile $value; exit 0 }
            if ([DateTimeOffset]::Parse($value.expires_at) -le [DateTimeOffset]::UtcNow) { throw 'credential_expired' }
            foreach ($argument in $remaining) {
                if ($argument -match '^--(endpoint|store|namespace|allow-loopback)(=|$)') {
                    throw 'profile_connection_override_forbidden'
                }
            }
            $node = @(Get-Command node -CommandType Application -ErrorAction Stop)[0].Source
            $start = [System.Diagnostics.ProcessStartInfo]::new()
            $start.FileName = $node
            $start.UseShellExecute = $false
            $start.ArgumentList.Add((Join-Path $PSScriptRoot 'main.mjs'))
            foreach ($argument in $remaining) { $start.ArgumentList.Add([string]$argument) }
            $start.Environment['WORKFLOW_BOARD_ENDPOINT'] = $value.endpoint
            $start.Environment['WORKFLOW_BOARD_STORE'] = $value.store
            $start.Environment['WORKFLOW_BOARD_NAMESPACE'] = $value.namespace
            $start.Environment['WORKFLOW_BOARD_TOKEN'] = $value.board_token
            $start.Environment['WORKFLOW_BOARD_SITES_TOKEN'] = $value.sites_token
            $child = [System.Diagnostics.Process]::Start($start)
            $child.WaitForExit()
            $code = $child.ExitCode
            $child.Dispose()
            exit $code
        }
    }
} catch {
    # Do not print exception objects, invocation input or credential values.
    $reason = [string]$_.Exception.Message
    if ($reason -notmatch '^[a-z_]+$') { $reason = 'credential_operation_failed' }
    Stop-Profile $reason
}
