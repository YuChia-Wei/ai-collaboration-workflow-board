# Event Catalog Guide

This is optional, technology-neutral authoring guidance. Select the target project's
document location, adopted template and real operational evidence; illustrative
`.dev/operations` paths do not provision a store or establish runtime facts.

本指南定義 `event-catalog.md` 類文件的最小內容。它是 template / authoring guidance，不表示 `.dev/operations/event-catalog.md` 已存在。

## 目的

讓維護者在需要建立 event catalog 時，快速回答：

- 系統有哪些 integration events
- 誰發佈、誰消費
- 事件代表什麼 business fact
- 哪些事件有 idempotency / ordering / replay 風險

## 最小章節

```markdown
# Event Catalog

## Scope

## Event Index

## Event Details

## Delivery Semantics

## Ownership and Versioning Rules

## Deferred Items
```

## Event Index 最少欄位

- event name
- producer bounded context
- consumer bounded contexts
- trigger use case
- contract location
- status
  - active / planned / deprecated

## Event Details 最少欄位

每個 event 至少記錄：

- business meaning
- payload summary
- producer responsibility
- consumer expectations
- idempotency expectation
- ordering expectation
- failure handling notes

## Ownership and Versioning Rules

至少說清楚：

- schema 誰擁有
- consumer 可以依賴哪些欄位
- breaking change 怎麼處理
- deprecated event 如何下線
