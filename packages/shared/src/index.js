"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttachmentType = exports.ExpenseStatus = exports.Role = void 0;
var Role;
(function (Role) {
    Role["HOLDCO_ADMIN"] = "HOLDCO_ADMIN";
    Role["OPCO_ADMIN"] = "OPCO_ADMIN";
    Role["OPCO_MANAGER"] = "OPCO_MANAGER";
    Role["OPCO_USER"] = "OPCO_USER";
})(Role || (exports.Role = Role = {}));
var ExpenseStatus;
(function (ExpenseStatus) {
    ExpenseStatus["DRAFT"] = "DRAFT";
    ExpenseStatus["SUBMITTED"] = "SUBMITTED";
    ExpenseStatus["APPROVED"] = "APPROVED";
    ExpenseStatus["REJECTED"] = "REJECTED";
})(ExpenseStatus || (exports.ExpenseStatus = ExpenseStatus = {}));
var AttachmentType;
(function (AttachmentType) {
    AttachmentType["RECEIPT"] = "RECEIPT";
    AttachmentType["INVOICE"] = "INVOICE";
})(AttachmentType || (exports.AttachmentType = AttachmentType = {}));
