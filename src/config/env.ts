const testDefaults=import.meta.env.MODE==='test';
const required=(key:string,value:string|undefined,fallback:string)=>{const result=value?.trim().replace(/\/+$/,'')||(testDefaults?fallback:undefined);if(!result)throw new Error(`Missing required environment variable: ${key}`);return result;};
const workflowTimeoutRaw=import.meta.env.VITE_ML_WORKFLOW_TIMEOUT_MS?.trim();
const workflowTimeout=workflowTimeoutRaw ? Number(workflowTimeoutRaw) : 1800000;
if(!Number.isFinite(workflowTimeout)||workflowTimeout<=0) throw new Error('VITE_ML_WORKFLOW_TIMEOUT_MS must be a positive finite number.');
export const config={mlApiBaseUrl:required('VITE_ML_API_BASE_URL',import.meta.env.VITE_ML_API_BASE_URL,'http://127.0.0.1:8000'),reportingApiBaseUrl:required('VITE_REPORTING_API_BASE_URL',import.meta.env.VITE_REPORTING_API_BASE_URL,'http://127.0.0.1:8001'),mlWorkflowTimeoutMs:workflowTimeout};
