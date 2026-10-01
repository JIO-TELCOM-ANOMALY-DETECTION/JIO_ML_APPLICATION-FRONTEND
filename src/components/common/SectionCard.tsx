import type {PropsWithChildren} from 'react';import {Card,CardContent,Typography} from '@mui/material';
export function SectionCard({title,children}:{title:string;children:PropsWithChildren['children']}){return <Card variant="outlined"><CardContent><Typography variant="h6" sx={{mb:1.5}}>{title}</Typography>{children}</CardContent></Card>;}
