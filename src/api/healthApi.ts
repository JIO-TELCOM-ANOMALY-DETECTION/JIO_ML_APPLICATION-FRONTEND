import {mlClient} from './mlClient';import {reportingClient} from './reportingClient';
const reachable=async(client:typeof mlClient):Promise<boolean>=>{await client.get<unknown>('/health');return true;};
export const healthApi={ml:()=>reachable(mlClient),reporting:()=>reachable(reportingClient)};
