import type {PropsWithChildren} from 'react';import {Container} from '@mui/material';
export function PageContainer({children}:{children:PropsWithChildren['children']}){return <Container maxWidth="xl" disableGutters sx={{px:{xs:0,sm:1}}}>{children}</Container>;}
