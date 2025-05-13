/**
 * @typedef {Object} UnitTypeDefinition
 * @property {string} type - The data type (always "string")
 * @property {string[]} enum - Possible values for unit types
 * @property {string} description - Description of the unit type field
 */

/**
 * @typedef {Object} FieldDefinition
 * @property {string} type - The data type (e.g., "string", "number")
 * @property {string} description - Description of the field
 */

/**
 * @typedef {Object} SubItemDefinition
 * @property {FieldDefinition} description - Description of the sub-item
 * @property {FieldDefinition} quantity - Quantity of units
 * @property {FieldDefinition} unitPrice - Price per unit
 * @property {UnitTypeDefinition} unitType - Type of unit being measured
 * @property {FieldDefinition} amount - Total amount for this sub-item
 */

/**
 * @typedef {Object} LineItemDefinition
 * @property {FieldDefinition} description - Description of the line item
 * @property {FieldDefinition} quantity - Quantity of units
 * @property {FieldDefinition} unitPrice - Price per unit
 * @property {UnitTypeDefinition} unitType - Type of unit being measured
 * @property {FieldDefinition} amount - Total amount for this line item
 * @property {SubItemDefinition[]} subItems - Sub-items within this line item
 */

/**
 * @typedef {Object} EstimateDefinition
 * @property {FieldDefinition} title - Title of the estimate
 * @property {FieldDefinition} totalAmount - Total amount of the estimate
 * @property {FieldDefinition} currency - Currency code
 * @property {LineItemDefinition[]} lineItems - Line items in the estimate
 */

/**
 * @typedef {Object} ResponseStructure
 * @property {EstimateDefinition} estimate - The estimate structure
 */

// Default unit type definition with common measurement units
export const defaultUnitTypeDefinition = {
  type: "string",
  enum: ["unit", "sq-ft", "board-ft", "hour", "day", "package", "linear-ft"],
  description: "Type of unit being measured"
};

// Default cost type definition
export const defaultCostTypeDefinition = {
  type: "string",
  enum: ["material", "labor", "equipment", "subcontractor", "other"],
  description: "Type of cost (material, labor, etc.)"
};

// Create a field definition helper
export const createFieldDefinition = (type, description) => ({
  type,
  description
});

// Default sub-item definition template
export const createDefaultSubItemDefinition = () => ({
  description: createFieldDefinition("string", "Description of the sub-item"),
  quantity: createFieldDefinition("number", "Quantity of units"),
  unitPrice: createFieldDefinition("number", "Price per unit"),
  unitType: { ...defaultUnitTypeDefinition },
  amount: createFieldDefinition("number", "Total amount for this sub-item (quantity × unitPrice)")
});

// Default line item definition template
export const createDefaultLineItemDefinition = () => ({
  description: createFieldDefinition("string", "Description of the line item"),
  quantity: createFieldDefinition("number", "Quantity of units"),
  unitPrice: createFieldDefinition("number", "Price per unit"),
  unitType: { ...defaultUnitTypeDefinition },
  costType: { ...defaultCostTypeDefinition },
  amount: createFieldDefinition("number", "Total amount for this line item (quantity × unitPrice)"),
  subItems: [createDefaultSubItemDefinition()]
});

// Default estimate definition template
export const createDefaultEstimateDefinition = () => ({
  title: createFieldDefinition("string", "Title of the estimate"),
  totalAmount: createFieldDefinition("number", "Total amount of the estimate"),
  currency: createFieldDefinition("string", "Currency code (e.g., USD, EUR, GBP)"),
  lineItems: [createDefaultLineItemDefinition()]
});

// Default response structure template
export const createDefaultResponseStructure = () => ({
  estimate: createDefaultEstimateDefinition()
});

export default {
  createFieldDefinition,
  createDefaultSubItemDefinition,
  createDefaultLineItemDefinition,
  createDefaultEstimateDefinition,
  createDefaultResponseStructure,
  defaultUnitTypeDefinition,
  defaultCostTypeDefinition
};
