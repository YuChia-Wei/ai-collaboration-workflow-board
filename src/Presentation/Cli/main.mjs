#!/usr/bin/env node
import {runCli} from './run.mjs';
import {createRemoteCollaborationClient} from './collaboration-client.mjs';

// This executable owns its composition; other entry points select their own dependencies.
process.exitCode=await runCli({argv:process.argv.slice(2),env:process.env,stdout:process.stdout,stderr:process.stderr,createClient:createRemoteCollaborationClient});
