Dưới đây là toàn bộ hệ thống Quy tắc nghiệp vụ (Business Rules) của HungTin V2 được viết lại hoàn chỉnh theo định dạng **Machine-Readable** (YAML Metadata kết hợp với Acceptance Criteria và Technical Specs chặt chẽ).

Cấu trúc này được tối ưu hóa đặc biệt để d OOI Coding Agent (Cursor, Windsurf, v.v.) có thể đọc hiểu trực tiếp, phân tích cấu trúc cơ sở dữ liệu, thiết kế API, viết test case và cài đặt logic nghiệp vụ mà không cần phỏng đoán.

---

# Danh mục tài liệu Business Rules hệ thống HungTin

* **CUSTOMER.md** (Hồ sơ khách hàng & Blacklist)
* **GOODS.md** (Hàng hóa & Cấu hình tham số)
* **PAWN.md** (Hợp đồng Cầm đồ)
* **LOAN.md** (Hợp đồng Tín chấp & Nợ cũ)
* **INSTALLMENT.md** (Hợp đồng Trả góp)
* **CAPITAL.md** (Hợp đồng Góp vốn đầu tư)
* **FINANCE.md** (Quỹ tiền mặt & Thu chi)
* **EMPLOYEE.md** (Nhân viên & Bảo mật 2FA)
* **PERMISSION.md** (Phân quyền & Kiểm soát API)
* **REPORT.md** (Báo cáo & Bàn giao ca)

---

# [File 1] CUSTOMER.md - Quản lý Hồ sơ Khách hàng & Blacklist

```yaml
id: BR-CUSTOMER-001
module: Customer
priority: Critical
actor:
  - Staff
  - Manager
precondition:
  - Customer status == 'blacklist'
trigger:
  - Action: Click "Tạo hợp đồng mới" (Cầm đồ, Tín chấp, Trả góp)
    UI_Page: /contracts/create
validation:
  - check_customer_blacklist(customer_id) == true
action:
  - Abort contract creation process
  - Throw error message: "Customer is blacklisted. Cannot create contract."
postcondition:
  - No new contract record created in DB
  - Transaction rollbacked
database:
  - customers
api:
  - POST /api/v1/pawn/contracts
  - POST /api/v1/unsecured/contracts
  - POST /api/v1/installment/contracts
permission:
  - CONTRACTS_MANAGE
ui:
  Component: /frontend/src/components/shared/ContractForm.tsx
acceptance_criteria:
  happy_path:
    - If customer status is 'active', contract creation proceeds normally.
  exception_handling:
    - If customer status is 'blacklist', API immediately returns HTTP 400 Bad Request.
    - Frontend displays an alert modal blocking form submission.
```

```yaml
id: BR-CUSTOMER-002
module: Customer
priority: High
actor:
  - Staff
  - Manager
precondition:
  - Customer status == 'active'
  - Existing contract has payment delay or violation
trigger:
  - Action: Click "Báo xấu khách hàng"
    UI_Page: /contracts/:id/detail
validation:
  - blacklist_reason != null and length(blacklist_reason) >= 10
action:
  - Update customer.status = 'blacklist'
  - Create record in customer_blacklist table with reason, created_by, and created_at
postcondition:
  - Customer status changed to 'blacklist'
  - Customer status globally locked for new transactions
database:
  - customers
  - customer_blacklist
api:
  - POST /api/v1/customers/:id/blacklist
permission:
  - CONTRACTS_OPERATE
ui:
  Component: /frontend/src/components/modals/BlacklistModal.tsx
acceptance_criteria:
  happy_path:
    - Entering a valid reason and submitting updates the customer's status to blacklist instantly.
  alternative_flow:
    - To remove a customer from the blacklist, a Maker-Checker request is required (Staff requests, Manager/Admin approves).
  exception_handling:
    - If blacklist_reason is empty or < 10 characters, block submission and return HTTP 422.
```

```yaml
id: BR-CUSTOMER-003
module: Customer
priority: High
actor:
  - Staff
  - Manager
precondition:
  - Employee has assigned store_id
trigger:
  - Action: Search customer or Load customer list
    UI_Page: /customers
validation:
  - session.store_id != null
action:
  - Apply SQL query filter: `WHERE store_id = session.store_id`
postcondition:
  - Customer list is isolated to the employee's designated store
database:
  - customers
api:
  - GET /api/v1/customers
permission:
  - CONTRACTS_MANAGE
ui:
  Component: /frontend/src/pages/Customers.tsx
acceptance_criteria:
  happy_path:
    - Staff at Store A only sees customers registered at Store A.
  alternative_flow:
    - Global Admin (session.store_id == null or role == 'ADMIN') can view and search customers across all stores.
  exception_handling:
    - If cross-store lookup is attempted by non-admin without permissions, block and return HTTP 403.
```

```yaml
id: BR-CUSTOMER-004
module: Customer
priority: Medium
actor:
  - Staff
  - Manager
precondition:
  - Creating or updating customer profile
trigger:
  - Action: Submit customer form
    UI_Page: /customers/create
validation:
  - identity_card_number is optional (allow null / empty)
action:
  - Check if identity_card_number already exists in database (if provided)
  - If exists, trigger a UI warning: "ID Card already exists. Please verify." but do not block saving.
postcondition:
  - Customer record created successfully without unique database constraint block on identity_card_number
database:
  - customers
api:
  - POST /api/v1/customers
permission:
  - CONTRACTS_MANAGE
ui:
  Component: /frontend/src/pages/CustomerForm.tsx
acceptance_criteria:
  happy_path:
    - Saving a customer with a blank ID card is allowed.
  boundary_conditions:
    - If identity_card_number is provided, it must be exactly 9 or 12 numeric characters (or standard passport format).
```

---

# [File 2] GOODS.md - Quản lý Hàng hóa & Cấu hình Tham số

```yaml
id: BR-GOODS-001
module: Goods
priority: High
actor:
  - Admin
precondition:
  - System setting access
trigger:
  - Action: Save commodity configuration
    UI_Page: /settings/commodities
validation:
  - category in ['pawn', 'unsecured']
action:
  - Save category value in DB
postcondition:
  - Commodity filtered correctly in contract forms depending on type
database:
  - commodities
api:
  - POST /api/v1/commodities
permission:
  - SETTINGS_MANAGE
ui:
  Component: /frontend/src/pages/CommoditySettings.tsx
acceptance_criteria:
  happy_path:
    - Saving a commodity with category 'pawn' makes it appear only in Pawn Contract creation.
```

