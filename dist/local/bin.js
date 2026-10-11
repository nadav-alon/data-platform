#!/usr/bin/env node
import { launchLocal } from "./launch.js";
launchLocal(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
