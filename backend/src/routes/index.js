const express = require("express");
const { authenticate, requireRole } = require("../middleware/auth");

const auth = require("../controllers/auth.controller");
const users = require("../controllers/users.controller");
const categories = require("../controllers/categories.controller");
const products = require("../controllers/products.controller");
const sales = require("../controllers/sales.controller");
const dashboard = require("../controllers/dashboard.controller");
const account = require("../controllers/account.controller");
const settings = require("../controllers/settings.controller");
const finance = require("../controllers/finance.controller");
const productUpdates = require("../controllers/product-update-requests.controller");

const router = express.Router();
const manager = requireRole("MANAGER");
const officer = requireRole("SALES_OFFICER");

// Auth
router.post("/auth/login", auth.login);
router.get("/auth/me", authenticate, auth.me);

// Current account
router.get("/account/profile", authenticate, account.getProfile);
router.patch("/account/profile", authenticate, account.updateProfile);
router.patch("/account/password", authenticate, account.changePassword);
router.get("/account/notifications", authenticate, account.getNotificationPreferences);
router.patch("/account/notifications", authenticate, account.updateNotificationPreferences);

// Business settings
router.get("/settings/business", authenticate, settings.getBusinessSettings);
router.patch("/settings/business", authenticate, manager, settings.updateBusinessSettings);

// Users (manager only)
router.get("/users", authenticate, manager, users.listUsers);
router.post("/users", authenticate, manager, users.createUser);
router.patch("/users/:id", authenticate, manager, users.updateUser);

// Categories
router.get("/categories", authenticate, categories.listCategories);
router.post("/categories", authenticate, manager, categories.createCategory);

// Products
router.get("/products", authenticate, products.listProducts);
router.get("/products/low-stock", authenticate, manager, products.lowStock);
router.get("/products/history", authenticate, manager, products.stockHistory);
router.post("/products", authenticate, products.createProduct);
router.patch("/products/:id", authenticate, manager, products.updateProduct);
router.patch("/products/:id/approve", authenticate, manager, products.approveProduct);
router.patch("/products/:id/reject", authenticate, manager, products.rejectProduct);
router.post("/products/:id/restock", authenticate, manager, products.restockProduct);
router.get("/product-update-requests", authenticate, manager, productUpdates.listPending);
router.get("/product-update-requests/mine", authenticate, officer, productUpdates.listMine);
router.post("/products/:id/update-requests", authenticate, officer, productUpdates.create);
router.patch("/product-update-requests/:id/approve", authenticate, manager, productUpdates.approve);
router.patch("/product-update-requests/:id/reject", authenticate, manager, productUpdates.reject);

// Sales
router.post("/sales", authenticate, sales.createSale);
router.get("/sales", authenticate, sales.listSales);
router.get("/sales/:id", authenticate, sales.getSale);
router.patch("/sales/:id/approve", authenticate, manager, sales.approveSale);
router.patch("/sales/:id/reject", authenticate, manager, sales.rejectSale);

// Finance (manager only)
router.get("/finance/income", authenticate, manager, finance.listIncome);
router.get("/finance/expenses", authenticate, manager, finance.listExpenses);
router.post("/finance/expenses", authenticate, manager, finance.createExpense);
router.put("/finance/expenses/:id", authenticate, manager, finance.updateExpense);
router.delete("/finance/expenses/:id", authenticate, manager, finance.deleteExpense);

// Dashboards
router.get("/dashboard/manager", authenticate, manager, dashboard.managerDashboard);
router.get("/dashboard/officer", authenticate, officer, dashboard.officerDashboard);

module.exports = router;