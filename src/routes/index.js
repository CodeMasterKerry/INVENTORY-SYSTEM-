const express = require("express");
const { authenticate, requireRole } = require("../middleware/auth");

const auth = require("../controllers/auth.controller");
const users = require("../controllers/users.controller");
const categories = require("../controllers/categories.controller");
const products = require("../controllers/products.controller");
const sales = require("../controllers/sales.controller");
const dashboard = require("../controllers/dashboard.controller");

const router = express.Router();
const manager = requireRole("MANAGER");

// Auth
router.post("/auth/login", auth.login);
router.get("/auth/me", authenticate, auth.me);

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
router.post("/products/:id/restock", authenticate, manager, products.restockProduct);

// Sales
router.post("/sales", authenticate, sales.createSale);
router.get("/sales", authenticate, sales.listSales);
router.get("/sales/:id", authenticate, sales.getSale);
router.patch("/sales/:id/approve", authenticate, manager, sales.approveSale);
router.patch("/sales/:id/reject", authenticate, manager, sales.rejectSale);

// Dashboards
router.get("/dashboard/manager", authenticate, manager, dashboard.managerDashboard);
router.get("/dashboard/officer", authenticate, dashboard.officerDashboard);

module.exports = router;