```yaml
id: BR-GOODS-002
module: Goods
priority: High
actor:
  - Admin
precondition:
  - Active interest types exist in DB
trigger:
  - Action: Save commodity configuration
    UI_Page: /settings/commodities
validation:
  - interest_type_id exists in interest_types table
action:
  - Map commodity to interest_type_id
postcondition:
  - Interest calculation formula for contracts using this commodity is determined by mapped interest type
database:
  - commodities
  - interest_types
api:
  - POST /api/v1/commodities
permission:
  - SETTINGS_MANAGE
ui:
  Component: /frontend/src/pages/CommoditySettings.tsx
acceptance_criteria:
  happy_path:
    - Mapped interest type is fetched successfully when loading the commodity.
```

```yaml
id: BR-GOODS-003
module: Goods
priority: High
actor:
  - Admin
precondition:
  - Creating new commodity
trigger:
  - Action: Submit commodity form
    UI_Page: /settings/commodities/create
validation:
  - unique_check(commodities.code, input_code) == true
action:
  - Save commodity with unique alphanumeric code
postcondition:
  - Unique index enforced on DB level
database:
  - commodities
api:
  - POST /api/v1/commodities
permission:
  - SETTINGS_MANAGE
ui:
  Component: /frontend/src/pages/CommoditySettingsForm.tsx
acceptance_criteria:
  happy_path:
    - Saving code 'xe_may' succeeds if not existing.
  exception_handling:
    - Saving duplicate code 'xe_may' returns HTTP 400 Bad Request: "Commodity code must be unique."
```

```yaml
id: BR-GOODS-004
module: Goods
priority: Medium
actor:
  - Staff
precondition:
  - Commodity dropdown loaded on Contract Form
trigger:
  - Action: Change commodity selection
    UI_Page: /contracts/create
validation:
  - selected_commodity_id != null
action:
  - Fetch default_amount, default_interest_rate, default_period_value, default_loan_days, is_upfront_interest
  - Auto-populate corresponding fields on UI form
postcondition:
  - UI fields updated automatically, allowing manual override
database:
  - commodities
api:
  - GET /api/v1/commodities/:id
permission:
  - CONTRACTS_MANAGE
ui:
  Component: /frontend/src/components/shared/ContractForm.tsx
acceptance_criteria:
  happy_path:
    - Selecting "Xe máy" auto-fills loan days to 30, interest to 1.5%, upfront interest to true.
```

---

# [File 3] PAWN.md - Hợp đồng Cầm đồ

```yaml
id: BR-PAWN-001
module: Pawn
priority: High
actor:
  - System
precondition:
  - New Pawn Contract initiated
trigger:
  - Action: Save Contract
    UI_Page: /pawn/create
validation:
  - contract_code is unique (if custom input)
action:
  - If contract_code is empty, auto-generate code with format: 'CD-' + pad_zero(next_val, 6) -> e.g. 'CD-000001'
postcondition:
  - Unique contract_code stored
database:
  - pawn_contracts
api:
  - POST /api/v1/pawn/contracts
permission:
  - CONTRACTS_MANAGE
ui:
  Component: /frontend/src/pages/PawnContractCreate.tsx
acceptance_criteria:
  happy_path:
    - Leaving code blank auto-generates 'CD-000001'.
  boundary_conditions:
    - Custom code input must be validated for global uniqueness. Return HTTP 400 if duplicate.
```

```yaml
id: BR-PAWN-002
module: Pawn
priority: Critical
actor:
  - Staff
  - Manager
precondition:
  - is_upfront_interest == true
trigger:
  - Action: Approve and Disburse Contract
    UI_Page: /pawn/:id/disburse
validation:
  - loan_amount > 0
  - first_period_interest > 0
action:
  - Calculate actual_disbursed_amount = loan_amount - first_period_interest
  - Set first period payment state: is_paid = true, actual_paid = first_period_interest
  - Record cash fund decrease by actual_disbursed_amount
  - Emit event PawnDisbursed with actual_disbursed_amount
postcondition:
  - Store current_cash is decremented by actual_disbursed_amount
  - Cash history logged as 'capital_disbursement'
database:
  - pawn_contracts
  - pawn_interest_payments
  - daily_cash
  - cash_fund_history
api:
  - POST /api/v1/pawn/contracts/:id/disburse
permission:
  - CONTRACTS_OPERATE
ui:
  Component: /frontend/src/pages/PawnDisbursement.tsx
acceptance_criteria:
  happy_path:
    - Vay 10M, lãi kỳ 1 là 300k. Thực tế giải ngân giao khách 9.7M. Két chi nhánh giảm 9.7M. Kỳ lãi 1 đánh dấu Đã đóng.
```

```yaml
id: BR-PAWN-003
module: Pawn
priority: High
actor:
  - Manager
precondition:
  - Contract status == 'active'
trigger:
  - Action: Create Principal Transaction (Vay thêm / Trả bớt)
    UI_Page: /pawn/:id/principal
validation:
  - transaction_type in ['borrow_more', 'pay_down']
  - if 'pay_down': amount < current_principal and unpaid_accrued_interest == 0
  - if 'borrow_more': amount <= store_available_cash
action:
  - Create transaction record in pawn_principal_transactions
  - Update pawn_contracts.principal_amount
  - Recalculate interest expected_amount for all future unpaid periods based on new principal
  - Adjust daily_cash.current_cash (Decrease if borrow_more, Increase if pay_down)
postcondition:
  - Future payment schedules adjusted
  - Cash fund updated in real-time
database:
  - pawn_contracts
  - pawn_principal_transactions
  - pawn_interest_payments
  - daily_cash
api:
  - POST /api/v1/pawn/contracts/:id/principal-transaction
permission:
  - CONTRACTS_OPERATE
ui:
  Component: /frontend/src/pages/PawnPrincipalTransaction.tsx
acceptance_criteria:
  happy_path:
    - Vay thêm 2M: nợ gốc tăng, quỹ két giảm 2M, các kỳ đóng lãi tiếp theo tính toán số tiền lãi cao hơn.
    - Trả bớt 3M: nợ gốc giảm, quỹ két tăng 3M, yêu cầu thanh toán hết lãi nợ lũy kế trước khi trả bớt gốc.
```

