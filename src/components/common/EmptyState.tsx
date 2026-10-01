import {Box,Typography} from '@mui/material';
export function EmptyState({title,description}:{title:string;description:string}){return <Box sx={{textAlign:'center',py:5}}><Typography variant="h6">{title}</Typography><Typography color="text.secondary">{description}</Typography></Box>;}
