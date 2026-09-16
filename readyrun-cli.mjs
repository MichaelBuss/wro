import { cli } from "@readyrun/readyrun/cli";

process.exitCode = await cli({ argv: process.argv.slice(2) });
