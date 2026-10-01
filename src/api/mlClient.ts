import {config} from '../config/env';import {HttpClient} from './httpClient';export const mlClient=new HttpClient(config.mlApiBaseUrl);
