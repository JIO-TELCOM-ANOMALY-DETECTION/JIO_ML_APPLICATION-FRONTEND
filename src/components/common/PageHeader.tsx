import {Box,Typography} from '@mui/material';
export function PageHeader({title,description}:{title:string;description:string}){return <Box sx={{mb:3}}><Typography variant="h4">{title}</Typography><Typography color="text.secondary" sx={{mt:1}}>{description}</Typography></Box>;}
