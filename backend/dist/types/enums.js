"use strict";
/**
 * Enums for the Vehicle Wash System
 *
 * Since SQLite doesn't support native enums, we define them here as TypeScript enums
 * and use them throughout the application for type safety.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentMethod = exports.PaymentStatus = exports.VehicleStatus = exports.ServiceType = exports.CarCategory = exports.VehicleType = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "ADMIN";
    UserRole["WORKER"] = "WORKER";
    UserRole["CUSTOMER"] = "CUSTOMER";
})(UserRole || (exports.UserRole = UserRole = {}));
var VehicleType;
(function (VehicleType) {
    VehicleType["CAR"] = "CAR";
    VehicleType["TWO_WHEELER"] = "TWO_WHEELER";
})(VehicleType || (exports.VehicleType = VehicleType = {}));
var CarCategory;
(function (CarCategory) {
    CarCategory["SEDAN"] = "SEDAN";
    CarCategory["SUV"] = "SUV";
    CarCategory["HATCHBACK"] = "HATCHBACK";
    CarCategory["HYBRID"] = "HYBRID";
})(CarCategory || (exports.CarCategory = CarCategory = {}));
var ServiceType;
(function (ServiceType) {
    ServiceType["WASH"] = "WASH";
    ServiceType["BODY_REPAIR"] = "BODY_REPAIR";
})(ServiceType || (exports.ServiceType = ServiceType = {}));
var VehicleStatus;
(function (VehicleStatus) {
    VehicleStatus["RECEIVED"] = "RECEIVED";
    VehicleStatus["WASHING"] = "WASHING";
    VehicleStatus["READY_FOR_PICKUP"] = "READY_FOR_PICKUP";
    VehicleStatus["DELIVERED"] = "DELIVERED";
    // Body Repair Statuses
    VehicleStatus["BODY_REPAIR_ASSESSMENT"] = "BODY_REPAIR_ASSESSMENT";
    VehicleStatus["BODY_REPAIR_IN_PROGRESS"] = "BODY_REPAIR_IN_PROGRESS";
    VehicleStatus["BODY_REPAIR_PAINTING"] = "BODY_REPAIR_PAINTING";
    VehicleStatus["BODY_REPAIR_COMPLETE"] = "BODY_REPAIR_COMPLETE";
})(VehicleStatus || (exports.VehicleStatus = VehicleStatus = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["PAID"] = "PAID";
    PaymentStatus["MANUAL_PENDING"] = "MANUAL_PENDING";
    PaymentStatus["REJECTED"] = "REJECTED";
    PaymentStatus["REFUNDED"] = "REFUNDED";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["RAZORPAY"] = "RAZORPAY";
    PaymentMethod["INSTAMOJO"] = "INSTAMOJO";
    PaymentMethod["MANUAL_UPI"] = "MANUAL_UPI";
    PaymentMethod["MANUAL_GPAY"] = "MANUAL_GPAY";
    PaymentMethod["CASH"] = "CASH";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
//# sourceMappingURL=enums.js.map