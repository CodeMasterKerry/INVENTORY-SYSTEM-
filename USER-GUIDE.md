# E-SIMS User Guide

This guide explains the day-to-day workflows in the Smart Inventory Management System (E-SIMS). The pages and actions available depend on whether you sign in as a **Manager** or a **Sales Officer**.

## 1. Sign in and navigate

1. Open the E-SIMS sign-in page and enter the email address and password provided for your account.
2. Select **Sign In**. The system opens the dashboard for your role.
3. Use the navigation menu to open the feature you need. Use **Logout** when you finish on a shared device.

If you cannot sign in, ask your manager to confirm that your account is active and that you are using the correct credentials. Managers can deactivate or reactivate sales officer accounts in **Settings**.

## 2. Sales Officer workflow

### Start of shift: review products

1. Open **Products** to see products available to you.
2. Use search, category, or stock filters to find a product.
3. If an approved product needs a correction, use its edit/request action and submit the proposed details. The current product remains unchanged while the request awaits manager review.
4. A product can have only one pending update request at a time. The product list shows when an update is already pending.
5. To request a product that does not exist, use **Request product** and submit its details. A manager must approve it before it can be sold.

### Record a sale

1. Open **My Sales** and choose **Create Sale**.
2. Search or browse the available approved products and add them to the cart.
3. Set quantities without exceeding the available stock.
4. Select a payment method. Add a discount, if applicable, and optional notes.
5. Review the subtotal, discount, VAT, and total, then submit the sale.
6. Open **Sales History** to find the invoice and follow its status:
   - **Approved:** the sale is complete and stock has been deducted.
   - **Pending:** manager review is required. Do not treat it as completed income.
   - **Rejected:** read the manager's rejection reason and follow up before resubmitting.

Sales above **50,000 ETB including VAT** require manager approval. Smaller sales are approved automatically when submitted, provided the sale is valid and stock is available.

### Review your dashboard and reports

- **My Dashboard** summarizes your sales activity.
- **Reports** can display sales and inventory information for the selected date period. Use the report type and date controls, then use the available download or print options.

### Manage your account

Open **My Profile** to update your name or email, change your password, set notification preferences, or upload/remove a profile picture. The picture editor lets you choose a circle or rectangle, zoom, and drag the image into position before saving.

## 3. Manager workflow

### Daily review: approvals

Open **Approvals** and use the tabs to switch between **Pending Sales** and **Product Requests**.

#### Pending sales

1. Filter the list by date or search for an invoice/officer.
2. Review the sale details and check that stock is sufficient.
3. Approve a valid sale or reject it with a clear reason. Approval records the income and deducts stock; rejection does neither.

#### Product requests

The page has separate tables for:

- **New product requests:** review the submitted product information and approve or reject the request.
- **Product update requests:** compare the current product details with the officer's proposed changes, then approve or reject with a reason.

Approved product updates are applied to the product. Rejected requests leave the current product unchanged.

### Maintain inventory

Open **Inventory** to access the product list, categories, stock movements, and low-stock view.

- Use **Add Product** to add a product directly as a manager.
- Use **Edit** to update product details directly. Stock quantity is changed separately through **Restock**, which records the change.
- Review **Low Stock** and **Stock Movements** to identify products that need attention and see recorded stock changes.
- New products submitted by officers remain unavailable for sales until approved.

### Review sales

Open **Sales** to view the sales list and use its tabs to inspect pending, approved, and rejected sales. Search and date filters help narrow the list.

### Understand finances and record expenses

Open **Analysis** to review the selected period's income, expenses, net income, VAT, gross profit, and sales status summaries.

1. Set a date preset or choose **Custom**. On Analysis, **Compare with the previous period** can compare the selected range with the preceding range.
2. Income is created from approved sales. Pending and rejected sales are not counted as income.
3. Select **Record expense** to enter a business expense's category, description, amount, and date.
4. Use the expense row actions to edit or delete an expense. Expenses are entered manually; they are not imported automatically.
5. Net income is calculated as recorded income minus recorded expenses. VAT is shown separately.

### Create reports

Open **Reports**, select a report type, and apply a date range when relevant. Available manager reports cover sales, financial income, inventory, and stock movements. CSV export and browser print/save-as-PDF use the available browser tools; server-generated PDF/Excel files and report approval signatures are not available.

### Manage staff and business settings

Open **Settings** to update your own account, password, notifications, and profile picture, and to manage sales officer access.

- Use **Add sales officer** to create an officer account. Provide the initial credentials to the officer securely.
- Use the rename action to update an officer's name.
- Activate or deactivate an officer account as needed. Deactivated users cannot sign in.
- Business settings control configured values such as the business tax rate and default low-stock threshold.

## 4. Filters, statuses, and common guidance

- Date filters are available on relevant sales, approvals, finance, reports, and stock-movement pages. **Custom** lets you select start and end dates.
- **All time** has no previous period, so comparison is unavailable for that selection.
- A blank table means no records match the selected date/search/filter settings, or there are no records yet. Try **All time**, clear the search, or choose another date range.
- Refresh a page after another user changes data if the latest values are not visible.
- Product and sale approvals affect live inventory and financial totals. Review the request or transaction before approving.
- Do not share passwords in chat or store account credentials in this guide.
