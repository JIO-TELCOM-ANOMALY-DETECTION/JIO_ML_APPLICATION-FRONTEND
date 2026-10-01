import { useState } from 'react';
import { Button, Stack, Typography } from '@mui/material';
export function Identifier({ label, value }: { label: string; value: string }) {
  const [copied,setCopied]=useState(false);
  async function copy(){try{await navigator.clipboard.writeText(value);setCopied(true);}catch{setCopied(false);}}
  return <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap"><Typography sx={{overflowWrap:'anywhere',minWidth:0}}><strong>{label}:</strong> <Typography component="code" sx={{fontFamily:'monospace',overflowWrap:'anywhere'}}>{value}</Typography></Typography><Button size="small" aria-label={`Copy ${label}`} onClick={()=>void copy()}>{copied?'Copied':'Copy'}</Button></Stack>;
}
