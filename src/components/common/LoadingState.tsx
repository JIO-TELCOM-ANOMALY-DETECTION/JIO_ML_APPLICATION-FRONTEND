import {CircularProgress,Stack,Typography} from '@mui/material';
export function LoadingState({label='Loading'}:{label?:string}){return <Stack role="status" direction="row" spacing={1} alignItems="center"><CircularProgress size={18}/><Typography>{label}</Typography></Stack>;}
