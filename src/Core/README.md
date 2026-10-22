# 核心領域與應用案例

`Workflows/Domain/` 保存 Workflow aggregate、值、語意錯誤與 reducer；`Workflows/Application/` 保存命令／查詢協調及 repository、clock、source projection 等 ports。

Domain 不依賴 Application、Presentation、Infrastructure 或平台 API。Application 依賴 Domain 與自己定義的 ports，不依賴具體 adapters。內層接收 plain DTO、decoded records 及注入的能力；HTTP status、D1 row decoding 與身分來源位於外層。

人工、legacy 與 collaboration profiles 目前同屬 Workflows 模組，保留各自規則及資料語意。可攜訊息 schema 與跨語言向量位於 [Contracts](../Contracts/CollaborationV1/README.md)，不是共用 domain 實作。Python 原型位於 `../Prototypes/WorkflowRecords/`，正式產品不 import 原型。

由 Presentation 的入口組裝所需元件；不另設全域 Hosts、CompositionRoots 或 DI 專案。依賴方向與限制見 [架構說明](../../ARCHITECTURE.md)。