```yaml
id: BR-PAWN-004
module: Pawn
priority: High
actor:
  - Staff
  - Manager
precondition:
  - Contract status == 'active'
trigger:
  - Action: Extend Contract
    UI_Page: /pawn/:id/extend
validation:
  - extension_days > 0
  - all_previous_interest_periods_paid == true
action:
  - Create record in pawn_contract_extensions
  - Update pawn_contracts.expiry_date = expiry_date + extension_days
  - Generate new interest payment period schedules for the extended duration
postcondition:
  - New unpaid interest payment periods added
database:
  - pawn_contracts
  - pawn_contract_extensions
  - pawn_interest_payments
api:
  - POST /api/v1/pawn/contracts/:id/extend
permission:
  - CONTRACTS_OPERATE
ui:
  Component: /frontend/src/pages/PawnExtension.tsx
acceptance_criteria:
  happy_path:
    - Gia hạn 30 ngày: Sinh thêm 3 kỳ đóng lãi mới (nếu kỳ hạn 10 ngày/kỳ), ngày đáo hạn đẩy lùi 30 ngày.
```

```yaml
id: BR-PAWN-005
module: Pawn
priority: Critical
actor:
  - Staff
  - Manager
precondition:
  - Contract status == 'active'
trigger:
  - Action: Redeem Contract (Chuộc đồ / Tất toán)
    UI_Page: /pawn/:id/redeem
validation:
  - payment_amount == (current_principal + unpaid_interest + other_fees)
action:
  - Change contract status to 'redeemed'
  - Create record in pawn_redemptions
  - Update daily_cash.current_cash = current_cash + payment_amount
  - Mark all remaining unpaid interest periods as settled
postcondition:
  - Contract marked as closed / redeemed
  - Cash fund increased by total settlement amount
database:
  - pawn_contracts
  - pawn_redemptions
  - daily_cash
api:
  - POST /api/v1/pawn/contracts/:id/redeem
permission:
  - CONTRACTS_OPERATE
ui:
  Component: /frontend/src/pages/PawnRedemption.tsx
acceptance_criteria:
  happy_path:
    - Chuộc đồ đóng 10.3M (10M gốc + 300k lãi). Hợp đồng đóng, két tăng 10.3M, tài sản chuyển sang trạng thái đã trả khách.
```

```yaml
id: BR-PAWN-006
module: Pawn
priority: Critical
actor:
  - Admin
precondition:
  - Contract exists
trigger:
  - Action: Delete Contract (Admin Only - Error Correction)
    UI_Page: /pawn/:id/detail
validation:
  - request_user.role == 'ADMIN'
action:
  - Calculate net_cash_flow = total_cash_received - total_cash_disbursed
  - Apply cash correction: daily_cash.current_cash = current_cash - net_cash_flow
  - Delete all related payment records, transactions, extensions
  - Soft-delete or hard-delete the contract record depending on configuration (Soft-delete recommended)
postcondition:
  - Contract removed from lists
  - Branch cash fund corrected to match state before contract existence
database:
  - pawn_contracts
  - daily_cash
  - cash_fund_history
api:
  - DELETE /api/v1/pawn/contracts/:id
permission:
  - SETTINGS_MANAGE
ui:
  Component: /frontend/src/pages/PawnDetail.tsx
acceptance_criteria:
  happy_path:
    - Xóa hợp đồng giải ngân lỗi (Thực giao 9.7M, chưa thu gì): Két chi nhánh cộng trả lại 9.7M, hợp đồng biến mất.
```

```yaml
id: BR-PAWN-007
module: Pawn
priority: High
actor:
  - System
precondition:
  - Daily scheduler trigger or Dashboard load
trigger:
  - Action: Evaluate contract overdue status
validation:
  - contract.status == 'active'
  - exists(pawn_interest_payments WHERE is_paid == false AND due_date < current_date)
action:
  - Flag contract as 'overdue' on UI/Reports
postcondition:
  - Contract highlighted with visual warnings
database:
  - pawn_contracts
  - pawn_interest_payments
api:
  - GET /api/v1/pawn/contracts
permission:
  - CONTRACTS_MANAGE
ui:
  Component: /frontend/src/pages/ContractsList.tsx
acceptance_criteria:
  happy_path:
    - Nếu có kỳ đóng lãi hạn cuối ngày 10/07/2026 chưa đóng, ngày 11/07/2026 tải danh sách hợp đồng sẽ thấy nhãn Cảnh báo quá hạn.
```

```yaml
id: BR-PAWN-008
module: Pawn
priority: High
actor:
  - System
precondition:
  - Overdue contract exceeds liquidation grace days
trigger:
  - Action: Generate Waiting Liquidation Report
validation:
  - current_date > (interest_payment.due_date + commodity.liquidation_after_days)
  - contract.status == 'active'
action:
  - Include contract in Waiting Liquidation dataset
postcondition:
  - Asset listed in waiting liquidation table
database:
  - pawn_contracts
  - pawn_interest_payments
  - commodities
api:
  - GET /api/v1/reports/pawn-waiting-liquidation
permission:
  - REPORTS_VIEW
ui:
  Component: /frontend/src/pages/WaitingLiquidationReport.tsx
acceptance_criteria:
  happy_path:
    - Xe máy quá hạn đóng lãi 11 ngày (cấu hình liquidation_after_days = 10): Xuất hiện trong danh sách Chờ thanh lý tài sản.
```

---

# [File 4] LOAN.md - Hợp đồng Tín chấp & Nợ cũ

```yaml
id: BR-LOAN-001
module: Loan
priority: High
actor:
  - System
precondition:
  - New Unsecured Loan Contract initiated
trigger:
  - Action: Save Contract
    UI_Page: /unsecured/create
validation:
  - contract_code is unique (if custom input)
action:
  - If contract_code is empty, auto-generate code with format: 'TC-' + pad_zero(next_val, 6) -> e.g. 'TC-000001'
postcondition:
  - Unique contract_code stored
database:
  - unsecured_contracts
api:
  - POST /api/v1/unsecured/contracts
permission:
  - CONTRACTS_MANAGE
ui:
  Component: /frontend/src/pages/UnsecuredContractCreate.tsx
acceptance_criteria:
  happy_path:
    - Tự động sinh mã 'TC-000001' khi khởi tạo thành công.
```

