import { describe, expect, it } from 'vitest';
import { parseStatusList, STATUS_LABELS } from './featureBuilder';
describe('comma-separated status lists',()=>{
  it.each([['2, 4',[2,4]],[' 2 ,  4 ',[2,4]],['2, 4, 2',[2,4]],['',[]],['  ',[]]])('parses %s', (input,values)=>expect(parseStatusList(input)).toEqual({values}));
  it.each(['2,,4','2.5','[2,4]','two','5','-3'])('rejects malformed or unsupported %s',input=>expect(parseStatusList(input).error).toBeTruthy());
  it('explains every supported status',()=>expect(Object.keys(STATUS_LABELS).map(Number).sort((a,b)=>a-b)).toEqual([-2,-1,0,1,2,3,4]));
});
