# Runbook Guide

This is optional, technology-neutral authoring guidance. Select the target project's
document location, adopted template and real operational evidence; illustrative
`.dev/operations` paths do not provision a store or establish runtime facts.

本指南定義 `runbooks/` 下 runbook 文件的最小內容。它是 template / authoring guidance，不表示 `.dev/operations/runbooks/` 已存在。

## 目的

讓維護者在 incident 或異常行為發生時，快速回答：

- 什麼現象代表需要進入這份 runbook
- 要先檢查哪裡
- 如何區分資料問題、MQ 問題、consumer 問題、contract 問題
- 如何安全恢復與驗證

## 建議目錄

```text
.dev/operations/runbooks/
  README.MD
  <incident-name>.md
```

AI context framework 來源庫的發布 runbook 屬於 source-only 治理，不會隨
portable payload 提供。下游若需要發布或 incident 程序，應依本指南建立並驗證
自己的 repo-specific runbook，不得把來源庫程序或舊版本 instance 當成現成真相。

## 每份 Runbook 最小章節

```markdown
# <Incident Name> Runbook

## Trigger

## Scope

## Symptoms

## Immediate Checks

## Diagnosis Steps

## Recovery Actions

## Verification

## Escalation / Follow-up
```

## Trigger 要回答

- 什麼訊號會觸發這份 runbook
- 什麼情況不應該使用這份 runbook

## Diagnosis Steps 要回答

- 要檢查哪些 logs / queues / topics / database states
- 先後順序是什麼
- 哪些結果代表不同 root cause

## Recovery Actions 要回答

- 哪些動作是安全的
- 哪些動作需要人工批准
- 哪些動作可能造成 replay / duplicate side effects

## Verification 要回答

- 怎麼確認 incident 已解除
- 哪些 event / records / states 應恢復正常
- 是否需要補資料或建立後續 refactor task
