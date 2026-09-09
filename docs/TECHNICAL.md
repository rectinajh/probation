# PROBATION 技术方案

## 1. 技术选型

- 前端：Next.js（App Router）/ React / TypeScript；钱包连接 wagmi + viem
- 链上：`@bnbagent/sdk`（Node ≥ 20；子路径 `./erc8004` `./erc8183` `./x402` `./storage` `./wallets` `./signing`）
- 发现层：8004scan API（ERC-8004，20 万+ 已注册 agent，黑客松期间免费 Pro-tier 500 req/min）
- 授权：Altana `AltanaWalletProvider`（EIP-7702 session key）
- 网络：BSC testnet（MegaFuel 免 gas），主网按评审要求
- 后端/编排：Next.js API routes 或轻量 Node 服务

## 2. 系统架构

```text
┌─────────────────────────────────────────────────────────────┐
│                      Next.js / React 前端                    │
│   任务市场 · 服务详情与比较 · 试工订单 · 工作台 · 证据页       │
└──────────────┬──────────────────────────────────────────────┘
               │ HTTP
┌──────────────▼──────────────────────────────────────────────┐
│                  市场后端与任务编排（API）                     │
│  Agent 发现/核验 · 报价/雇佣 · 任务生命周期 · 权限/钱包 ·      │
│  服务适配器 · 证据收集 · 实验记录                              │
└───┬──────────┬────────────┬───────────────┬─────────────────┘
    │          │            │               │
    ▼          ▼            ▼               ▼
 8004scan   ERC-8183     Altana        卖方 Agent
 (发现层)   (雇佣/托管)  (session 授权) (BNB Agent Studio / Altana skills)
```

## 3. 四角色与资金流 / 密钥

| 角色 | 持有什么 | 能做什么 |
|---|---|---|
| 买方用户 | 自己的钱包私钥（本地/自托管钱包） | 创建试工、授权 session、批准/拒绝交付、撤销授权 |
| 市场运营方 | 平台后端（API key，不含用户私钥） | 编排任务、展示证据、收取平台费（若设） |
| 卖方 Agent | **自托管钱包 + 自己的 key（Altana）** | 在 session 限额内执行任务 |
| 执行钱包 | 卖方 agent 的钱包 | 实际链上操作（受 session 约束） |

**托管决策（一扇门，已定）**：执行钱包走 **Altana 自托管**——agent 自己持钥，用户授出带限额/过期/allowlist 的 session，授权与撤销归用户。不用运营方托管，避免「主权 agent」叙事返工。

资金流：服务费走 ERC-8183 托管（`createJob → fund → settle`）；操作本金由用户钱包在限额内提供；gas/调用成本单独记录。

## 4. 集成矩阵（先调查后接入）

| 类别 | 候选来源 | 网络 | 调用/支付 | 实际交付 | 权限要求 | 验证状态 |
|---|---|---|---|---|---|---|
| Rebalancing | Altana `PancakeSwap Liquidity` skill / BNB Agent Studio | BSC | ERC-8183 + session | 调仓交易 + 前后状态 | 有限执行 | 待实测 |
| Grid Trading | 官方 grid skill / 自建最小 seller | BSC | ERC-8183 | 订单组生命周期 | 有限执行 | 待实测 |
| Yield Optimisation | Altana `Aave V3 / Venus / Lista` skills | BSC | ERC-8183 | 迁移或不迁移 + 依据 | 有限执行 | 待实测 |
| Health Factor Monitoring | Altana `Venus / Aave` lending 数据 | BSC | session（只读+告警） | 观察时点 + 触发记录 | 观察（只读） | 待实测 |
| 安全（报告任务） | 钱包授权扫描 + 检查清单 | BSC | 只读 + 撤销 | 漏检项 + 撤销结果 | 只读 + 撤销 | 待实测 |

发现层用 8004scan 拉真实 listing；**不得**把同一个聊天服务改四个名字冒充四类能力。

## 5. 应用状态机

```text
草稿 → 已报价 → 用户确认 → 已付款
→ 执行中 → 已交付 → 验证中
→ 验收结束 / 需要复核 / 失败 / 到期
```

这是应用流程，**不是**任何 SDK 的原生状态；需与真实支付 / 任务 / 授权状态分别映射。ERC-8183 自带状态：`created / funded / submitted / settled / disputed / expired`。

进程重启、网络超时、回调重复时，**不能重复扣款、重复下单、丢失失败记录**（幂等锚点 = ERC-8183 jobId）。

## 6. 最小数据模型

```text
User(id, walletAddress)
Agent(id, agentId[ERC-8004], provider, category, version, config, source[声明/实测/历史])
TrialSpec(taskId, agentId, category, description, inputs, network, serviceFee,
          executionBudget, allowedActions, expiry, acceptanceCriteria,
          requiredEvidence, dataFreshness, failureRefundPolicy)
Job(jobId[ERC-8183], trialSpecId, status, escrow, disputeWindow, settledAt)
Session(sessionKey, wallet, allowlist, spendCap, expiry, keystoreRef, revoked)
Evidence(evidenceId, jobId, kind[tx/state/report], artifactRef, timestamp, chainRef)
```

产物存储与敏感数据访问单独设计；API key / 私钥 / session key 不进前端、日志、公开报告、仓库。

## 7. 接口边界

- 8004scan API key 只在后端，不进浏览器。
- ERC-8183 客户端 `createJob / registerJob / fund / settle`；`expiredAt` 必须 > `disputeWindow + 安全余量`，否则 `createJob` 抛错。
- x402 与 ERC-8183 二选一，首版用 ERC-8183。
- 交付摘要通过验证 ≠ 内容质量合格。

## 8. 错误与幂等

LLM 交付四态必须独立处理：`malformed / empty / refusal / hallucinated-json`，分别重试/降级/拒绝，用户看到明确文案而非 500。

五个 canonical 流程即混沌测试靶子：`happy / dispute-reject / stalemate-expire / never-submit / cancel-open`。

## 9. 安全

- 外部 Agent 简介与交付物是**不可信输入**（防 prompt injection），不能改系统规则或诱导额外工具调用。
- job/trial 数据按 user 隔离（防 IDOR）。
- 没有真实执行，`status` 不允许 `completed`（证据真伪链不能砍）。

## 10. 部署与可用性

早部署、评审期（9–23 日）不断供、testnet faucet 余额备足、部署服务不过期。公开 URL 是硬约束，高于任何灰度/feature flag。