```yaml
id: BR-LOAN-002
module: Loan
priority: Critical
actor:
  - Staff
  - Manager
precondition:
  - is_upfront_interest == true
trigger:
  - Action: Approve and Disburse Contract
    UI_Page: /unsecured/:id/disburse
validation:
  - loan_amount > 0
  - first_period_interest > 0
action:
  - Calculate actual_disbursed_amount = loan_amount - first_period_interest
  - Set first period payment state: is_paid = true, actual_paid = first_period_interest
  - Record cash fund decrease by actual_disbursed_amount
  - Emit event LoanDisbursed with actual_disbursed_amount
postcondition:
  - Store current_cash is decremented by actual_disbursed_amount
database:
  - unsecured_contracts
  - unsecured_interest_payments
  - daily_cash
api:
  - POST /api/v1/unsecured/contracts/:id/disburse
permission:
  - CONTRACTS_OPERATE
ui:
  Component: /frontend/src/pages/UnsecuredDisbursement.tsx
acceptance_criteria:
  happy_path:
    - Thực tế giao khách vay tín chấp số tiền đã khấu trừ lãi kỳ đầu. Dòng tiền quỹ két ghi nhận chính xác.
```

```yaml
id: BR-LOAN-003
module: Loan
priority: High
actor:
  - Staff
  - Manager
precondition:
  - Contract status == 'active'
trigger:
  - Action: Manage Secondary Debt (Ghi nợ cũ / Trả nợ cũ)
    UI_Page: /unsecured/:id/debt
validation:
  - action_type in ['record_debt', 'pay_debt']
  - if 'pay_debt': amount <= current_debt_amount
action:
  - Create transaction record in unsecured_debt_history
  - Update unsecured_contracts.debt_amount (Increase if record_debt, Decrease if pay_debt)
  - If 'pay_debt': Increase daily_cash.current_cash by amount
postcondition:
  - Secondary debt balance updated
  - Daily cash fund increased only on 'pay_debt' actions
database:
  - unsecured_contracts
  - unsecured_debt_history
  - daily_cash
api:
  - POST /api/v1/unsecured/contracts/:id/debt-transaction
permission:
  - CONTRACTS_OPERATE
ui:
  Component: /frontend/src/pages/UnsecuredDebtManagement.tsx
acceptance_criteria:
  happy_path:
    - Ghi nợ phạt thêm 500k: dư nợ cũ tăng lên 500k, két tiền không đổi.
    - Khách trả nợ cũ 300k: dư nợ cũ giảm về 200k, quỹ két chi nhánh tăng thêm 300k tiền mặt.
```

```yaml
id: BR-LOAN-004
module: Loan
priority: Critical
actor:
  - Admin
precondition:
  - Unsecured contract exists
trigger:
  - Action: Delete Contract (Admin Only - Error Correction)
    UI_Page: /unsecured/:id/detail
validation:
  - request_user.role == 'ADMIN'
action:
  - Calculate net_cash_flow = total_cash_received - total_cash_disbursed
  - Apply cash correction: daily_cash.current_cash = current_cash - net_cash_flow
  - Delete all related payments, debt history, contract record (or soft-delete)
postcondition:
  - Unsecured contract removed, cash fund corrected
database:
  - unsecured_contracts
  - daily_cash
api:
  - DELETE /api/v1/unsecured/contracts/:id
permission:
  - SETTINGS_MANAGE
ui:
  Component: /frontend/src/pages/UnsecuredDetail.tsx
acceptance_criteria:
  happy_path:
    - Xóa hợp đồng tín chấp lỗi: Hoàn trả lại chính xác dòng tiền quỹ két của chi nhánh.
```

```yaml
id: BR-LOAN-005
module: Loan
priority: High
actor:
  - Manager
precondition:
  - Principal transaction approved on unsecured loan
trigger:
  - Action: Principal Transaction (Borrow more / Pay down)
validation:
  - contract.status == 'active'
action:
  - Adjust unsecured_contracts.principal_amount
  - Loop through all remaining unpaid schedules (unsecured_interest_payments WHERE is_paid == false)
  - Recalculate expected_interest based on updated principal
postcondition:
  - Future payment interest amounts recalculated dynamically
database:
  - unsecured_contracts
  - unsecured_interest_payments
api:
  - POST /api/v1/unsecured/contracts/:id/principal-transaction
permission:
  - CONTRACTS_OPERATE
ui:
  Component: /frontend/src/pages/UnsecuredPrincipal.tsx
acceptance_criteria:
  happy_path:
    - Khách đóng bớt 5M gốc tín chấp: Lịch đóng lãi các kỳ sau tự động giảm đi tương ứng với số dư gốc mới.
```

---

# [File 5] INSTALLMENT.md - Hợp đồng Trả góp

```yaml
id: BR-INSTALLMENT-001
module: Installment
priority: High
actor:
  - System
precondition:
  - New Installment Contract initiated
trigger:
  - Action: Save Contract
    UI_Page: /installment/create
validation:
  - contract_code is unique (if custom input)
action:
  - If contract_code is empty, auto-generate code with format: 'TG-' + pad_zero(next_val, 6) -> e.g. 'TG-000001'
postcondition:
  - Unique contract_code stored
database:
  - installment_contracts
api:
  - POST /api/v1/installment/contracts
permission:
  - CONTRACTS_MANAGE
ui:
  Component: /frontend/src/pages/InstallmentContractCreate.tsx
acceptance_criteria:
  happy_path:
    - Khởi tạo hợp đồng tự động sinh mã 'TG-000001'.
```

