/**
 * Studio Service Catalog — intake module public API.
 * Form schemas for Route Map jobs and V2 RTU shelf SKUs.
 */

export type {
  RouteMapIntakeAnswers,
  RouteMapIntakeField,
  RouteMapIntakeSchema,
  RouteMapIntakeSchemaOptions,
} from "@/catalog/intake/schemas";

export {
  getRouteMapIntakeSchema,
  ROUTE_MAP_INTAKE_SCHEMAS,
} from "@/catalog/intake/schemas";
