import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import {App} from './App';
import {queryClient} from './app/queryClient';
import {StatusBadge} from './components/common/StatusBadge';
beforeEach(()=>{queryClient.clear();localStorage.clear();window.history.pushState({},'', '/');vi.stubGlobal('fetch',vi.fn().mockImplementation(()=>new Promise(()=>{})));});
describe('Level 0 application',()=>{
it('renders shell navigation and checking health state',()=>{render(<App/>);expect(screen.getByText('Telecom Anomaly Detection')).toBeInTheDocument();expect(screen.getByText('Made by Aditya Pawar')).toBeInTheDocument();expect(screen.queryByText('JIO Telecom Anomaly Detection')).not.toBeInTheDocument();expect(screen.getByRole('img',{name:'Jio logo'})).toHaveAttribute('src','/images/jio-logo.svg');expect(screen.getAllByRole('link',{name:/Guided Training/})[0]).toBeInTheDocument();expect(screen.getAllByText('ML: checking').length).toBeGreaterThan(0);});
it('navigates to Quick Training',async()=>{render(<App/>);fireEvent.click(screen.getAllByRole('link',{name:/Quick Training/})[0]);await waitFor(()=>expect(screen.getByRole('heading',{name:'Quick Training'})).toBeInTheDocument());expect(screen.getByText(/Configure Parts A/)).toBeInTheDocument();});
it('renders healthy, checking, and unavailable health badges',()=>{render(<><StatusBadge state="checking"/><StatusBadge state="healthy"/><StatusBadge state="unavailable"/></>);expect(screen.getByText('checking')).toBeInTheDocument();expect(screen.getByText('healthy')).toBeInTheDocument();expect(screen.getByText('unavailable')).toBeInTheDocument();});
it('toggles and persists theme mode',()=>{render(<App/>);fireEvent.click(screen.getByRole('button',{name:'Toggle color theme'}));expect(localStorage.getItem('jio-color-mode')).toBe('dark');});
it('shows not found for unknown routes',()=>{window.history.pushState({},'', '/missing');render(<App/>);expect(screen.getByText('Page not found')).toBeInTheDocument();});
});