```yaml
id: BR-INSTALLMENT-002
module: Installment
priority: Critical
actor:
  - Staff
  - Manager
precondition:
  - is_upfront_collected == true
trigger:
  - Action: Approve and Disburse Contract
    UI_Page: /installment/:id/disburse
validation:
  - loan_amount > 0
  - first_installment_amount > 0
action:
  - Calculate actual_disbursed_amount = loan_amount - first_installment_amount
  - Set first period payment state: is_paid = true, actual_paid = first_installment_amount
  - Record cash fund decrease by actual_disbursed_amount
postcondition:
  - Store current_cash is decremented by actual_disbursed_amount
database:
  - installment_contracts
  - installment_payments
  - daily_cash
api:
  - POST /api/v1/installment/contracts/:id/disburse
permission:
  - CONTRACTS_OPERATE
ui:
  Component: /frontend/src/pages/InstallmentDisbursement.tsx
acceptance_criteria:
  happy_path:
    - Hình thức 15 ăn 12 đóng trước 1 kỳ: Khách nhận thực tế 12M - 300k (Kỳ 1) = 11.7M. Két chi nhánh trừ 11.7M.
```

```yaml
id: BR-INSTALLMENT-003
module: Installment
priority: High
actor:
  - Staff
  - Manager
precondition:
  - Contract status == 'active'
trigger:
  - Action: Pay Period Installment (Thu tiền góp)
    UI_Page: /installment/:id/pay
validation:
  - paid_date != null (allow past date for backdated adjustment)
  - amount > 0
action:
  - Update installment_payments record for selected period
  - Set actual_paid = amount, is_paid = true, payment_date = paid_date
  - Increase store current_cash of corresponding business_date by amount
postcondition:
  - Period payment marked as complete
  - Store cash fund updated for historical date if backdated
database:
  - installment_contracts
  - installment_payments
  - daily_cash
api:
  - POST /api/v1/installment/contracts/:id/pay
permission:
  - CONTRACTS_OPERATE
ui:
  Component: /frontend/src/pages/InstallmentPayment.tsx
acceptance_criteria:
  happy_path:
    - Thu nợ lùi ngày: Nhập đóng tiền cho ngày hôm qua, hệ thống cập nhật quỹ két hạch toán lùi về ngày hôm qua thành công.
```

```yaml
id: BR-INSTALLMENT-004
module: Installment
priority: Medium
actor:
  - System
precondition:
  - Load Installment Contract details
trigger:
  - Action: Calculate parameters
validation:
  - total_payment_amount > 0
  - loan_days > 0
action:
  - Calculate daily_payment = round(total_payment_amount / loan_days)
postcondition:
  - daily_payment displayed correctly on list and detail views
database:
  - installment_contracts
api:
  - GET /api/v1/installment/contracts
permission:
  - CONTRACTS_MANAGE
ui:
  Component: /frontend/src/pages/InstallmentList.tsx
acceptance_criteria:
  happy_path:
    - Tổng tiền phải trả 15 triệu trong 50 ngày => Hiển thị "Tiền 1 ngày" là 300.000 VNĐ.
```

```yaml
id: BR-INSTALLMENT-005
module: Installment
priority: High
actor:
  - Staff
  - Manager
precondition:
  - Contract status == 'active'
trigger:
  - Action: Redeem Contract (Tất toán sớm)
    UI_Page: /installment/:id/redeem
validation:
  - payment_amount == (remaining_unpaid_installments + other_amount)
action:
  - Set contract status = 'closed'
  - Set is_paid = true and actual_paid for all remaining unpaid periods
  - Create installment_redemptions record
  - Increase daily_cash.current_cash by payment_amount
postcondition:
  - Installment contract closed early
  - Store cash fund increased by total early redemption settlement
database:
  - installment_contracts
  - installment_payments
  - installment_redemptions
  - daily_cash
api:
  - POST /api/v1/installment/contracts/:id/redeem
permission:
  - CONTRACTS_OPERATE
ui:
  Component: /frontend/src/pages/InstallmentRedemption.tsx
acceptance_criteria:
  happy_path:
    - Tất toán sớm trả góp: Khách đóng toàn bộ gốc còn lại, các kỳ chưa đóng chuyển sang Trạng thái Đóng.
```

```yaml
id: BR-INSTALLMENT-006
module: Installment
priority: High
actor:
  - Staff
  - Manager
precondition:
  - Existing active installment contract for customer
trigger:
  - Action: Renew/Rollover Contract (Đảo nợ)
    UI_Page: /installment/:id/renew
validation:
  - new_loan_amount > remaining_debt_old_contract
action:
  - Step 1: Calculate outstanding balance of old contract (total_expected - total_paid)
  - Step 2: Trigger early redemption API for old contract with payment_amount = outstanding balance (Cashless clearance)
  - Step 3: Trigger create contract API for new contract with actual_disbursed = new_loan_amount - outstanding balance
postcondition:
  - Old contract state = 'closed'
  - New contract state = 'active'
  - Cash fund decreases by net disbursement difference
database:
  - installment_contracts
  - daily_cash
api:
  - POST /api/v1/installment/contracts/:id/renew
permission:
  - CONTRACTS_OPERATE
ui:
  Component: /frontend/src/pages/InstallmentRenew.tsx
acceptance_criteria:
  happy_path:
    - Khách đảo nợ cũ còn dư 3M sang hợp đồng mới 15M: Hợp đồng cũ tất toán tự động, hợp đồng mới giải ngân thực giao khách 12M. Két giảm 12M.
```

---

# [File 6] CAPITAL.md - Hợp đồng Góp vốn Đầu tư

```yaml
id: BR-CAPITAL-001
module: Capital
priority: High
actor:
  - Staff
  - Manager
precondition:
  - Capital contract is validated and approved
trigger:
  - Action: Approve Capital Contract
    UI_Page: /capital/:id/approve
validation:
  - amount > 0
  - store_id exists
action:
  - Set contract status = 'active'
  - Increase daily_cash.current_cash of store_id by amount
  - Log cash history with category 'capital_disbursement'
postcondition:
  - Capital contract active, branch cash fund increased instantly
database:
  - capital_contracts
  - daily_cash
  - cash_fund_history
api:
  - POST /api/v1/capital/contracts/:id/approve
permission:
  - FUNDS_MANAGE
ui:
  Component: /frontend/src/pages/CapitalApprove.tsx
acceptance_criteria:
  happy_path:
    - Góp vốn 500M vào chi nhánh A: Quỹ tiền mặt của chi nhánh A tăng thêm đúng 500M.
```

