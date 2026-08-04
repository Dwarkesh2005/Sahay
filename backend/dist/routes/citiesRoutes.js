"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const citiesController_1 = require("../controllers/citiesController");
const router = (0, express_1.Router)();
router.get('/', citiesController_1.getCities);
exports.default = router;
