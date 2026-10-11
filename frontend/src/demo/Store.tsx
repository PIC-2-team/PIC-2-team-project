import { useState, type ReactNode } from 'react';
import { createDemo, readDemo, transition, type Action, type Demo } from './model';
const KEY = 'samgyeol-demo-v1';
import { Context } from './context';
export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(() => {
    try {
      return readDemo(localStorage.getItem(KEY));
    } catch {
      return createDemo();
    }
  });
  const [error, setError] = useState('');
  const save = (next: Demo) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      setState(next);
      setError('');
      return true;
    } catch {
      setError(
        '브라우저 저장 공간을 사용할 수 없어요. 변경 사항은 저장되지 않았습니다. 저장 권한을 확인해주세요.',
      );
      return false;
    }
  };
  const send = (action: Action) => {
    try {
      return save(transition(state, action));
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : '처리하지 못했어요. 다시 시도해주세요.',
      );
      return false;
    }
  };
  return (
    <Context
      value={{
        state,
        send,
        reset: () => save(createDemo()),
        error,
        clearError: () => setError(''),
      }}
    >
      {children}
    </Context>
  );
}
