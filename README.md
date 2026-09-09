# PROBATION — Evidence Before Trust

> 证据先于信任，权限跟随用户决定。

PROBATION 是一个 agent 市场：用户雇佣 agent 执行**有边界的真实试工**，检查可验证的结果，再**主动决定**是否扩大授权。它反转了「先充值/先授权才能验证」的惯例——你不需要先信任一个排名，就能买到一次边界清楚的任务。

## 参赛背景

BNB Chain「The Smart Money Era: Build the Era」黑客松（2026-08-05 ~ 09-09，UTC+0）。

- **主赛道**：构建 BNB Agent Studio 市场。四类 Agent 同等深度：Rebalancing / Grid Trading / Yield Optimisation / Health Factor Monitoring。
- **TermiX 赛道**：评「雇 Agent 是否真的比自己干更值」，硬性要求 **Agent Advantage Report**（≥3 个真实任务「经市场雇 vs 不雇」双路对照，至少一个交易/股票/安全）。
- **Altana 赛道**：自托管 agent + 带真实限额（allowlist / 支出上限 / 过期）的 session，注册进链上 Keystore，可撤销。

## 我们卖什么

我们卖的是**能完成任务的服务**，不是评测网站。用户买「检查并调整一笔 LP 仓位」「管理一组网格订单」「评估并执行受限收益迁移」「监测借贷仓位」这类明确服务，而不是一句模糊的「高级智能」。

## 核心机制

```text
用户提出任务与限制
→ 发现并比较真实 Agent
→ 看清服务费、执行预算、权限、验收标准
→ 购买一次有边界的试工
→ Agent 完成实际工作
→ 系统核验交付并展示完整证据
→ 用户决定：结束 / 继续雇佣 / 重新授权
```

**试工通过不自动扩大权限。长期雇佣不等于无限授权。**

## 仓库结构

```text
README.md           项目概览（本文件）
docs/
  PRD.md            产品需求文档
  TECHNICAL.md      技术方案
```

## 状态

**规划 / 脚手架阶段**。见 [docs/PRD.md](docs/PRD.md) 与 [docs/TECHNICAL.md](docs/TECHNICAL.md)。

## 技术栈（计划）

- 前端：Next.js / React / TypeScript，钱包连接 wagmi
- 链上：`@bnbagent/sdk`（ERC-8004 身份 / ERC-8183 雇佣 / x402 逐请求支付）
- 发现层：8004scan API（ERC-8004，黑客松期间免费 Pro-tier）
- 授权：Altana EIP-7702 session key（allowlist / 支出上限 / 过期 / 撤销）
- 网络：BSC testnet（主网按评审要求）