```yaml
id: BR-CAPITAL-002
module: Capital
priority: High
actor:
  - Staff
  - Manager
precondition:
  - Capital contract state == 'active'
trigger:
  - Action: Pay Investor Interest (Chi trả lãi góp vốn)
    UI_Page: /capital/:id/interest-payout
validation:
  - interest_amount > 0
  - current_cash of branch >= interest_amount
action:
  - Create transaction in capital_transactions with type = 'interest'
  - Decrease daily_cash.current_cash by interest_amount
  - Log cash history with category 'capital_interest_pay'
postcondition:
  - Investor interest paid, branch cash fund decreased
database:
  - capital_contracts
  - capital_transactions
  - daily_cash
  - cash_fund_history
api:
  - POST /api/v1/capital/contracts/:id/pay-interest
permission:
  - FUNDS_MANAGE
ui:
  Component: /frontend/src/pages/CapitalInterestPayout.tsx
acceptance_criteria:
  happy_path:
    - Chi trả lãi đầu tư 5M: Quỹ két giảm 5M, ghi nhận lịch sử chi trả lãi vốn.
```

```yaml
id: BR-CAPITAL-003
module: Capital
priority: High
actor:
  - Staff
  - Manager
precondition:
  - Capital contract state == 'active'
trigger:
  - Action: Principal Adjustment (Tăng / Rút vốn gốc)
    UI_Page: /capital/:id/principal-transaction
validation:
  - transaction_type in ['add_principal', 'withdraw_principal']
  - if 'withdraw_principal': amount <= current_principal_amount and amount <= store_current_cash
action:
  - Create transaction in capital_transactions with type = transaction_type
  - Update capital_contracts.principal_amount
  - Adjust daily_cash.current_cash (Increase on add_principal, Decrease on withdraw_principal)
postcondition:
  - Capital principal adjusted, cash fund synchronized
database:
  - capital_contracts
  - capital_transactions
  - daily_cash
api:
  - POST /api/v1/capital/contracts/:id/principal-transaction
permission:
  - FUNDS_MANAGE
ui:
  Component: /frontend/src/pages/CapitalPrincipalAdjustment.tsx
acceptance_criteria:
  happy_path:
    - Nhà đầu tư rút bớt 100M gốc: Quỹ két giảm 100M, gốc góp vốn giảm còn 400M.
```

```yaml
id: BR-CAPITAL-004
module: Capital
priority: High
actor:
  - Manager
  - Admin
precondition:
  - Capital contract exists
trigger:
  - Action: Close or Cancel Capital Contract
    UI_Page: /capital/:id/close
validation:
  - action_type in ['withdraw_all', 'cancel']
action:
  - if 'withdraw_all':
      - Set contract status = 'withdrawn_all'
      - Decrease daily_cash.current_cash by remaining_principal
  - if 'cancel':
      - Calculate net_cash_flow = total_cash_received - total_cash_disbursed
      - Adjust daily_cash.current_cash = current_cash - net_cash_flow
      - Set status = 'cancelled' or soft-delete
postcondition:
  - Contract terminated, branch cash fund reconciled
database:
  - capital_contracts
  - daily_cash
api:
  - POST /api/v1/capital/contracts/:id/close
permission:
  - FUNDS_MANAGE
ui:
  Component: /frontend/src/pages/CapitalClose.tsx
acceptance_criteria:
  happy_path:
    - Tất toán rút toàn bộ gốc đầu tư: Hợp đồng chuyển trạng thái đóng, chi trả nốt phần gốc còn lại từ két.
```

---

# [File 7] FINANCE.md - Quản lý Thu chi & Quỹ

```yaml
id: BR-FINANCE-001
module: Finance
priority: High
actor:
  - Staff
  - Manager
precondition:
  - Creating new Receipt or Payment voucher
trigger:
  - Action: Save Voucher
    UI_Page: /finance/vouchers/create
validation:
  - type in ['receipt', 'payment']
action:
  - If type == 'receipt': prefix = 'PT'
  - If type == 'payment': prefix = 'PC'
  - Auto-generate voucher_code = prefix + pad_zero(next_val, 6) (Unique system-wide)
postcondition:
  - Voucher created with unique alphanumeric code
database:
  - financial_vouchers
api:
  - POST /api/v1/finance/vouchers
permission:
  - FUNDS_MANAGE
ui:
  Component: /frontend/src/pages/VoucherCreate.tsx
acceptance_criteria:
  happy_path:
    - Lập phiếu thu sinh mã PT000001, phiếu chi sinh mã PC000001.
```

```yaml
id: BR-FINANCE-002
module: Finance
priority: Critical
actor:
  - Staff
  - Manager
precondition:
  - Actioning on active voucher
trigger:
  - Action: Create or Void Voucher
    UI_Page: /finance/vouchers
validation:
  - voucher_status in ['active', 'voided']
action:
  - If 'Create Receipt (PT)': Increase daily_cash.current_cash by amount
  - If 'Void Receipt (PT)': Decrease daily_cash.current_cash by amount
  - If 'Create Payment (PC)': Decrease daily_cash.current_cash by amount
  - If 'Void Payment (PC)': Increase daily_cash.current_cash by amount
postcondition:
  - Current day branch cash fund modified instantly, history logged
database:
  - financial_vouchers
  - daily_cash
  - cash_fund_history
api:
  - POST /api/v1/finance/vouchers
  - POST /api/v1/finance/vouchers/:id/void
permission:
  - FUNDS_MANAGE
ui:
  Component: /frontend/src/pages/VouchersList.tsx
acceptance_criteria:
  happy_path:
    - Hủy phiếu chi hoạt động 2M: Quỹ két tự động cộng hoàn lại 2M để cân đối dòng tiền.
```

```yaml
id: BR-FINANCE-003
module: Finance
priority: Critical
actor:
  - System
precondition:
  - First transaction of the day or dashboard access
trigger:
  - Action: Initialize Daily Cash
validation:
  - not_exists(daily_cash WHERE business_date == current_date AND store_id == current_store)
action:
  - Find last closed daily_cash record for store_id
  - If found: set beginning_cash and current_cash = last_closed_record.physical_cash
  - If not found: set beginning_cash and current_cash = store.investment_capital
  - Create new daily_cash record for current_date
postcondition:
  - Daily cash fund initialized for the new business day
database:
  - daily_cash
  - stores
api:
  - GET /api/v1/cash/status
permission:
  - FUNDS_MANAGE
ui:
  Component: /frontend/src/pages/CashFund.tsx
acceptance_criteria:
  happy_path:
    - Sáng ngày mới truy cập: Hệ thống kế thừa chính xác số dư chốt quỹ tối qua làm số dư đầu ngày hôm nay.
```

