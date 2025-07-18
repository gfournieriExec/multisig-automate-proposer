"use strict";
/**
 * Safe Multisig Integration for RLC Multichain Bridge
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafeManager = exports.validateEnvironment = exports.getSafeConfig = exports.getProposerConfig = void 0;
const tslib_1 = require("tslib");
var config_1 = require("./config");
Object.defineProperty(exports, "getProposerConfig", { enumerable: true, get: function () { return config_1.getProposerConfig; } });
Object.defineProperty(exports, "getSafeConfig", { enumerable: true, get: function () { return config_1.getSafeConfig; } });
Object.defineProperty(exports, "validateEnvironment", { enumerable: true, get: function () { return config_1.validateEnvironment; } });
var safe_manager_1 = require("./safe-manager");
Object.defineProperty(exports, "SafeManager", { enumerable: true, get: function () { return safe_manager_1.SafeManager; } });
tslib_1.__exportStar(require("./utils"), exports);
//# sourceMappingURL=index.js.map