# Context Map Guide

This is optional, technology-neutral authoring guidance. Select the target project's
document location, adopted template and real operational evidence; illustrative
`.dev/operations` paths do not provision a store or establish runtime facts.

本指南定義 `context-map.md` 類文件的最小內容。它是 template / authoring guidance，不表示 `.dev/operations/context-map.md` 已存在。

## 目的

讓維護者在需要建立 context map 時，快速回答：

- 系統目前有哪些 bounded contexts
- 各 context 的責任邊界是什麼
- 哪些是上游 / 下游 / shared kernel / customer-supplier / published language
- 哪些互動必須走 MQ

## 最小章節

```markdown
# Context Map

## Scope

## Bounded Context List

## Relationship Map

## Integration Rules

## Ownership Notes

## Open Questions / Deferred Decisions
```

## 每個 Bounded Context 至少要寫

- 名稱
- 核心責任
- 主要 aggregates / use cases
- owned contracts or events
- upstream/downstream contexts

## Relationship Map 最少欄位

每一組 context 關係至少記錄：

- source context
- target context
- interaction purpose
- interaction mechanism
  - command message / integration event / query projection / none
- ownership rule
- failure sensitivity

## Integration Rules 必須明示

- cross-BC communication is MQ-only
- internal model sharing is forbidden
- contracts 必須從 shared contract source 管理
- eventual consistency 是否為預期行為

## 圖與文字

- 可以附 mermaid，但文字表格仍是必要
- 不應只有圖沒有規則文字
