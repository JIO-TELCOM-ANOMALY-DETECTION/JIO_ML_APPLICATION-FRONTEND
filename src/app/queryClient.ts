import {QueryClient} from '@tanstack/react-query';
export const queryClient=new QueryClient({defaultOptions:{queries:{retry:1,refetchInterval:30000,refetchIntervalInBackground:false}}});
