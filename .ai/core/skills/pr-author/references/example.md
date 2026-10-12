# Synthetic example; not execution evidence

Assume an existing project parent notes and an explicitly selected package root. No example below is an actual record, grant or validation receipt. Replace every path/digest/commit placeholder with real inputs; do not invent a hash.

Optional project JSON:

```json
{"config_version":2,"skills":{"pr-author":{"store":{"root":"notes/pull-requests","tracking":"tracked"}},"example.other":{"inert":"not consumed"}}}
```

No config is also valid and selects package defaults. An ignored store uses tracking=ignored; the project establishes its own Git policy. A selected local config in Git must already be ignored/untracked.

Prepare content can be {title: "Document timeout behavior", summary: "Describe the selected timeout response.", validation: [], references: []}. Select actual full base/head commits and repository_root. The result supplies the real diff digest. Only then add validation entries with that head/diff; a deferred entry stays deferred and names its owner/next action in reason.

Add provider_target only when choosing a real GitHub.com same-repository target. Inspect/render with repository_root returns actual candidate hashes. Those hashes do not authorize provider-create. Existing caller authority and coordinated single-writer conditions remain external facts; only a later actual invocation/read-back can establish a created PR.
