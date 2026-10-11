import { z } from "zod";
export const stateSchema = z.enum(["enough", "running low", "out"]);