```yaml
id: BR-FINANCE-004
module: Finance
priority: High
actor:
  - Manager
precondition:
  - Manual cash input/withdrawal required
trigger:
  - Action: Execute Manual Adjustment
    UI_Page: /finance/cash/adjust
validation:
  - adjustment_type in ['deposit', 'withdraw']
  - if 'withdraw': amount <= current_cash
action:
  - Adjust daily_cash.current_cash (Increase if deposit, Decrease if withdraw)
  - Create record in cash_fund_history with transaction_type = 'manual_adjustment'
postcondition:
  - Cash fund adjusted, audit trail logged
database:
  - daily_cash
  - cash_fund_history
api:
  - POST /api/v1/cash/adjust
permission:
  - FUNDS_MANAGE
ui:
  Component: /frontend/src/pages/CashAdjustmentModal.tsx
acceptance_criteria:
  happy_path:
    - Rút két nộp ngân hàng 20M: Két giảm 20M, lưu nhật ký "manual_adjustment" kèm ghi chú.
```

```yaml
id: BR-FINANCE-005
module: Finance
priority: Critical
actor:
  - Manager
precondition:
  - All shift handovers completed for the day
trigger:
  - Action: Click "Chốt Quỹ Cuối Ngày"
    UI_Page: /finance/cash-fund
validation:
  - physical_cash >= 0
action:
  - Set daily_cash.is_locked = true, locked_at = current_timestamp, locked_by = session.user_id
  - Set daily_cash.physical_cash = physical_cash
  - Calculate variance = physical_cash - system_cash
  - If variance != 0:
      - Auto-create CashVarianceVoucher (PT-LECH-THUA if > 0, PC-LECH-THIEU if < 0)
  - Clone remaining physical_cash to beginning_cash of next day record
postcondition:
  - Current day cash record is locked (Read-only)
  - No new transactions allowed under current business_date
database:
  - daily_cash
  - financial_vouchers
api:
  - POST /api/v1/cash/balance
permission:
  - FUNDS_MANAGE
ui:
  Component: /frontend/src/pages/CashClosing.tsx
acceptance_criteria:
  happy_path:
    - Chốt quỹ thành công, két chuyển trạng thái Locked. Cố tình sửa phiếu thu ngày cũ sẽ bị API chặn đứng.
```

---

# [File 8] EMPLOYEE.md - Nhân viên & Bảo mật 2FA

```yaml
id: BR-EMPLOYEE-001
module: Employee
priority: High
actor:
  - Admin
precondition:
  - Creating new employee record
trigger:
  - Action: Save Employee
    UI_Page: /employees/create
validation:
  - store_id != null and store_id exists in stores table
action:
  - Link employee profile to designated store_id
postcondition:
  - Employee is bound to the store, data access is scoped accordingly
database:
  - employees
api:
  - POST /api/v1/employees
permission:
  - EMPLOYEES_MANAGE
ui:
  Component: /frontend/src/pages/EmployeeForm.tsx
acceptance_criteria:
  happy_path:
    - Bắt buộc phải chọn cửa hàng trực thuộc khi thêm nhân viên mới.
```

```yaml
id: BR-EMPLOYEE-002
module: Employee
priority: High
actor:
  - Admin
precondition:
  - Saving employee login credentials
trigger:
  - Action: Submit username
    UI_Page: /employees/create
validation:
  - unique_check(employees.username, input_username) == true
action:
  - Create login account with unique username
postcondition:
  - Database unique constraint enforced
database:
  - employees
api:
  - POST /api/v1/employees
  - POST /api/v1/auth/register
permission:
  - EMPLOYEES_MANAGE
ui:
  Component: /frontend/src/pages/EmployeeForm.tsx
acceptance_criteria:
  happy_path:
    - Trùng tên đăng nhập trả về HTTP 400 Bad Request: "Username already exists."
```

```yaml
id: BR-EMPLOYEE-003
module: Employee
priority: High
actor:
  - Staff
  - Manager
  - Admin
precondition:
  - User is logged in
trigger:
  - Action: Enable Two-Factor Authentication (2FA)
    UI_Page: /profile/security
validation:
  - verification_otp is valid against generated secret
action:
  - Update employees.two_factor_secret = generated_secret
  - Set employees.two_factor_enabled = true
postcondition:
  - Future login attempts for this user will require TOTP verification step
database:
  - employees
api:
  - POST /api/v1/profile/2fa/enable
  - POST /api/v1/profile/2fa/verify
permission:
  - ACCESS_SYSTEM
ui:
  Component: /frontend/src/components/modals/TwoFactorModal.tsx
acceptance_criteria:
  happy_path:
    - Kích hoạt 2FA: Quét mã QR bằng Google Authenticator, nhập đúng mã OTP 6 số để kích hoạt thành công.
```

```yaml
id: BR-EMPLOYEE-004
module: Employee
priority: High
actor:
  - System
precondition:
  - User authentication request
trigger:
  - Action: Login or Validate Token
    UI_Page: /login
validation:
  - employee_account.status == 'active'
action:
  - If status != 'active': Block authentication, revoke active tokens, return HTTP 401 Unauthorized
postcondition:
  - Suspended / inactive accounts cannot access any system endpoint
database:
  - employees
api:
  - POST /api/v1/auth/login
permission:
  - PUBLIC
ui:
  Component: /frontend/src/pages/Login.tsx
acceptance_criteria:
  happy_path:
    - Khóa tài khoản nhân viên (status = 'inactive'): Tài khoản lập tức bị đá ra khỏi hệ thống và không thể đăng nhập lại.
```

---

# [File 9] PERMISSION.md - Phân quyền & Kiểm soát API

