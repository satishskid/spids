import Ajv, { ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import parentProfileExportSchema from "../schemas/parentProfileExport.schema.json";
import screeningImportSchema from "../schemas/screeningResultImport.schema.json";

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

export const validateParentProfileExport: ValidateFunction = ajv.compile(parentProfileExportSchema);
export const validateScreeningImport: ValidateFunction = ajv.compile(screeningImportSchema);
