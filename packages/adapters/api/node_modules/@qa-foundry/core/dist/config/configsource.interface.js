/**
 * Finite list of supported configuration source types.
 * New backends must be added here as enum values.
 */
export var ConfigSourceType;
(function (ConfigSourceType) {
    ConfigSourceType["ENV"] = "ENV";
    ConfigSourceType["AZURE_APP_CONFIG"] = "AZURE_APP_CONFIG";
})(ConfigSourceType || (ConfigSourceType = {}));
//# sourceMappingURL=configsource.interface.js.map