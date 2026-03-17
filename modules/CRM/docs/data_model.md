# 数据模型草案

核心实体
- Brand
- Team
- User
- Role
- Permission
- Lead
- Contact
- Company
- Deal
- Activity
- Task
- ConsultingCase
- Expert
- AuditLog

关键字段示例
- Lead
  - id, brandId, status, ownerId
  - name, companyName, companyNameEn, email, phone, notes
  - score, aiSummary, aiNotes, aiStatus, aiRequestedAt, aiEvaluatedAt
  - dedupeKey (companyName 标准化)
  - lastActivityAt, createdAt, updatedAt
- Deal
  - id, brandId, stage, value
  - leadId, ownerId
  - closeDate, probability
- ConsultingCase
  - id, brandId, leadId, expertId
  - status, channel, price, currency
  - requirements, notes
- Expert
  - id, brandId, name, country, background
  - specialties, pricing, pricingCurrency, pricingUnit
  - contactEmail, phone, notes

隔离字段要求
- 所有业务表必须包含 brandId。
- 所有可见性查询必须带 brandId 与团队范围过滤。
