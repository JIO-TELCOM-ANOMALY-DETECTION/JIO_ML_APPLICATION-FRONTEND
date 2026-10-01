import {config} from '../config/env';import {HttpClient} from './httpClient';export const reportingClient=new HttpClient(config.reportingApiBaseUrl);
