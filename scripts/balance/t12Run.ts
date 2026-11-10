import { runT12Audit } from './t12';

const audit = runT12Audit();
console.log(JSON.stringify(audit, null, 2));
if (Object.values(audit.gates).some((ok) => !ok)) process.exitCode = 1;