```yaml
id: BR-PERMISSION-001
module: Permission
priority: Critical
actor:
  - System
precondition:
  - User is authenticated and calling protected endpoint
trigger:
  - Action: Evaluate API access
validation:
  - session.permissions contains required_route_permission
action:
  - If match: Allow request execution
  - If mismatch: Terminate request, return HTTP 403 Forbidden
postcondition:
  - System protected by dynamic granular permission check on every request
database:
  - employees
  - employee_permissions
api:
  - All protected routes
permission:
  - ACCESS_SYSTEM
ui:
  Component: /frontend/src/routes/ProtectedRoute.tsx
acceptance_criteria:
  happy_path:
    - Nhân viên không có quyền FUNDS_MANAGE cố tình gọi API chốt quỹ sẽ bị hệ thống trả về lỗi 403 Forbidden.
```

```yaml
id: BR-PERMISSION-002
module: Permission
priority: Critical
actor:
  - System
precondition:
  - API request initiated
trigger:
  - Action: Run requirePermission Middleware
validation:
  - req.headers.authorization contains valid JWT token
  - payload.permissions array has required permission string
action:
  - Proceed to route handler if validated
postcondition:
  - API security sandbox enforced
database:
  - employees
api:
  - All API router files
permission:
  - PUBLIC
ui:
  Component: /backend/src/middleware/permission.ts
acceptance_criteria:
  happy_path:
    - Toàn bộ API nghiệp vụ bắt buộc phải bọc qua middleware kiểm soát quyền hạn.
```

```yaml
id: BR-PERMISSION-003
module: Permission
priority: High
actor:
  - System
precondition:
  - Database query executed on scoped tables
trigger:
  - Action: Inject Branch Filter
validation:
  - session.user.role != 'ADMIN'
action:
  - Append SQL check: `WHERE store_id = session.user.store_id` to query object
postcondition:
  - Data isolation strictly preserved on query level
database:
  - pawn_contracts
  - unsecured_contracts
  - installment_contracts
  - financial_vouchers
  - daily_cash
api:
  - All read-only database endpoints
permission:
  - ACCESS_SYSTEM
ui:
  Component: /backend/src/middleware/storeScope.ts
acceptance_criteria:
  happy_path:
    - Nhân viên chi nhánh A không bao giờ thấy hoặc xuất được danh sách báo cáo dòng tiền của chi nhánh B.
```

---

# [File 10] REPORT.md - Báo cáo & Bàn giao ca

```yaml
id: BR-REPORT-001
module: Report
priority: High
actor:
  - Staff
  - Manager
  - Admin
precondition:
  - Accessing Branch Profit & Loss report
trigger:
  - Action: Load Net Profit Report
    UI_Page: /reports/profit
validation:
  - start_date != null and end_date != null
action:
  - Calculate net_profit = total_interest_received + total_redemption_fees - total_active_payments_vouchers
postcondition:
  - Revenue metrics generated and displayed accurately
database:
  - pawn_interest_payments
  - unsecured_debt_history
  - installment_payments
  - financial_vouchers
api:
  - GET /api/v1/reports/profit
permission:
  - REPORTS_VIEW
ui:
  Component: /frontend/src/pages/ProfitReport.tsx
acceptance_criteria:
  happy_path:
    - Tính đúng Công thức lợi nhuận ròng = (Tổng thu lãi thực tế + Phí tất toán khác) - (Tổng phiếu chi hoạt động).
```

```yaml
id: BR-REPORT-002
module: Report
priority: High
actor:
  - Staff
  - Manager
precondition:
  - Accessing Waiting Liquidation Report
trigger:
  - Action: Filter report
    UI_Page: /reports/waiting-liquidation
validation:
  - query.category == 'waiting-liquidation'
action:
  - Fetch pawn_contracts WHERE status == 'active'
  - Match contracts with overdue_days > commodity.liquidation_after_days
postcondition:
  - Accurate inventory of assets eligible for liquidation returned
database:
  - pawn_contracts
  - pawn_interest_payments
  - commodities
api:
  - GET /api/v1/reports/contracts
permission:
  - REPORTS_VIEW
ui:
  Component: /frontend/src/pages/WaitingLiquidationReport.tsx
acceptance_criteria:
  happy_path:
    - Hiển thị danh sách tài sản cầm cố quá hạn chuẩn bị được thanh lý theo đúng cấu hình của từng loại hàng hóa.
```

```yaml
id: BR-REPORT-003
module: Report
priority: High
actor:
  - Staff
  - Manager
precondition:
  - End of shift reached
trigger:
  - Action: Generate Shift Handover Report
    UI_Page: /reports/shift-handover
validation:
  - shift_id != null
action:
  - Calculate start_cash = shift.beginning_cash
  - Calculate total_received = sum(receipt_vouchers in shift) + sum(payments_collected in shift)
  - Calculate total_disbursed = sum(payment_vouchers in shift) + sum(loans_disbursed in shift)
  - Calculate expected_end_cash = start_cash + total_received - total_disbursed
postcondition:
  - Shift summary report created with theoretical cash calculation
database:
  - daily_cash
  - financial_vouchers
  - pawn_contracts
  - unsecured_contracts
  - installment_contracts
api:
  - GET /api/v1/reports/shift-handover/:id
permission:
  - REPORTS_VIEW
ui:
  Component: /frontend/src/pages/ShiftHandover.tsx
acceptance_criteria:
  happy_path:
    - Bàn giao ca: Tổng hợp toàn bộ dòng tiền thu chi thực tế phát sinh trong ca trực của nhân viên để đối chiếu két.
```

```yaml
id: BR-REPORT-004
module: Report
priority: High
actor:
  - Admin
precondition:
  - Contracts have been voided/deleted
trigger:
  - Action: Load Deleted Contracts Report
    UI_Page: /reports/deleted-contracts
validation:
  - request_user.role == 'ADMIN'
action:
  - Fetch audit records where status == 'voided' (Using Soft-delete logs)
postcondition:
  - Comprehensive list of voided contracts, authors, and reasons generated
database:
  - pawn_contracts (Soft-deleted records or contract_audit_logs)
api:
  - GET /api/v1/reports/deleted-contracts
permission:
  - REPORTS_VIEW
ui:
  Component: /frontend/src/pages/DeletedContractsReport.tsx
acceptance_criteria:
  happy_path:
    - Hiển thị đầy đủ danh sách hợp đồng đã bị hủy/xóa mềm kèm lý do hủy để kiểm toán dòng tiền, chống gian lận nội bộ.
```
