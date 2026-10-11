import { z } from "zod";
export const necessitySchema = z.enum(["essential", "important", "optional"]);
